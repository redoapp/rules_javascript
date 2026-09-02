/** Fails fast when the handed-in modules are not the TypeScript versions this bridge was written against. */

/** Nightly the bridge was verified against; `typescript/unstable/*` is unversioned and may change between nightlies. */
export const TESTED_NATIVE_VERSION = "7.1.0-dev.20260901.1";

const CHECKER_METHODS = [
  "getAliasedSymbol",
  "getAnyType",
  "getApparentType",
  "getBaseConstraintOfType",
  "getBaseTypeOfLiteralType",
  "getBaseTypes",
  "getBigIntType",
  "getBooleanType",
  "getConstantValue",
  "getConstraintOfTypeParameter",
  "getContextualType",
  "getDeclaredTypeOfSymbol",
  "getDefaultFromTypeParameter",
  "getESSymbolType",
  "getExportSpecifierLocalTargetSymbol",
  "getExportsOfModule",
  "getFullyQualifiedName",
  "getImmediateAliasedSymbol",
  "getNeverType",
  "getNonNullableType",
  "getNullType",
  "getNumberType",
  "getParameterType",
  "getPropertiesOfType",
  "getPropertyOfType",
  "getReducedType",
  "getResolvedSignature",
  "getReturnTypeOfSignature",
  "getShorthandAssignmentValueSymbol",
  "getSignatureFromDeclaration",
  "getSignaturesOfType",
  "getStringType",
  "getSymbolAtLocation",
  "getSymbolsInScope",
  "getTypeArguments",
  "getTypeAtLocation",
  "getTypeFromTypeNode",
  "getTypeOfSymbol",
  "getTypeOfSymbolAtLocation",
  "getTypePredicateOfSignature",
  "getUndefinedType",
  "getUnknownType",
  "getVoidType",
  "getWidenedType",
  "isArgumentsSymbol",
  "isArrayLikeType",
  "isArrayType",
  "isReadonlySymbol",
  "isTupleType",
  "isTypeAssignableTo",
  "isUndefinedSymbol",
  "isUnknownSymbol",
  "resolveName",
  "typeToString",
];

const SYNC_EXPORTS = [
  "API",
  "Checker",
  "TypeFlags",
  "ObjectFlags",
  "SymbolFlags",
  "SignatureKind",
];
const AST_EXPORTS = ["SyntaxKind", "NodeFlags", "ModifierFlags"];

function missing(object, names) {
  return names.filter((name) => object?.[name] === undefined);
}

/** Checker members are getters that build bound closures; inspect names only so nothing runs against the prototype. */
function missingMembers(prototype, names) {
  const own = new Set(Object.getOwnPropertyNames(prototype));
  return names.filter((name) => !own.has(name));
}

/** Throws a descriptive error if `ts`, `tsParser`, `tsgoSync` or `tsgoAst` lack what the bridge relies on. */
export function assertCompatible({ ts, tsParser, tsgoSync, tsgoAst }) {
  const problems = [];
  const stradaMajor = Number.parseInt(ts?.version ?? "", 10);
  if (typeof ts?.createSourceFile !== "function" || !ts?.SyntaxKind) {
    problems.push(
      "`ts` is not the TypeScript JS compiler module (`typescript@5.x` / `@typescript/typescript6`)",
    );
  } else if (stradaMajor >= 7) {
    problems.push(
      `\`ts\` is typescript@${ts.version}; the rules need the JS compiler API (5.x/6.x), not the native package`,
    );
  }
  if (typeof tsParser?.parseForESLint !== "function") {
    problems.push(
      "`tsParser` must be @typescript-eslint/parser (or `tseslint.parser`) exposing parseForESLint()",
    );
  }
  const syncMissing = missing(tsgoSync, SYNC_EXPORTS);
  if (syncMissing.length) {
    problems.push(
      `\`tsgoSync\` (typescript/unstable/sync) is missing ${syncMissing.join(", ")}`,
    );
  } else {
    const checkerMissing = missingMembers(
      tsgoSync.Checker.prototype,
      CHECKER_METHODS,
    );
    if (checkerMissing.length) {
      problems.push(`\`tsgoSync\` Checker lacks ${checkerMissing.join(", ")}`);
    }
  }
  const astMissing = missing(tsgoAst, AST_EXPORTS);
  if (astMissing.length) {
    problems.push(
      `\`tsgoAst\` (typescript/unstable/ast) is missing ${astMissing.join(", ")}`,
    );
  }
  if (problems.length) {
    throw new Error(
      `tsgo-bridge: incompatible modules. The bridge was verified against typescript@${TESTED_NATIVE_VERSION} (nightly; ` +
        `stable 7.0.x has no \`unstable/*\` API) with typescript@5.x for the rules.\n- ${problems.join("\n- ")}`,
    );
  }
}
