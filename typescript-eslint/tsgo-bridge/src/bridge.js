/** tsgo-backed stand-ins for `ts.Program` / `ts.TypeChecker` that typescript-eslint rules can consume. */
import fs from "node:fs";
import path from "node:path";

/** Builds the shim classes over `env` = { ts, API, remaps, collectTiming } so nothing here imports a TypeScript package. */
export function createTsgoProjectClass(env) {
  const { ts, API, remaps } = env;
  const remapNodeFlags = remaps.nodeFlags;
  const remapObjectFlags = remaps.objectFlags;
  const remapSignatureKindToTsgo = remaps.signatureKindToTsgo;
  const remapSymbolFlags = remaps.symbolFlags;
  const remapSyntaxKind = remaps.syntaxKind;
  const remapTypeFlags = remaps.typeFlags;

  const TSGO_NODE = Symbol("tsgoNode");
  /** Strada node property -> tsgo property where the Go port renamed a field. */
  const PROPERTY_ALIASES = {
    default: "defaultType",
    elements: "attributes",
    class: "className",
    jsDocPropertyTags: "jsdocPropertyTags",
  };

  const stats = {
    nodeLookups: 0,
    nodeLookupMisses: 0,
    nodeKindFallbacks: 0,
    kindFallbackKinds: {},
    declarationResolves: 0,
    awaitedTypeCalls: 0,
  };

  /** Wrap a tsgo RemoteNode so it looks like a Strada `ts.Node` (renumbered kind/flags, wrapped children). */
  function wrapNode(node, project) {
    if (node == null) {
      return node;
    }
    if (typeof node !== "object") {
      return node;
    }
    const cache = project.nodeWrappers;
    let wrapped = cache.get(node);
    if (wrapped) {
      return wrapped;
    }
    wrapped = new Proxy(node, {
      get(target, prop) {
        if (prop === TSGO_NODE) {
          return target;
        }
        if (prop === "kind") {
          return remapSyntaxKind(target.kind);
        }
        if (prop === "flags") {
          return remapNodeFlags(target.flags);
        }
        if (prop === "modifierFlagsCache") {
          return;
        }
        if (prop === "escapedText" && typeof target.text === "string") {
          return target.text.startsWith("__") ? `_${target.text}` : target.text;
        }
        const value =
          prop in target
            ? target[prop]
            : target[PROPERTY_ALIASES[prop] ?? prop];
        if (typeof value === "function") {
          return (...args) =>
            wrapValue(value.apply(target, args.map(unwrapArg)), project);
        }
        return wrapValue(value, project);
      },
    });
    cache.set(node, wrapped);
    return wrapped;
  }

  function unwrapArg(value) {
    return value != null && typeof value === "object" && value[TSGO_NODE]
      ? value[TSGO_NODE]
      : value;
  }

  function isRemoteNode(value) {
    return (
      value != null &&
      typeof value === "object" &&
      typeof value.kind === "number" &&
      typeof value.pos === "number" &&
      typeof value.end === "number" &&
      "parent" in value
    );
  }

  function wrapValue(value, project) {
    if (value == null || typeof value !== "object") {
      return value;
    }
    if (Array.isArray(value)) {
      if (value.length && isRemoteNode(value[0])) {
        const arr = value.map((n) => wrapNode(n, project));
        arr.pos = value.pos;
        arr.end = value.end;
        arr.hasTrailingComma = value.hasTrailingComma;
        return arr;
      }
      return value;
    }
    if (isRemoteNode(value)) {
      return wrapNode(value, project);
    }
    return value;
  }

  /**
   * TypeScript <= 6 auto-includes `@types/*` packages when `types` is unset;
   * TypeScript 7 does not. Under rules_javascript the Strada lint saw exactly
   * the current package's direct `@types/*` deps (its virtual node_modules), so
   * read those from the package manifest when the native lint action provides
   * it; otherwise scan `typeRoots` / ancestor `node_modules/@types` on disk.
   */
  function automaticTypes(configDir, typeRoots) {
    const manifestPath = process.env.NODE_FS_PACKAGE_MANIFEST;
    const currentPackage = process.env.STAGE_NM_CURRENT_PKG;
    if (manifestPath && currentPackage) {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const deps = manifest.packages?.[currentPackage]?.deps ?? {};
      return Object.keys(deps)
        .filter((name) => name.startsWith("@types/"))
        .map((name) => name.slice("@types/".length))
        .sort();
    }
    const roots = [];
    if (typeRoots?.length) {
      roots.push(...typeRoots.map((r) => path.resolve(configDir, r)));
    } else {
      for (let dir = configDir; ; dir = path.dirname(dir)) {
        roots.push(path.join(dir, "node_modules", "@types"));
        if (path.dirname(dir) === dir) {
          break;
        }
      }
    }
    const names = new Set();
    for (const root of roots) {
      let entries;
      try {
        entries = fs.readdirSync(root, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (
          entry.name.startsWith(".") ||
          (!entry.isDirectory() && !entry.isSymbolicLink())
        ) {
          continue;
        }
        const dir = path.join(root, entry.name);
        if (
          fs.existsSync(path.join(dir, "package.json")) ||
          fs.existsSync(path.join(dir, "index.d.ts"))
        ) {
          names.add(entry.name);
        }
      }
    }
    return [...names].sort();
  }

  class TsgoProject {
    /** @param {string} tsconfigPath absolute path */
    constructor(
      tsconfigPath,
      { cwd = process.cwd(), collectTiming = false } = {},
    ) {
      this.tsconfigPath = tsconfigPath;
      this.api = new API({
        cwd,
        collectTiming: collectTiming || env.collectTiming,
      });
      this.requestStats = new Map();
      if (
        collectTiming ||
        env.collectTiming ||
        process.env.TSGO_BRIDGE_TIMING === "1"
      ) {
        this.instrumentClient();
      }
      const parsed = this.api.parseConfigFile(tsconfigPath);
      const compilerOptions = { ...parsed.options };
      if (compilerOptions.types === undefined) {
        compilerOptions.types = automaticTypes(
          path.dirname(tsconfigPath),
          compilerOptions.typeRoots,
        );
      }
      if (process.env.NODE_FS_PACKAGE_MANIFEST) {
        // Staged node_modules (see rules_javascript stage-nm): resolve through
        // the staged symlinks like the native compile does, and drop typeRoots
        // that only exist in the fs-linker virtual filesystem.
        compilerOptions.preserveSymlinks = true;
        delete compilerOptions.typeRoots;
      }
      this.program = this.api.createProgram(parsed.fileNames, {
        compilerOptions,
        projectReferences: parsed.projectReferences,
      });
      this.project = this.program.getProject();
      this.checker = this.project.checker;
      this.fileIndex = new Map();
      this.nodeWrappers = new WeakMap();
      this.typeWrappers = new Map();
      this.symbolWrappers = new Map();
      this.signatureWrappers = new Map();
      this.shimChecker = new CheckerShim(this);
      this.shimProgram = new ProgramShim(this);
      this.compilerOptions = compilerOptions;
    }

    close() {
      this.api.close();
    }

    /** Per-method request counts/latency, gathered by wrapping the sync client. */
    instrumentClient() {
      const client = this.api.client;
      const stats = this.requestStats;
      const wrap = (name) => {
        const original = client[name].bind(client);
        client[name] = (method, params) => {
          const t0 = performance.now();
          const result = original(method, params);
          const dt = performance.now() - t0;
          let s = stats.get(method);
          if (!s) {
            stats.set(method, (s = { count: 0, ms: 0, bytes: 0 }));
          }
          s.count++;
          s.ms += dt;
          if (result instanceof Uint8Array) {
            s.bytes += result.byteLength;
          }
          return result;
        };
      };
      wrap("apiRequest");
      wrap("apiRequestBinary");
    }

    requestStatsSummary() {
      return [...this.requestStats.entries()]
        .sort((a, b) => b[1].ms - a[1].ms)
        .map(([method, s]) => ({
          method,
          count: s.count,
          ms: Math.round(s.ms),
          avgUs: Math.round((s.ms * 1000) / s.count),
          mb: s.bytes ? Math.round(s.bytes / 1e5) / 10 : undefined,
        }));
    }

    getTimingInfo() {
      return this.api.getTimingInfo();
    }

    /** Lazily decoded tsgo SourceFile plus (pos,end,kind) and (pos,end) -> node indexes. */
    getFileEntry(fileName) {
      let entry = this.fileIndex.get(fileName);
      if (entry) {
        return entry;
      }
      const sf = this.program.getSourceFile(fileName);
      if (!sf) {
        throw new Error(
          `tsgo: ${fileName} is not part of project ${this.tsconfigPath}`,
        );
      }
      const index = new Map();
      const spanIndex = new Map();
      const visit = (node) => {
        const key = node.pos * 4_294_967_296 + node.end * 1024 + node.kind;
        if (!index.has(key)) {
          index.set(key, node);
        }
        const spanKey = node.pos * 4_294_967_296 + node.end;
        if (!spanIndex.has(spanKey)) {
          spanIndex.set(spanKey, node);
        }
        node.forEachChild(visit);
      };
      visit(sf);
      entry = { sf, index, spanIndex };
      this.fileIndex.set(fileName, entry);
      return entry;
    }

    /** Resolve a Strada node (from typescript-estree) or a wrapped tsgo node to the tsgo node. */
    toTsgoNode(node) {
      if (node == null) {
        return node;
      }
      const raw = node[TSGO_NODE];
      if (raw) {
        return raw;
      }
      stats.nodeLookups++;
      const fileName = node.getSourceFile().fileName;
      const { index, spanIndex, sf } = this.getFileEntry(fileName);
      const tsgoKind = remapSyntaxKind.toTsgo(node.kind);
      if (node.kind === ts.SyntaxKind.SourceFile) {
        return sf;
      }
      const key = node.pos * 4_294_967_296 + node.end * 1024 + tsgoKind;
      const found = index.get(key);
      if (found) {
        return found;
      }
      // tsgo's AST differs in places (e.g. interface heritage is a TypeReference, not
      // ExpressionWithTypeArguments); fall back to the outermost node with the same span.
      const bySpan = spanIndex.get(node.pos * 4_294_967_296 + node.end);
      if (bySpan) {
        stats.nodeKindFallbacks++;
        const k = `${ts.SyntaxKind[node.kind]}->${remapSyntaxKind(bySpan.kind) >= 0 ? ts.SyntaxKind[remapSyntaxKind(bySpan.kind)] : bySpan.kind}`;
        stats.kindFallbackKinds[k] = (stats.kindFallbackKinds[k] ?? 0) + 1;
        return bySpan;
      }
      stats.nodeLookupMisses++;
      throw new Error(
        `tsgo: no node ${ts.SyntaxKind[node.kind]} at [${node.pos},${node.end}) in ${fileName}`,
      );
    }

    wrapNode(node) {
      return wrapNode(node, this);
    }

    wrapType(type) {
      if (type == null) {
        return type;
      }
      let w = this.typeWrappers.get(type.id);
      if (!w) {
        w = new TypeShim(type, this);
        this.typeWrappers.set(type.id, w);
      }
      return w;
    }

    wrapTypes(types) {
      return types == null ? types : types.map((t) => this.wrapType(t));
    }

    wrapSymbol(symbol) {
      if (symbol == null) {
        return symbol;
      }
      let w = this.symbolWrappers.get(symbol.id);
      if (!w) {
        w = new SymbolShim(symbol, this);
        this.symbolWrappers.set(symbol.id, w);
      }
      return w;
    }

    wrapSymbols(symbols) {
      return symbols == null ? symbols : symbols.map((s) => this.wrapSymbol(s));
    }

    wrapSignature(sig) {
      if (sig == null) {
        return sig;
      }
      let w = this.signatureWrappers.get(sig.id);
      if (!w) {
        w = new SignatureShim(sig, this);
        this.signatureWrappers.set(sig.id, w);
      }
      return w;
    }

    wrapSignatures(sigs) {
      return sigs == null ? sigs : sigs.map((s) => this.wrapSignature(s));
    }

    resolveHandle(handle) {
      if (!handle) {
        return;
      }
      stats.declarationResolves++;
      return this.wrapNode(handle.resolve(this.project));
    }
  }

  const unwrapType = (t) => (t instanceof TypeShim ? t.inner : t);
  const unwrapSymbol = (s) => (s instanceof SymbolShim ? s.inner : s);
  const unwrapSignature = (s) => (s instanceof SignatureShim ? s.inner : s);

  class TypeShim {
    constructor(inner, project) {
      this.inner = inner;
      this.project = project;
      this.id = inner.id;
      this.flags = remapTypeFlags(inner.flags);
      this.objectFlags = remapObjectFlags(inner.objectFlags);
      if (inner.intrinsicName) {
        this.intrinsicName = inner.intrinsicName;
      }
      if (inner.value != null && inner.value !== "") {
        this.value = inner.value;
      }
      // Strada models `true`/`false` as intrinsic types; tsgo carries the literal in `value`.
      if (this.flags & ts.TypeFlags.BooleanLiteral && !this.intrinsicName) {
        this.intrinsicName = String(inner.value);
      }
      if (inner.isThisType) {
        this.isThisType = true;
      }
    }

    get symbol() {
      return this.getSymbol();
    }

    getSymbol() {
      return this.project.wrapSymbol(this.inner.getSymbol());
    }

    get aliasSymbol() {
      return this.project.wrapSymbol(this.inner.getAliasSymbol());
    }

    get aliasTypeArguments() {
      const args = this.inner.getAliasTypeArguments();
      return args?.length ? this.project.wrapTypes(args) : undefined;
    }

    get types() {
      return this.project.wrapTypes(this.inner.getTypes());
    }

    get target() {
      return this.inner.target
        ? this.project.wrapType(this.inner.getTarget())
        : undefined;
    }

    get typeArguments() {
      return this.project.wrapTypes(
        this.project.checker.getTypeArguments(this.inner),
      );
    }

    get typeParameters() {
      return this.project.wrapTypes(this.inner.getTypeParameters());
    }

    get outerTypeParameters() {
      return this.project.wrapTypes(this.inner.getOuterTypeParameters());
    }

    get localTypeParameters() {
      return this.project.wrapTypes(this.inner.getLocalTypeParameters());
    }

    get objectType() {
      return this.project.wrapType(this.inner.getObjectType());
    }

    get indexType() {
      return this.project.wrapType(this.inner.getIndexType());
    }

    get checkType() {
      return this.project.wrapType(this.inner.getCheckType());
    }

    get extendsType() {
      return this.project.wrapType(this.inner.getExtendsType());
    }

    get constraint() {
      return this.project.wrapType(this.inner.getConstraint());
    }

    get texts() {
      return this.inner.texts;
    }

    getFlags() {
      return this.flags;
    }

    getProperties() {
      return this.project.wrapSymbols(this.inner.getProperties());
    }

    getProperty(name) {
      return this.project.wrapSymbol(this.inner.getProperty(name));
    }

    getApparentProperties() {
      return this.project.wrapSymbols(this.inner.getApparentProperties());
    }

    getCallSignatures() {
      return this.project.wrapSignatures(this.inner.getCallSignatures());
    }

    getConstructSignatures() {
      return this.project.wrapSignatures(this.inner.getConstructSignatures());
    }

    getStringIndexType() {
      return this.project.wrapType(this.inner.getStringIndexType());
    }

    getNumberIndexType() {
      return this.project.wrapType(this.inner.getNumberIndexType());
    }

    getBaseTypes() {
      return this.project.wrapTypes(this.inner.getBaseTypes());
    }

    getNonNullableType() {
      return this.project.wrapType(this.inner.getNonNullableType());
    }

    getConstraint() {
      return this.project.wrapType(this.inner.getConstraint());
    }

    getDefault() {
      return this.project.wrapType(this.inner.getDefault());
    }

    isUnion() {
      return (this.flags & ts.TypeFlags.Union) !== 0;
    }

    isIntersection() {
      return (this.flags & ts.TypeFlags.Intersection) !== 0;
    }

    isUnionOrIntersection() {
      return (this.flags & ts.TypeFlags.UnionOrIntersection) !== 0;
    }

    isLiteral() {
      return (
        (this.flags &
          (ts.TypeFlags.StringLiteral |
            ts.TypeFlags.NumberLiteral |
            ts.TypeFlags.BigIntLiteral)) !==
        0
      );
    }

    isStringLiteral() {
      return (this.flags & ts.TypeFlags.StringLiteral) !== 0;
    }

    isNumberLiteral() {
      return (this.flags & ts.TypeFlags.NumberLiteral) !== 0;
    }

    isTypeParameter() {
      return (this.flags & ts.TypeFlags.TypeParameter) !== 0;
    }

    isClassOrInterface() {
      return (this.objectFlags & ts.ObjectFlags.ClassOrInterface) !== 0;
    }

    isClass() {
      return (this.objectFlags & ts.ObjectFlags.Class) !== 0;
    }

    isIndexType() {
      return (this.flags & ts.TypeFlags.Index) !== 0;
    }
  }

  class SymbolShim {
    constructor(inner, project) {
      this.inner = inner;
      this.project = project;
      this.id = inner.id;
      this.flags = remapSymbolFlags(inner.flags);
      this.escapedName = inner.escapedName;
      this.name = inner.name;
    }

    getFlags() {
      return this.flags;
    }

    getName() {
      return this.name;
    }

    getEscapedName() {
      return this.escapedName;
    }

    get declarations() {
      if (this._declarations === undefined) {
        const handles = this.inner.declarations;
        this._declarations = handles.length
          ? handles.map((h) => this.project.resolveHandle(h))
          : undefined;
      }
      return this._declarations;
    }

    getDeclarations() {
      return this.declarations;
    }

    get valueDeclaration() {
      if (this._valueDeclaration === undefined) {
        this._valueDeclaration = this.inner.valueDeclaration
          ? this.project.resolveHandle(this.inner.valueDeclaration)
          : null;
      }
      return this._valueDeclaration ?? undefined;
    }

    get parent() {
      return this.project.wrapSymbol(this.inner.getParent());
    }

    get members() {
      return this.symbolTable(this.inner.getMembers());
    }

    get exports() {
      return this.symbolTable(this.inner.getExports());
    }

    symbolTable(map) {
      if (!map) {
        return;
      }
      const out = new Map();
      for (const [k, v] of map) {
        out.set(k, this.project.wrapSymbol(v));
      }
      return out;
    }

    getJsDocTags() {
      return this.inner.getJsDocTags(this.project.checker).map((tag) => ({
        name: tag.name,
        text: tag.text ? [{ kind: "text", text: tag.text }] : undefined,
      }));
    }

    getDocumentationComment() {
      const text = this.inner.getDocumentationComment(this.project.checker);
      return text ? [{ kind: "text", text }] : [];
    }
  }

  class SignatureShim {
    constructor(inner, project) {
      this.inner = inner;
      this.project = project;
      this.id = inner.id;
    }

    get declaration() {
      return this.project.resolveHandle(this.inner.declaration);
    }

    getDeclaration() {
      return this.declaration;
    }

    get parameters() {
      if (!this._parameters) {
        this._parameters = this.project.wrapSymbols(this.inner.getParameters());
      }
      return this._parameters;
    }

    getParameters() {
      return this.parameters;
    }

    get typeParameters() {
      const tps = this.inner.getTypeParameters();
      return tps?.length ? this.project.wrapTypes(tps) : undefined;
    }

    getTypeParameters() {
      return this.typeParameters;
    }

    get thisParameter() {
      return this.project.wrapSymbol(this.inner.getThisParameter());
    }

    getReturnType() {
      return this.project.wrapType(this.inner.getReturnType());
    }

    get resolvedReturnType() {
      return this.getReturnType();
    }

    getTypeParameterAtPosition(pos) {
      return this.project.wrapType(this.inner.getTypeParameterAtPosition(pos));
    }

    hasRestParameter() {
      return this.inner.hasRestParameter;
    }
  }

  class ProgramShim {
    constructor(project) {
      this.project = project;
    }

    getTypeChecker() {
      return this.project.shimChecker;
    }

    getCompilerOptions() {
      return this.project.compilerOptions;
    }

    getSourceFile(fileName) {
      return this.project.wrapNode(
        this.project.program.getSourceFile(fileName),
      );
    }

    getRootFileNames() {
      return this.project.project.parsedCommandLine.fileNames;
    }

    getSourceFiles() {
      return this.project.program
        .getSourceFileNames()
        .map((f) => this.getSourceFile(f));
    }

    getCurrentDirectory() {
      return this.project.project.currentDirectory;
    }

    isSourceFileFromExternalLibrary(sf) {
      return this.project.program.isSourceFileFromExternalLibrary(
        unwrapArg(sf),
      );
    }

    isSourceFileDefaultLibrary(sf) {
      return this.project.program.isSourceFileDefaultLibrary(unwrapArg(sf));
    }
  }

  class CheckerShim {
    constructor(project) {
      this.p = project;
      this.c = project.checker;
    }

    node(n) {
      return this.p.toTsgoNode(n);
    }

    getTypeAtLocation(node) {
      // Strada yields the error type (an `any`) for nodes outside the parse tree.
      if (!node) {
        return this.getAnyType();
      }
      return this.p.wrapType(this.c.getTypeAtLocation(this.node(node)));
    }

    getTypeOfSymbolAtLocation(symbol, node) {
      return this.p.wrapType(
        this.c.getTypeOfSymbolAtLocation(unwrapSymbol(symbol), this.node(node)),
      );
    }

    getTypeOfSymbol(symbol) {
      return this.p.wrapType(this.c.getTypeOfSymbol(unwrapSymbol(symbol)));
    }

    getDeclaredTypeOfSymbol(symbol) {
      return this.p.wrapType(
        this.c.getDeclaredTypeOfSymbol(unwrapSymbol(symbol)),
      );
    }

    getSymbolAtLocation(node) {
      if (!node) {
        return;
      }
      return this.p.wrapSymbol(this.c.getSymbolAtLocation(this.node(node)));
    }

    getTypeOfPropertyOfType(type, name) {
      const prop = this.c.getPropertyOfType(unwrapType(type), name);
      return prop ? this.p.wrapType(this.c.getTypeOfSymbol(prop)) : undefined;
    }

    getExportSymbolOfSymbol(symbol) {
      return this.p.wrapSymbol(unwrapSymbol(symbol).getExportSymbol());
    }

    isUnknownSymbol(symbol) {
      return this.c.isUnknownSymbol(unwrapSymbol(symbol));
    }

    isUndefinedSymbol(symbol) {
      return this.c.isUndefinedSymbol(unwrapSymbol(symbol));
    }

    isArgumentsSymbol(symbol) {
      return this.c.isArgumentsSymbol(unwrapSymbol(symbol));
    }

    getAliasedSymbol(symbol) {
      return this.p.wrapSymbol(this.c.getAliasedSymbol(unwrapSymbol(symbol)));
    }

    getImmediateAliasedSymbol(symbol) {
      return this.p.wrapSymbol(
        this.c.getImmediateAliasedSymbol(unwrapSymbol(symbol)),
      );
    }

    getFullyQualifiedName(symbol) {
      return this.c.getFullyQualifiedName(unwrapSymbol(symbol));
    }

    getExportsOfModule(symbol) {
      return this.p.wrapSymbols(
        this.c.getExportsOfModule(unwrapSymbol(symbol)),
      );
    }

    getApparentType(type) {
      return this.p.wrapType(this.c.getApparentType(unwrapType(type)));
    }

    getReducedType(type) {
      return this.p.wrapType(this.c.getReducedType(unwrapType(type)));
    }

    getNonNullableType(type) {
      return this.p.wrapType(this.c.getNonNullableType(unwrapType(type)));
    }

    getBaseTypeOfLiteralType(type) {
      return this.p.wrapType(this.c.getBaseTypeOfLiteralType(unwrapType(type)));
    }

    getWidenedType(type) {
      return this.p.wrapType(this.c.getWidenedType(unwrapType(type)));
    }

    getBaseConstraintOfType(type) {
      return this.p.wrapType(this.c.getBaseConstraintOfType(unwrapType(type)));
    }

    getConstraintOfTypeParameter(type) {
      return this.p.wrapType(
        this.c.getConstraintOfTypeParameter(unwrapType(type)),
      );
    }

    getDefaultFromTypeParameter(type) {
      return this.p.wrapType(
        this.c.getDefaultFromTypeParameter(unwrapType(type)),
      );
    }

    getBaseTypes(type) {
      return this.p.wrapTypes(this.c.getBaseTypes(unwrapType(type)));
    }

    getPropertiesOfType(type) {
      return this.p.wrapSymbols(this.c.getPropertiesOfType(unwrapType(type)));
    }

    getPropertyOfType(type, name) {
      return this.p.wrapSymbol(
        this.c.getPropertyOfType(unwrapType(type), name),
      );
    }

    getIndexInfosOfType(type) {
      return this.c.getIndexInfosOfType(unwrapType(type)).map((info) => ({
        keyType: this.p.wrapType(info.keyType),
        type: this.p.wrapType(info.valueType),
        isReadonly: !!info.isReadonly,
        declaration: info.declaration
          ? this.p.resolveHandle(info.declaration)
          : undefined,
      }));
    }

    getIndexInfoOfType(type, kind) {
      const infos = this.getIndexInfosOfType(type);
      const wanted =
        kind === ts.IndexKind.String
          ? ts.TypeFlags.String
          : ts.TypeFlags.Number;
      return infos.find((i) => i.keyType.flags & wanted);
    }

    getIndexTypeOfType(type, kind) {
      return this.getIndexInfoOfType(type, kind)?.type;
    }

    getSignaturesOfType(type, kind) {
      return this.p.wrapSignatures(
        this.c.getSignaturesOfType(
          unwrapType(type),
          remapSignatureKindToTsgo(kind),
        ),
      );
    }

    getResolvedSignature(node) {
      return this.p.wrapSignature(this.c.getResolvedSignature(this.node(node)));
    }

    getSignatureFromDeclaration(node) {
      return this.p.wrapSignature(
        this.c.getSignatureFromDeclaration(this.node(node)),
      );
    }

    getReturnTypeOfSignature(sig) {
      return this.p.wrapType(
        this.c.getReturnTypeOfSignature(unwrapSignature(sig)),
      );
    }

    getTypePredicateOfSignature(sig) {
      return this.c.getTypePredicateOfSignature(unwrapSignature(sig));
    }

    getParameterType(sig, index) {
      return this.p.wrapType(
        this.c.getParameterType(unwrapSignature(sig), index),
      );
    }

    getTypeArguments(type) {
      return this.p.wrapTypes(this.c.getTypeArguments(unwrapType(type)));
    }

    getContextualType(node) {
      if (!node) {
        return;
      }
      return this.p.wrapType(this.c.getContextualType(this.node(node)));
    }

    /** Emulates Strada's getContextualTypeForArgumentAtIndex via the resolved signature's parameter type. */
    getContextualTypeForArgumentAtIndex(node, argIndex) {
      const sig = this.c.getResolvedSignature(this.node(node));
      return this.p.wrapType(this.c.getParameterType(sig, argIndex));
    }

    getTypeFromTypeNode(node) {
      return this.p.wrapType(this.c.getTypeFromTypeNode(this.node(node)));
    }

    typeToString(type, enclosingDeclaration, flags) {
      return this.c.typeToString(
        unwrapType(type),
        enclosingDeclaration ? this.node(enclosingDeclaration) : undefined,
        flags,
      );
    }

    symbolToString(symbol) {
      return unwrapSymbol(symbol).name;
    }

    isTypeAssignableTo(source, target) {
      return this.c.isTypeAssignableTo(unwrapType(source), unwrapType(target));
    }

    isArrayType(type) {
      return this.c.isArrayType(unwrapType(type));
    }

    isTupleType(type) {
      return this.c.isTupleType(unwrapType(type));
    }

    isArrayLikeType(type) {
      return this.c.isArrayLikeType(unwrapType(type));
    }

    isReadonlySymbol(symbol) {
      return this.c.isReadonlySymbol(unwrapSymbol(symbol));
    }

    getConstantValue(node) {
      return this.c.getConstantValue(this.node(node));
    }

    getShorthandAssignmentValueSymbol(node) {
      if (!node) {
        return;
      }
      return this.p.wrapSymbol(
        this.c.getShorthandAssignmentValueSymbol(this.node(node)),
      );
    }

    getExportSpecifierLocalTargetSymbol(node) {
      if (!node) {
        return;
      }
      return this.p.wrapSymbol(
        this.c.getExportSpecifierLocalTargetSymbol(this.node(node)),
      );
    }

    getSymbolsInScope(node, meaning) {
      return this.p.wrapSymbols(
        this.c.getSymbolsInScope(this.node(node), meaning),
      );
    }

    resolveName(name, location, meaning, excludeGlobals) {
      return this.p.wrapSymbol(
        this.c.resolveName(
          name,
          meaning,
          location ? this.node(location) : undefined,
          excludeGlobals,
        ),
      );
    }

    getAnyType() {
      return this.p.wrapType(this.c.getAnyType());
    }

    getStringType() {
      return this.p.wrapType(this.c.getStringType());
    }

    getNumberType() {
      return this.p.wrapType(this.c.getNumberType());
    }

    getBooleanType() {
      return this.p.wrapType(this.c.getBooleanType());
    }

    getVoidType() {
      return this.p.wrapType(this.c.getVoidType());
    }

    getUndefinedType() {
      return this.p.wrapType(this.c.getUndefinedType());
    }

    getNullType() {
      return this.p.wrapType(this.c.getNullType());
    }

    getNeverType() {
      return this.p.wrapType(this.c.getNeverType());
    }

    getUnknownType() {
      return this.p.wrapType(this.c.getUnknownType());
    }

    getBigIntType() {
      return this.p.wrapType(this.c.getBigIntType());
    }

    getESSymbolType() {
      return this.p.wrapType(this.c.getESSymbolType());
    }

    /** Best-effort port of Strada's getAwaitedType: unwrap thenables through `then(onfulfilled)`; no union re-synthesis. */
    getAwaitedType(type) {
      stats.awaitedTypeCalls++;
      const seen = new Set();
      let current = unwrapType(type);
      for (let depth = 0; depth < 8; depth++) {
        if (seen.has(current.id)) {
          return;
        }
        seen.add(current.id);
        const promised = this.promisedTypeOfPromise(current);
        if (!promised) {
          return this.p.wrapType(current);
        }
        current = promised;
      }
      return;
    }

    getPromisedTypeOfPromise(type) {
      const promised = this.promisedTypeOfPromise(unwrapType(type));
      return promised && this.p.wrapType(promised);
    }

    promisedTypeOfPromise(type) {
      const then = this.c.getPropertyOfType(
        this.c.getApparentType(type),
        "then",
      );
      if (!then) {
        return;
      }
      const thenType = this.c.getTypeOfSymbol(then);
      const sigs = this.c.getSignaturesOfType(
        thenType,
        remapSignatureKindToTsgo(ts.SignatureKind.Call),
      );
      const candidates = new Map();
      for (const sig of sigs) {
        const params = sig.getParameters();
        if (!params.length) {
          continue;
        }
        const onfulfilled = this.c.getNonNullableType(
          this.c.getTypeOfSymbol(params[0]),
        );
        for (const part of onfulfilled.getTypes() ?? [onfulfilled]) {
          for (const cbSig of part.getCallSignatures()) {
            const cbParams = cbSig.getParameters();
            if (!cbParams.length) {
              continue;
            }
            const t = this.c.getTypeOfSymbol(cbParams[0]);
            candidates.set(t.id, t);
          }
        }
      }
      if (candidates.size !== 1) {
        return;
      }
      return candidates.values().next().value;
    }
  }

  return { TsgoProject, stats };
}
