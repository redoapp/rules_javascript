'use strict';

var promises = require('node:fs/promises');
var require$$1 = require('zlib');
var require$$2 = require('path');
var require$$3 = require('module');
var require$$4 = require('url');
var require$$5 = require('util');
var require$$6 = require('assert');
var require$$7 = require('fs');
var require$$8 = require('crypto');
var require$$9 = require('os');
var node_path = require('node:path');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var require$$1__default = /*#__PURE__*/_interopDefaultLegacy(require$$1);
var require$$2__default = /*#__PURE__*/_interopDefaultLegacy(require$$2);
var require$$3__default = /*#__PURE__*/_interopDefaultLegacy(require$$3);
var require$$4__default = /*#__PURE__*/_interopDefaultLegacy(require$$4);
var require$$5__default = /*#__PURE__*/_interopDefaultLegacy(require$$5);
var require$$6__default = /*#__PURE__*/_interopDefaultLegacy(require$$6);
var require$$7__default = /*#__PURE__*/_interopDefaultLegacy(require$$7);
var require$$8__default = /*#__PURE__*/_interopDefaultLegacy(require$$8);
var require$$9__default = /*#__PURE__*/_interopDefaultLegacy(require$$9);

var JsonFormat;
(function (JsonFormat) {
    function parse(format, string) {
        return format.fromJson(JSON.parse(string));
    }
    JsonFormat.parse = parse;
    function stringify(format, value) {
        return JSON.stringify(format.toJson(value));
    }
    JsonFormat.stringify = stringify;
})(JsonFormat || (JsonFormat = {}));
(function (JsonFormat) {
    function array(elementFormat) {
        return new ArrayJsonFormat(elementFormat);
    }
    JsonFormat.array = array;
    function map(keyFormat, valueFormat) {
        return new MapJsonFormat(keyFormat, valueFormat);
    }
    JsonFormat.map = map;
    function stringMap(valueFormat) {
        return new StringMapJsonFormat(valueFormat);
    }
    JsonFormat.stringMap = stringMap;
    function object(format) {
        return new ObjectJsonFormat(format);
    }
    JsonFormat.object = object;
    function defer(format) {
        let cached;
        return {
            fromJson(json) {
                if (!cached) {
                    cached = format();
                }
                return cached.fromJson(json);
            },
            toJson(value) {
                if (!cached) {
                    cached = format();
                }
                return cached.toJson(value);
            },
        };
    }
    JsonFormat.defer = defer;
    function any() {
        return new AnyJsonFormat();
    }
    JsonFormat.any = any;
    function boolean() {
        return new IdentityJsonFormat();
    }
    JsonFormat.boolean = boolean;
    function buffer() {
        return new BufferJsonFormat();
    }
    JsonFormat.buffer = buffer;
    function identity() {
        return new IdentityJsonFormat();
    }
    JsonFormat.identity = identity;
    function nullable(format) {
        return new NullableJsonFormat(format);
    }
    JsonFormat.nullable = nullable;
    function number() {
        return new IdentityJsonFormat();
    }
    JsonFormat.number = number;
    function set(format) {
        return new SetJsonFormat(format);
    }
    JsonFormat.set = set;
    function string() {
        return new IdentityJsonFormat();
    }
    JsonFormat.string = string;
    function symbolConstant(symbol) {
        return new SymbolJsonFormat(symbol);
    }
    JsonFormat.symbolConstant = symbolConstant;
})(JsonFormat || (JsonFormat = {}));
class AnyJsonFormat {
    fromJson(json) {
        return json;
    }
    toJson(value) {
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
            return value;
        }
        const json = {};
        for (const key of Object.keys(value).sort()) {
            json[key] = this.toJson(value[key]);
        }
        return json;
    }
}
class ArrayJsonFormat {
    constructor(elementFormat) {
        this.elementFormat = elementFormat;
    }
    fromJson(json) {
        return json.map((element) => this.elementFormat.fromJson(element));
    }
    toJson(json) {
        return json.map((element) => this.elementFormat.toJson(element));
    }
}
class BufferJsonFormat {
    fromJson(json) {
        return Buffer.from(json, "base64");
    }
    toJson(value) {
        return value.toString("base64");
    }
}
class IdentityJsonFormat {
    fromJson(json) {
        return json;
    }
    toJson(value) {
        return value;
    }
}
class ObjectJsonFormat {
    constructor(format) {
        this.properties = (Object.entries(format)).sort(([a], [b]) => (a < b ? -1 : b > a ? 1 : 0));
    }
    fromJson(json) {
        const result = {};
        for (const [key, format] of this.properties) {
            if (key in json) {
                result[key] = format.fromJson(json[key]);
            }
        }
        return result;
    }
    toJson(value) {
        const json = {};
        for (const [key, format] of this.properties) {
            if (key in value) {
                json[key] = format.toJson(value[key]);
            }
        }
        return json;
    }
}
class MapJsonFormat {
    constructor(keyFormat, valueFormat) {
        this.keyFormat = keyFormat;
        this.valueFormat = valueFormat;
    }
    fromJson(json) {
        return new Map(json.map(({ key, value }) => [
            this.keyFormat.fromJson(key),
            this.valueFormat.fromJson(value),
        ]));
    }
    toJson(value) {
        return [...value.keys()].sort().map((key) => ({
            key: this.keyFormat.toJson(key),
            value: this.valueFormat.toJson(value.get(key)),
        }));
    }
}
class NullableJsonFormat {
    constructor(format) {
        this.format = format;
    }
    fromJson(json) {
        if (json === null) {
            return null;
        }
        return this.format.fromJson(json);
    }
    toJson(value) {
        if (value === null) {
            return null;
        }
        return this.format.toJson(value);
    }
}
class SetJsonFormat {
    constructor(format) {
        this.format = format;
    }
    fromJson(json) {
        return new Set(json.map((element) => this.format.fromJson(element)));
    }
    toJson(value) {
        return [...value].map((element) => this.format.toJson(element));
    }
}
class StringMapJsonFormat {
    constructor(valueFormat) {
        this.valueFormat = valueFormat;
    }
    fromJson(json) {
        return new Map(Object.entries(json).map(([key, value]) => [
            key,
            this.valueFormat.fromJson(value),
        ]));
    }
    toJson(value) {
        return Object.fromEntries([...value.keys()]
            .sort()
            .map((key) => [key, this.valueFormat.toJson(value.get(key))]));
    }
}
class SymbolJsonFormat {
    constructor(symbol) {
        this.symbol = symbol;
        if (this.symbol.description === undefined) {
            throw new Error("Symbol has no description");
        }
    }
    fromJson() {
        return this.symbol;
    }
    toJson() {
        return this.symbol.description;
    }
}

var Input;
(function (Input) {
    function json() {
        const digest = {
            fromJson(json) {
                const buffer = Buffer.from(json, "base64");
                return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
            },
            toJson(value) {
                return Buffer.from(value).toString("base64");
            },
        };
        return JsonFormat.object({
            digest,
            path: JsonFormat.string(),
        });
    }
    Input.json = json;
})(Input || (Input = {}));
var WorkRequest;
(function (WorkRequest) {
    function json() {
        return JsonFormat.object({
            arguments: JsonFormat.array(JsonFormat.string()),
            inputs: JsonFormat.array(Input.json()),
            request_id: JsonFormat.number(),
            verbosity: JsonFormat.number(),
            sandbox_dir: JsonFormat.string(),
        });
    }
    WorkRequest.json = json;
})(WorkRequest || (WorkRequest = {}));
var WorkResponse;
(function (WorkResponse) {
    function json() {
        return JsonFormat.object({
            exitCode: JsonFormat.number(),
            output: JsonFormat.string(),
            requestId: JsonFormat.number(),
        });
    }
    WorkResponse.json = json;
})(WorkResponse || (WorkResponse = {}));

async function* lines(stream) {
    let data = "";
    for await (const chunk of stream) {
        data += chunk;
        let i = 0;
        while (true) {
            const j = data.indexOf("\n", i);
            if (j === -1) {
                break;
            }
            yield data.slice(i, j + 1);
            i = j + 1;
        }
        data = data.slice(i);
    }
    if (data) {
        yield data;
    }
}

class CliError extends Error {
}
async function runWorker(worker) {
    process.stdin.setEncoding("utf8");
    let abort;
    process.on("SIGINT", () => abort?.abort());
    process.on("SIGTERM", () => abort?.abort());
    for await (const line of lines(process.stdin)) {
        const message = JsonFormat.parse(WorkRequest.json(), line);
        if (message.request_id) {
            throw new CliError("Does not support multiplexed requests");
        }
        if (abort) {
            if (!message.cancel) {
                throw new CliError("Unexpected request while processing existing request");
            }
            abort.abort();
        }
        else {
            if (message.cancel) {
                continue;
            }
            abort = new AbortController();
            worker(message.arguments, message.inputs, abort.signal).then(({ exitCode, output }) => {
                const response = {
                    exitCode,
                    output,
                    requestId: message.request_id,
                    // wasCancelled: abort.signal.aborted,
                };
                const outputData = JsonFormat.stringify(WorkResponse.json(), response);
                process.stdout.write(outputData + "\n");
                abort = undefined;
                if (typeof gc !== "undefined") {
                    gc();
                }
            }, (error) => {
                console.error(error.stack);
                process.exit(1);
            });
        }
    }
}
async function runOnce(worker, args) {
    const abort = new AbortController();
    process.on("SIGINT", () => abort.abort());
    process.on("SIGTERM", () => abort.abort());
    const result = await worker(args, undefined, abort.signal);
    console.error(result.output);
    process.exitCode = result.exitCode;
}
/**
 * Run program using the provided worker factory.
 */
async function workerMain(workerFactory) {
    try {
        const last = process.argv.at(-1);
        if (last === "--persistent_worker") {
            const worker = await workerFactory(process.argv.slice(2, -1));
            await runWorker(worker);
        }
        else if (last?.startsWith("@")) {
            const worker = await workerFactory(process.argv.slice(2, -1));
            const file = await promises.readFile(last.slice(1), "utf8");
            const args = file.trim().split("\n");
            await runOnce(worker, args);
        }
        else {
            const worker = await workerFactory([]);
            await runOnce(worker, process.argv.slice(2));
        }
    }
    catch (error) {
        console.error(error instanceof CliError
            ? error.message
            : error instanceof Error
                ? error.stack
                : String(error));
        process.exit(1);
    }
}

workerMain(async () => {
    const { ManifestWorker, ManifestWorkerError } = await Promise.resolve().then(function () { return worker; });
    const worker$1 = new ManifestWorker();
    return async (a) => {
        try {
            await worker$1.run(a);
        }
        catch (error) {
            if (error instanceof ManifestWorkerError) {
                return { exitCode: 2, output: error.message };
            }
            return {
                exitCode: 1,
                output: String(error instanceof Error ? error.stack : error),
            };
        }
        return { exitCode: 0, output: "" };
    };
});

function packageTree(packageArgs, depArgs) {
    const byId = new Map();
    const byPath = new Map();
    for (const arg of packageArgs) {
        const dupId = byId.get(arg.id);
        if (dupId) {
            throw new Error(`Multiple instances of package ID ${arg.id} from ${dupId.label} and ${arg.label}`);
        }
        const dupPath = byPath.get(arg.path);
        if (dupPath) {
            throw new Error(`Multiple instances of package path ${arg.path} from ${dupPath.label} and ${arg.label}`);
        }
        const pkg = {
            label: arg.label,
            name: arg.name,
            path: arg.path,
            deps: new Map(),
        };
        byId.set(arg.id, pkg);
        byPath.set(arg.path, pkg);
    }
    const globals = new Map();
    for (const arg of depArgs) {
        const dep = byId.get(arg.dep);
        if (!dep) {
            const via = arg.id == null ? "globally" : `by ${arg.id}`;
            throw new Error(`Package ${arg.dep} does not exist, but is referenced ${via} (${arg.label})`);
        }
        let deps;
        if (arg.id == null) {
            deps = globals;
        }
        else {
            const pkg = byId.get(arg.id);
            if (!pkg) {
                throw new Error(`Package ${arg.id} does not exist, but is referenced (${arg.label})`);
            }
            deps = pkg.deps;
        }
        const existing = deps.get(arg.name);
        if (existing && existing.path !== dep.path) {
            const subject = arg.id == null ? "globals" : `dependencies for ${arg.id}`;
            throw new Error(`Multiple ${subject} named ${arg.name}: ${existing.path} (via ${existing.label}) and ${dep.path} (via ${arg.label})`);
        }
        deps.set(arg.name, { label: arg.label, path: dep.path });
    }
    const paths = (deps) => new Map(Array.from(deps, ([name, dep]) => [name, dep.path]));
    const packages = new Map(Array.from(byId.values(), (pkg) => [
        pkg.path,
        { name: pkg.name, deps: paths(pkg.deps) },
    ]));
    return { globals: paths(globals), packages };
}

var lib = {};

var hasRequiredLib;

function requireLib () {
	if (hasRequiredLib) return lib;
	hasRequiredLib = 1;

	Object.defineProperty(lib, '__esModule', { value: true });

	const require$$0 = require$$1__default["default"];
	const path = require$$2__default["default"];
	const module$1 = require$$3__default["default"];
	const url = require$$4__default["default"];
	const nodeUtils = require$$5__default["default"];
	const assert = require$$6__default["default"];
	const fs = require$$7__default["default"];
	const crypto = require$$8__default["default"];
	const os = require$$9__default["default"];

	const _interopDefaultLegacy = e => e && typeof e === 'object' && 'default' in e ? e : { default: e };

	const require$$0__default = /*#__PURE__*/_interopDefaultLegacy(require$$0);
	const path__default = /*#__PURE__*/_interopDefaultLegacy(path);
	const assert__default = /*#__PURE__*/_interopDefaultLegacy(assert);
	const fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);

	var LinkType = /* @__PURE__ */ ((LinkType2) => {
	  LinkType2["HARD"] = `HARD`;
	  LinkType2["SOFT"] = `SOFT`;
	  return LinkType2;
	})(LinkType || {});

	const SAFE_TIME = 456789e3;

	const PortablePath = {
	  root: `/`,
	  dot: `.`,
	  parent: `..`
	};
	const Filename = {
	  home: `~`,
	  nodeModules: `node_modules`,
	  manifest: `package.json`,
	  lockfile: `yarn.lock`,
	  virtual: `__virtual__`,
	  /**
	   * @deprecated
	   */
	  pnpJs: `.pnp.js`,
	  pnpCjs: `.pnp.cjs`,
	  pnpData: `.pnp.data.json`,
	  pnpEsmLoader: `.pnp.loader.mjs`,
	  rc: `.yarnrc.yml`,
	  env: `.env`
	};
	const npath = Object.create(path__default.default);
	const ppath = Object.create(path__default.default.posix);
	npath.cwd = () => process.cwd();
	ppath.cwd = process.platform === `win32` ? () => toPortablePath(process.cwd()) : process.cwd;
	if (process.platform === `win32`) {
	  ppath.resolve = (...segments) => {
	    if (segments.length > 0 && ppath.isAbsolute(segments[0])) {
	      return path__default.default.posix.resolve(...segments);
	    } else {
	      return path__default.default.posix.resolve(ppath.cwd(), ...segments);
	    }
	  };
	}
	const contains = function(pathUtils, from, to) {
	  from = pathUtils.normalize(from);
	  to = pathUtils.normalize(to);
	  if (from === to)
	    return `.`;
	  if (!from.endsWith(pathUtils.sep))
	    from = from + pathUtils.sep;
	  if (to.startsWith(from)) {
	    return to.slice(from.length);
	  } else {
	    return null;
	  }
	};
	npath.contains = (from, to) => contains(npath, from, to);
	ppath.contains = (from, to) => contains(ppath, from, to);
	const WINDOWS_PATH_REGEXP = /^([a-zA-Z]:.*)$/;
	const UNC_WINDOWS_PATH_REGEXP = /^\/\/(\.\/)?(.*)$/;
	const PORTABLE_PATH_REGEXP = /^\/([a-zA-Z]:.*)$/;
	const UNC_PORTABLE_PATH_REGEXP = /^\/unc\/(\.dot\/)?(.*)$/;
	function fromPortablePathWin32(p) {
	  let portablePathMatch, uncPortablePathMatch;
	  if (portablePathMatch = p.match(PORTABLE_PATH_REGEXP))
	    p = portablePathMatch[1];
	  else if (uncPortablePathMatch = p.match(UNC_PORTABLE_PATH_REGEXP))
	    p = `\\\\${uncPortablePathMatch[1] ? `.\\` : ``}${uncPortablePathMatch[2]}`;
	  else
	    return p;
	  return p.replace(/\//g, `\\`);
	}
	function toPortablePathWin32(p) {
	  p = p.replace(/\\/g, `/`);
	  let windowsPathMatch, uncWindowsPathMatch;
	  if (windowsPathMatch = p.match(WINDOWS_PATH_REGEXP))
	    p = `/${windowsPathMatch[1]}`;
	  else if (uncWindowsPathMatch = p.match(UNC_WINDOWS_PATH_REGEXP))
	    p = `/unc/${uncWindowsPathMatch[1] ? `.dot/` : ``}${uncWindowsPathMatch[2]}`;
	  return p;
	}
	const toPortablePath = process.platform === `win32` ? toPortablePathWin32 : (p) => p;
	const fromPortablePath = process.platform === `win32` ? fromPortablePathWin32 : (p) => p;
	npath.fromPortablePath = fromPortablePath;
	npath.toPortablePath = toPortablePath;
	function convertPath(targetPathUtils, sourcePath) {
	  return targetPathUtils === npath ? fromPortablePath(sourcePath) : toPortablePath(sourcePath);
	}

	const defaultTime = new Date(SAFE_TIME * 1e3);
	const defaultTimeMs = defaultTime.getTime();
	async function copyPromise(destinationFs, destination, sourceFs, source, opts) {
	  const normalizedDestination = destinationFs.pathUtils.normalize(destination);
	  const normalizedSource = sourceFs.pathUtils.normalize(source);
	  const prelayout = [];
	  const postlayout = [];
	  const { atime, mtime } = opts.stableTime ? { atime: defaultTime, mtime: defaultTime } : await sourceFs.lstatPromise(normalizedSource);
	  await destinationFs.mkdirpPromise(destinationFs.pathUtils.dirname(destination), { utimes: [atime, mtime] });
	  await copyImpl(prelayout, postlayout, destinationFs, normalizedDestination, sourceFs, normalizedSource, { ...opts, didParentExist: true });
	  for (const operation of prelayout)
	    await operation();
	  await Promise.all(postlayout.map((operation) => {
	    return operation();
	  }));
	}
	async function copyImpl(prelayout, postlayout, destinationFs, destination, sourceFs, source, opts) {
	  const destinationStat = opts.didParentExist ? await maybeLStat(destinationFs, destination) : null;
	  const sourceStat = await sourceFs.lstatPromise(source);
	  const { atime, mtime } = opts.stableTime ? { atime: defaultTime, mtime: defaultTime } : sourceStat;
	  let updated;
	  switch (true) {
	    case sourceStat.isDirectory():
	      {
	        updated = await copyFolder(prelayout, postlayout, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts);
	      }
	      break;
	    case sourceStat.isFile():
	      {
	        updated = await copyFile(prelayout, postlayout, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts);
	      }
	      break;
	    case sourceStat.isSymbolicLink():
	      {
	        updated = await copySymlink(prelayout, postlayout, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts);
	      }
	      break;
	    default: {
	      throw new Error(`Unsupported file type (${sourceStat.mode})`);
	    }
	  }
	  if (opts.linkStrategy?.type !== `HardlinkFromIndex` || !sourceStat.isFile()) {
	    if (updated || destinationStat?.mtime?.getTime() !== mtime.getTime() || destinationStat?.atime?.getTime() !== atime.getTime()) {
	      postlayout.push(() => destinationFs.lutimesPromise(destination, atime, mtime));
	      updated = true;
	    }
	    if (destinationStat === null || (destinationStat.mode & 511) !== (sourceStat.mode & 511)) {
	      postlayout.push(() => destinationFs.chmodPromise(destination, sourceStat.mode & 511));
	      updated = true;
	    }
	  }
	  return updated;
	}
	async function maybeLStat(baseFs, p) {
	  try {
	    return await baseFs.lstatPromise(p);
	  } catch {
	    return null;
	  }
	}
	async function copyFolder(prelayout, postlayout, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts) {
	  if (destinationStat !== null && !destinationStat.isDirectory()) {
	    if (opts.overwrite) {
	      prelayout.push(async () => destinationFs.removePromise(destination));
	      destinationStat = null;
	    } else {
	      return false;
	    }
	  }
	  let updated = false;
	  if (destinationStat === null) {
	    prelayout.push(async () => {
	      try {
	        await destinationFs.mkdirPromise(destination, { mode: sourceStat.mode });
	      } catch (err) {
	        if (err.code !== `EEXIST`) {
	          throw err;
	        }
	      }
	    });
	    updated = true;
	  }
	  const entries = await sourceFs.readdirPromise(source);
	  const nextOpts = opts.didParentExist && !destinationStat ? { ...opts, didParentExist: false } : opts;
	  if (opts.stableSort) {
	    for (const entry of entries.sort()) {
	      if (await copyImpl(prelayout, postlayout, destinationFs, destinationFs.pathUtils.join(destination, entry), sourceFs, sourceFs.pathUtils.join(source, entry), nextOpts)) {
	        updated = true;
	      }
	    }
	  } else {
	    const entriesUpdateStatus = await Promise.all(entries.map(async (entry) => {
	      await copyImpl(prelayout, postlayout, destinationFs, destinationFs.pathUtils.join(destination, entry), sourceFs, sourceFs.pathUtils.join(source, entry), nextOpts);
	    }));
	    if (entriesUpdateStatus.some((status) => status)) {
	      updated = true;
	    }
	  }
	  return updated;
	}
	async function copyFileViaIndex(prelayout, postlayout, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts, linkStrategy) {
	  const sourceHash = await sourceFs.checksumFilePromise(source, { algorithm: `sha1` });
	  const defaultMode = 420;
	  const sourceMode = sourceStat.mode & 511;
	  const indexFileName = `${sourceHash}${sourceMode !== defaultMode ? sourceMode.toString(8) : ``}`;
	  const indexPath = destinationFs.pathUtils.join(linkStrategy.indexPath, sourceHash.slice(0, 2), `${indexFileName}.dat`);
	  let AtomicBehavior;
	  ((AtomicBehavior2) => {
	    AtomicBehavior2[AtomicBehavior2["Lock"] = 0] = "Lock";
	    AtomicBehavior2[AtomicBehavior2["Rename"] = 1] = "Rename";
	  })(AtomicBehavior || (AtomicBehavior = {}));
	  let atomicBehavior = 1 /* Rename */;
	  let indexStat = await maybeLStat(destinationFs, indexPath);
	  if (destinationStat) {
	    const isDestinationHardlinkedFromIndex = indexStat && destinationStat.dev === indexStat.dev && destinationStat.ino === indexStat.ino;
	    const isIndexModified = indexStat?.mtimeMs !== defaultTimeMs;
	    if (isDestinationHardlinkedFromIndex) {
	      if (isIndexModified && linkStrategy.autoRepair) {
	        atomicBehavior = 0 /* Lock */;
	        indexStat = null;
	      }
	    }
	    if (!isDestinationHardlinkedFromIndex) {
	      if (opts.overwrite) {
	        prelayout.push(async () => destinationFs.removePromise(destination));
	        destinationStat = null;
	      } else {
	        return false;
	      }
	    }
	  }
	  const tempPath = !indexStat && atomicBehavior === 1 /* Rename */ ? `${indexPath}.${Math.floor(Math.random() * 4294967296).toString(16).padStart(8, `0`)}` : null;
	  let tempPathCleaned = false;
	  prelayout.push(async () => {
	    if (!indexStat) {
	      if (atomicBehavior === 0 /* Lock */) {
	        await destinationFs.lockPromise(indexPath, async () => {
	          const content = await sourceFs.readFilePromise(source);
	          await destinationFs.writeFilePromise(indexPath, content);
	        });
	      }
	      if (atomicBehavior === 1 /* Rename */ && tempPath) {
	        const content = await sourceFs.readFilePromise(source);
	        await destinationFs.writeFilePromise(tempPath, content);
	        try {
	          await destinationFs.linkPromise(tempPath, indexPath);
	        } catch (err) {
	          if (err.code === `EEXIST`) {
	            tempPathCleaned = true;
	            await destinationFs.unlinkPromise(tempPath);
	          } else {
	            throw err;
	          }
	        }
	      }
	    }
	    if (!destinationStat) {
	      await destinationFs.linkPromise(indexPath, destination);
	    }
	  });
	  postlayout.push(async () => {
	    if (!indexStat) {
	      await destinationFs.lutimesPromise(indexPath, defaultTime, defaultTime);
	      if (sourceMode !== defaultMode) {
	        await destinationFs.chmodPromise(indexPath, sourceMode);
	      }
	    }
	    if (tempPath && !tempPathCleaned) {
	      await destinationFs.unlinkPromise(tempPath);
	    }
	  });
	  return false;
	}
	async function copyFileDirect(prelayout, postlayout, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts) {
	  if (destinationStat !== null) {
	    if (opts.overwrite) {
	      prelayout.push(async () => destinationFs.removePromise(destination));
	      destinationStat = null;
	    } else {
	      return false;
	    }
	  }
	  prelayout.push(async () => {
	    const content = await sourceFs.readFilePromise(source);
	    await destinationFs.writeFilePromise(destination, content);
	  });
	  return true;
	}
	async function copyFile(prelayout, postlayout, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts) {
	  if (opts.linkStrategy?.type === `HardlinkFromIndex`) {
	    return copyFileViaIndex(prelayout, postlayout, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts, opts.linkStrategy);
	  } else {
	    return copyFileDirect(prelayout, postlayout, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts);
	  }
	}
	async function copySymlink(prelayout, postlayout, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts) {
	  if (destinationStat !== null) {
	    if (opts.overwrite) {
	      prelayout.push(async () => destinationFs.removePromise(destination));
	      destinationStat = null;
	    } else {
	      return false;
	    }
	  }
	  prelayout.push(async () => {
	    await destinationFs.symlinkPromise(convertPath(destinationFs.pathUtils, await sourceFs.readlinkPromise(source)), destination);
	  });
	  return true;
	}

	class FakeFS {
	  pathUtils;
	  constructor(pathUtils) {
	    this.pathUtils = pathUtils;
	  }
	  async *genTraversePromise(init, { stableSort = false } = {}) {
	    const stack = [init];
	    while (stack.length > 0) {
	      const p = stack.shift();
	      const entry = await this.lstatPromise(p);
	      if (entry.isDirectory()) {
	        const entries = await this.readdirPromise(p);
	        if (stableSort) {
	          for (const entry2 of entries.sort()) {
	            stack.push(this.pathUtils.join(p, entry2));
	          }
	        } else {
	          throw new Error(`Not supported`);
	        }
	      } else {
	        yield p;
	      }
	    }
	  }
	  async checksumFilePromise(path, { algorithm = `sha512` } = {}) {
	    const fd = await this.openPromise(path, `r`);
	    try {
	      const CHUNK_SIZE = 65536;
	      const chunk = Buffer.allocUnsafeSlow(CHUNK_SIZE);
	      const hash = crypto.createHash(algorithm);
	      let bytesRead = 0;
	      while ((bytesRead = await this.readPromise(fd, chunk, 0, CHUNK_SIZE)) !== 0)
	        hash.update(bytesRead === CHUNK_SIZE ? chunk : chunk.slice(0, bytesRead));
	      return hash.digest(`hex`);
	    } finally {
	      await this.closePromise(fd);
	    }
	  }
	  async removePromise(p, { recursive = true, maxRetries = 5 } = {}) {
	    let stat;
	    try {
	      stat = await this.lstatPromise(p);
	    } catch (error) {
	      if (error.code === `ENOENT`) {
	        return;
	      } else {
	        throw error;
	      }
	    }
	    if (stat.isDirectory()) {
	      if (recursive) {
	        const entries = await this.readdirPromise(p);
	        await Promise.all(entries.map((entry) => {
	          return this.removePromise(this.pathUtils.resolve(p, entry));
	        }));
	      }
	      for (let t = 0; t <= maxRetries; t++) {
	        try {
	          await this.rmdirPromise(p);
	          break;
	        } catch (error) {
	          if (error.code !== `EBUSY` && error.code !== `ENOTEMPTY`) {
	            throw error;
	          } else if (t < maxRetries) {
	            await new Promise((resolve) => setTimeout(resolve, t * 100));
	          }
	        }
	      }
	    } else {
	      await this.unlinkPromise(p);
	    }
	  }
	  removeSync(p, { recursive = true } = {}) {
	    let stat;
	    try {
	      stat = this.lstatSync(p);
	    } catch (error) {
	      if (error.code === `ENOENT`) {
	        return;
	      } else {
	        throw error;
	      }
	    }
	    if (stat.isDirectory()) {
	      if (recursive)
	        for (const entry of this.readdirSync(p))
	          this.removeSync(this.pathUtils.resolve(p, entry));
	      this.rmdirSync(p);
	    } else {
	      this.unlinkSync(p);
	    }
	  }
	  async mkdirpPromise(p, { chmod, utimes } = {}) {
	    p = this.resolve(p);
	    if (p === this.pathUtils.dirname(p))
	      return void 0;
	    const parts = p.split(this.pathUtils.sep);
	    let createdDirectory;
	    for (let u = 2; u <= parts.length; ++u) {
	      const subPath = parts.slice(0, u).join(this.pathUtils.sep);
	      if (!this.existsSync(subPath)) {
	        try {
	          await this.mkdirPromise(subPath);
	        } catch (error) {
	          if (error.code === `EEXIST`) {
	            continue;
	          } else {
	            throw error;
	          }
	        }
	        createdDirectory ??= subPath;
	        if (chmod != null)
	          await this.chmodPromise(subPath, chmod);
	        if (utimes != null) {
	          await this.utimesPromise(subPath, utimes[0], utimes[1]);
	        } else {
	          const parentStat = await this.statPromise(this.pathUtils.dirname(subPath));
	          await this.utimesPromise(subPath, parentStat.atime, parentStat.mtime);
	        }
	      }
	    }
	    return createdDirectory;
	  }
	  mkdirpSync(p, { chmod, utimes } = {}) {
	    p = this.resolve(p);
	    if (p === this.pathUtils.dirname(p))
	      return void 0;
	    const parts = p.split(this.pathUtils.sep);
	    let createdDirectory;
	    for (let u = 2; u <= parts.length; ++u) {
	      const subPath = parts.slice(0, u).join(this.pathUtils.sep);
	      if (!this.existsSync(subPath)) {
	        try {
	          this.mkdirSync(subPath);
	        } catch (error) {
	          if (error.code === `EEXIST`) {
	            continue;
	          } else {
	            throw error;
	          }
	        }
	        createdDirectory ??= subPath;
	        if (chmod != null)
	          this.chmodSync(subPath, chmod);
	        if (utimes != null) {
	          this.utimesSync(subPath, utimes[0], utimes[1]);
	        } else {
	          const parentStat = this.statSync(this.pathUtils.dirname(subPath));
	          this.utimesSync(subPath, parentStat.atime, parentStat.mtime);
	        }
	      }
	    }
	    return createdDirectory;
	  }
	  async copyPromise(destination, source, { baseFs = this, overwrite = true, stableSort = false, stableTime = false, linkStrategy = null } = {}) {
	    return await copyPromise(this, destination, baseFs, source, { overwrite, stableSort, stableTime, linkStrategy });
	  }
	  copySync(destination, source, { baseFs = this, overwrite = true } = {}) {
	    const stat = baseFs.lstatSync(source);
	    const exists = this.existsSync(destination);
	    if (stat.isDirectory()) {
	      this.mkdirpSync(destination);
	      const directoryListing = baseFs.readdirSync(source);
	      for (const entry of directoryListing) {
	        this.copySync(this.pathUtils.join(destination, entry), baseFs.pathUtils.join(source, entry), { baseFs, overwrite });
	      }
	    } else if (stat.isFile()) {
	      if (!exists || overwrite) {
	        if (exists)
	          this.removeSync(destination);
	        const content = baseFs.readFileSync(source);
	        this.writeFileSync(destination, content);
	      }
	    } else if (stat.isSymbolicLink()) {
	      if (!exists || overwrite) {
	        if (exists)
	          this.removeSync(destination);
	        const target = baseFs.readlinkSync(source);
	        this.symlinkSync(convertPath(this.pathUtils, target), destination);
	      }
	    } else {
	      throw new Error(`Unsupported file type (file: ${source}, mode: 0o${stat.mode.toString(8).padStart(6, `0`)})`);
	    }
	    const mode = stat.mode & 511;
	    this.chmodSync(destination, mode);
	  }
	  async changeFilePromise(p, content, opts = {}) {
	    if (Buffer.isBuffer(content)) {
	      return this.changeFileBufferPromise(p, content, opts);
	    } else {
	      return this.changeFileTextPromise(p, content, opts);
	    }
	  }
	  async changeFileBufferPromise(p, content, { mode } = {}) {
	    let current = Buffer.alloc(0);
	    try {
	      current = await this.readFilePromise(p);
	    } catch {
	    }
	    if (Buffer.compare(current, content) === 0)
	      return;
	    await this.writeFilePromise(p, content, { mode });
	  }
	  async changeFileTextPromise(p, content, { automaticNewlines, mode } = {}) {
	    let current = ``;
	    try {
	      current = await this.readFilePromise(p, `utf8`);
	    } catch {
	    }
	    const normalizedContent = automaticNewlines ? normalizeLineEndings(current, content) : content;
	    if (current === normalizedContent)
	      return;
	    await this.writeFilePromise(p, normalizedContent, { mode });
	  }
	  changeFileSync(p, content, opts = {}) {
	    if (Buffer.isBuffer(content)) {
	      return this.changeFileBufferSync(p, content, opts);
	    } else {
	      return this.changeFileTextSync(p, content, opts);
	    }
	  }
	  changeFileBufferSync(p, content, { mode } = {}) {
	    let current = Buffer.alloc(0);
	    try {
	      current = this.readFileSync(p);
	    } catch {
	    }
	    if (Buffer.compare(current, content) === 0)
	      return;
	    this.writeFileSync(p, content, { mode });
	  }
	  changeFileTextSync(p, content, { automaticNewlines = false, mode } = {}) {
	    let current = ``;
	    try {
	      current = this.readFileSync(p, `utf8`);
	    } catch {
	    }
	    const normalizedContent = automaticNewlines ? normalizeLineEndings(current, content) : content;
	    if (current === normalizedContent)
	      return;
	    this.writeFileSync(p, normalizedContent, { mode });
	  }
	  async movePromise(fromP, toP) {
	    try {
	      await this.renamePromise(fromP, toP);
	    } catch (error) {
	      if (error.code === `EXDEV`) {
	        await this.copyPromise(toP, fromP);
	        await this.removePromise(fromP);
	      } else {
	        throw error;
	      }
	    }
	  }
	  moveSync(fromP, toP) {
	    try {
	      this.renameSync(fromP, toP);
	    } catch (error) {
	      if (error.code === `EXDEV`) {
	        this.copySync(toP, fromP);
	        this.removeSync(fromP);
	      } else {
	        throw error;
	      }
	    }
	  }
	  async lockPromise(affectedPath, callback) {
	    const lockPath = `${affectedPath}.flock`;
	    const interval = 1e3 / 60;
	    const startTime = Date.now();
	    let fd = null;
	    const isAlive = async () => {
	      let pid;
	      try {
	        [pid] = await this.readJsonPromise(lockPath);
	      } catch {
	        return Date.now() - startTime < 500;
	      }
	      try {
	        process.kill(pid, 0);
	        return true;
	      } catch {
	        return false;
	      }
	    };
	    while (fd === null) {
	      try {
	        fd = await this.openPromise(lockPath, `wx`);
	      } catch (error) {
	        if (error.code === `EEXIST`) {
	          if (!await isAlive()) {
	            try {
	              await this.unlinkPromise(lockPath);
	              continue;
	            } catch {
	            }
	          }
	          if (Date.now() - startTime < 60 * 1e3) {
	            await new Promise((resolve) => setTimeout(resolve, interval));
	          } else {
	            throw new Error(`Couldn't acquire a lock in a reasonable time (via ${lockPath})`);
	          }
	        } else {
	          throw error;
	        }
	      }
	    }
	    await this.writePromise(fd, JSON.stringify([process.pid]));
	    try {
	      return await callback();
	    } finally {
	      try {
	        await this.closePromise(fd);
	        await this.unlinkPromise(lockPath);
	      } catch {
	      }
	    }
	  }
	  async readJsonPromise(p) {
	    const content = await this.readFilePromise(p, `utf8`);
	    try {
	      return JSON.parse(content);
	    } catch (error) {
	      error.message += ` (in ${p})`;
	      throw error;
	    }
	  }
	  readJsonSync(p) {
	    const content = this.readFileSync(p, `utf8`);
	    try {
	      return JSON.parse(content);
	    } catch (error) {
	      error.message += ` (in ${p})`;
	      throw error;
	    }
	  }
	  async writeJsonPromise(p, data, { compact = false } = {}) {
	    const space = compact ? 0 : 2;
	    return await this.writeFilePromise(p, `${JSON.stringify(data, null, space)}
`);
	  }
	  writeJsonSync(p, data, { compact = false } = {}) {
	    const space = compact ? 0 : 2;
	    return this.writeFileSync(p, `${JSON.stringify(data, null, space)}
`);
	  }
	  async preserveTimePromise(p, cb) {
	    const stat = await this.lstatPromise(p);
	    const result = await cb();
	    if (typeof result !== `undefined`)
	      p = result;
	    await this.lutimesPromise(p, stat.atime, stat.mtime);
	  }
	  async preserveTimeSync(p, cb) {
	    const stat = this.lstatSync(p);
	    const result = cb();
	    if (typeof result !== `undefined`)
	      p = result;
	    this.lutimesSync(p, stat.atime, stat.mtime);
	  }
	}
	class BasePortableFakeFS extends FakeFS {
	  constructor() {
	    super(ppath);
	  }
	}
	function getEndOfLine(content) {
	  const matches = content.match(/\r?\n/g);
	  if (matches === null)
	    return os.EOL;
	  const crlf = matches.filter((nl) => nl === `\r
`).length;
	  const lf = matches.length - crlf;
	  return crlf > lf ? `\r
` : `
`;
	}
	function normalizeLineEndings(originalContent, newContent) {
	  return newContent.replace(/\r?\n/g, getEndOfLine(originalContent));
	}

	class ProxiedFS extends FakeFS {
	  getExtractHint(hints) {
	    return this.baseFs.getExtractHint(hints);
	  }
	  resolve(path) {
	    return this.mapFromBase(this.baseFs.resolve(this.mapToBase(path)));
	  }
	  getRealPath() {
	    return this.mapFromBase(this.baseFs.getRealPath());
	  }
	  async openPromise(p, flags, mode) {
	    return this.baseFs.openPromise(this.mapToBase(p), flags, mode);
	  }
	  openSync(p, flags, mode) {
	    return this.baseFs.openSync(this.mapToBase(p), flags, mode);
	  }
	  async opendirPromise(p, opts) {
	    return Object.assign(await this.baseFs.opendirPromise(this.mapToBase(p), opts), { path: p });
	  }
	  opendirSync(p, opts) {
	    return Object.assign(this.baseFs.opendirSync(this.mapToBase(p), opts), { path: p });
	  }
	  async readPromise(fd, buffer, offset, length, position) {
	    return await this.baseFs.readPromise(fd, buffer, offset, length, position);
	  }
	  readSync(fd, buffer, offset, length, position) {
	    return this.baseFs.readSync(fd, buffer, offset, length, position);
	  }
	  async writePromise(fd, buffer, offset, length, position) {
	    if (typeof buffer === `string`) {
	      return await this.baseFs.writePromise(fd, buffer, offset);
	    } else {
	      return await this.baseFs.writePromise(fd, buffer, offset, length, position);
	    }
	  }
	  writeSync(fd, buffer, offset, length, position) {
	    if (typeof buffer === `string`) {
	      return this.baseFs.writeSync(fd, buffer, offset);
	    } else {
	      return this.baseFs.writeSync(fd, buffer, offset, length, position);
	    }
	  }
	  async closePromise(fd) {
	    return this.baseFs.closePromise(fd);
	  }
	  closeSync(fd) {
	    this.baseFs.closeSync(fd);
	  }
	  createReadStream(p, opts) {
	    return this.baseFs.createReadStream(p !== null ? this.mapToBase(p) : p, opts);
	  }
	  createWriteStream(p, opts) {
	    return this.baseFs.createWriteStream(p !== null ? this.mapToBase(p) : p, opts);
	  }
	  async realpathPromise(p) {
	    return this.mapFromBase(await this.baseFs.realpathPromise(this.mapToBase(p)));
	  }
	  realpathSync(p) {
	    return this.mapFromBase(this.baseFs.realpathSync(this.mapToBase(p)));
	  }
	  async existsPromise(p) {
	    return this.baseFs.existsPromise(this.mapToBase(p));
	  }
	  existsSync(p) {
	    return this.baseFs.existsSync(this.mapToBase(p));
	  }
	  accessSync(p, mode) {
	    return this.baseFs.accessSync(this.mapToBase(p), mode);
	  }
	  async accessPromise(p, mode) {
	    return this.baseFs.accessPromise(this.mapToBase(p), mode);
	  }
	  async statPromise(p, opts) {
	    return this.baseFs.statPromise(this.mapToBase(p), opts);
	  }
	  statSync(p, opts) {
	    return this.baseFs.statSync(this.mapToBase(p), opts);
	  }
	  async fstatPromise(fd, opts) {
	    return this.baseFs.fstatPromise(fd, opts);
	  }
	  fstatSync(fd, opts) {
	    return this.baseFs.fstatSync(fd, opts);
	  }
	  lstatPromise(p, opts) {
	    return this.baseFs.lstatPromise(this.mapToBase(p), opts);
	  }
	  lstatSync(p, opts) {
	    return this.baseFs.lstatSync(this.mapToBase(p), opts);
	  }
	  async fchmodPromise(fd, mask) {
	    return this.baseFs.fchmodPromise(fd, mask);
	  }
	  fchmodSync(fd, mask) {
	    return this.baseFs.fchmodSync(fd, mask);
	  }
	  async chmodPromise(p, mask) {
	    return this.baseFs.chmodPromise(this.mapToBase(p), mask);
	  }
	  chmodSync(p, mask) {
	    return this.baseFs.chmodSync(this.mapToBase(p), mask);
	  }
	  async fchownPromise(fd, uid, gid) {
	    return this.baseFs.fchownPromise(fd, uid, gid);
	  }
	  fchownSync(fd, uid, gid) {
	    return this.baseFs.fchownSync(fd, uid, gid);
	  }
	  async chownPromise(p, uid, gid) {
	    return this.baseFs.chownPromise(this.mapToBase(p), uid, gid);
	  }
	  chownSync(p, uid, gid) {
	    return this.baseFs.chownSync(this.mapToBase(p), uid, gid);
	  }
	  async renamePromise(oldP, newP) {
	    return this.baseFs.renamePromise(this.mapToBase(oldP), this.mapToBase(newP));
	  }
	  renameSync(oldP, newP) {
	    return this.baseFs.renameSync(this.mapToBase(oldP), this.mapToBase(newP));
	  }
	  async copyFilePromise(sourceP, destP, flags = 0) {
	    return this.baseFs.copyFilePromise(this.mapToBase(sourceP), this.mapToBase(destP), flags);
	  }
	  copyFileSync(sourceP, destP, flags = 0) {
	    return this.baseFs.copyFileSync(this.mapToBase(sourceP), this.mapToBase(destP), flags);
	  }
	  async appendFilePromise(p, content, opts) {
	    return this.baseFs.appendFilePromise(this.fsMapToBase(p), content, opts);
	  }
	  appendFileSync(p, content, opts) {
	    return this.baseFs.appendFileSync(this.fsMapToBase(p), content, opts);
	  }
	  async writeFilePromise(p, content, opts) {
	    return this.baseFs.writeFilePromise(this.fsMapToBase(p), content, opts);
	  }
	  writeFileSync(p, content, opts) {
	    return this.baseFs.writeFileSync(this.fsMapToBase(p), content, opts);
	  }
	  async unlinkPromise(p) {
	    return this.baseFs.unlinkPromise(this.mapToBase(p));
	  }
	  unlinkSync(p) {
	    return this.baseFs.unlinkSync(this.mapToBase(p));
	  }
	  async utimesPromise(p, atime, mtime) {
	    return this.baseFs.utimesPromise(this.mapToBase(p), atime, mtime);
	  }
	  utimesSync(p, atime, mtime) {
	    return this.baseFs.utimesSync(this.mapToBase(p), atime, mtime);
	  }
	  async lutimesPromise(p, atime, mtime) {
	    return this.baseFs.lutimesPromise(this.mapToBase(p), atime, mtime);
	  }
	  lutimesSync(p, atime, mtime) {
	    return this.baseFs.lutimesSync(this.mapToBase(p), atime, mtime);
	  }
	  async mkdirPromise(p, opts) {
	    return this.baseFs.mkdirPromise(this.mapToBase(p), opts);
	  }
	  mkdirSync(p, opts) {
	    return this.baseFs.mkdirSync(this.mapToBase(p), opts);
	  }
	  async rmdirPromise(p, opts) {
	    return this.baseFs.rmdirPromise(this.mapToBase(p), opts);
	  }
	  rmdirSync(p, opts) {
	    return this.baseFs.rmdirSync(this.mapToBase(p), opts);
	  }
	  async rmPromise(p, opts) {
	    return this.baseFs.rmPromise(this.mapToBase(p), opts);
	  }
	  rmSync(p, opts) {
	    return this.baseFs.rmSync(this.mapToBase(p), opts);
	  }
	  async linkPromise(existingP, newP) {
	    return this.baseFs.linkPromise(this.mapToBase(existingP), this.mapToBase(newP));
	  }
	  linkSync(existingP, newP) {
	    return this.baseFs.linkSync(this.mapToBase(existingP), this.mapToBase(newP));
	  }
	  async symlinkPromise(target, p, type) {
	    const mappedP = this.mapToBase(p);
	    if (this.pathUtils.isAbsolute(target))
	      return this.baseFs.symlinkPromise(this.mapToBase(target), mappedP, type);
	    const mappedAbsoluteTarget = this.mapToBase(this.pathUtils.join(this.pathUtils.dirname(p), target));
	    const mappedTarget = this.baseFs.pathUtils.relative(this.baseFs.pathUtils.dirname(mappedP), mappedAbsoluteTarget);
	    return this.baseFs.symlinkPromise(mappedTarget, mappedP, type);
	  }
	  symlinkSync(target, p, type) {
	    const mappedP = this.mapToBase(p);
	    if (this.pathUtils.isAbsolute(target))
	      return this.baseFs.symlinkSync(this.mapToBase(target), mappedP, type);
	    const mappedAbsoluteTarget = this.mapToBase(this.pathUtils.join(this.pathUtils.dirname(p), target));
	    const mappedTarget = this.baseFs.pathUtils.relative(this.baseFs.pathUtils.dirname(mappedP), mappedAbsoluteTarget);
	    return this.baseFs.symlinkSync(mappedTarget, mappedP, type);
	  }
	  async readFilePromise(p, encoding) {
	    return this.baseFs.readFilePromise(this.fsMapToBase(p), encoding);
	  }
	  readFileSync(p, encoding) {
	    return this.baseFs.readFileSync(this.fsMapToBase(p), encoding);
	  }
	  readdirPromise(p, opts) {
	    return this.baseFs.readdirPromise(this.mapToBase(p), opts);
	  }
	  readdirSync(p, opts) {
	    return this.baseFs.readdirSync(this.mapToBase(p), opts);
	  }
	  async readlinkPromise(p) {
	    return this.mapFromBase(await this.baseFs.readlinkPromise(this.mapToBase(p)));
	  }
	  readlinkSync(p) {
	    return this.mapFromBase(this.baseFs.readlinkSync(this.mapToBase(p)));
	  }
	  async truncatePromise(p, len) {
	    return this.baseFs.truncatePromise(this.mapToBase(p), len);
	  }
	  truncateSync(p, len) {
	    return this.baseFs.truncateSync(this.mapToBase(p), len);
	  }
	  async ftruncatePromise(fd, len) {
	    return this.baseFs.ftruncatePromise(fd, len);
	  }
	  ftruncateSync(fd, len) {
	    return this.baseFs.ftruncateSync(fd, len);
	  }
	  watch(p, a, b) {
	    return this.baseFs.watch(
	      this.mapToBase(p),
	      // @ts-expect-error - reason TBS
	      a,
	      b
	    );
	  }
	  watchFile(p, a, b) {
	    return this.baseFs.watchFile(
	      this.mapToBase(p),
	      // @ts-expect-error - reason TBS
	      a,
	      b
	    );
	  }
	  unwatchFile(p, cb) {
	    return this.baseFs.unwatchFile(this.mapToBase(p), cb);
	  }
	  fsMapToBase(p) {
	    if (typeof p === `number`) {
	      return p;
	    } else {
	      return this.mapToBase(p);
	    }
	  }
	}

	function direntToPortable(dirent) {
	  const portableDirent = dirent;
	  if (typeof dirent.path === `string`)
	    portableDirent.path = npath.toPortablePath(dirent.path);
	  return portableDirent;
	}
	class NodeFS extends BasePortableFakeFS {
	  realFs;
	  constructor(realFs = fs__default.default) {
	    super();
	    this.realFs = realFs;
	  }
	  getExtractHint() {
	    return false;
	  }
	  getRealPath() {
	    return PortablePath.root;
	  }
	  resolve(p) {
	    return ppath.resolve(p);
	  }
	  async openPromise(p, flags, mode) {
	    return await new Promise((resolve, reject) => {
	      this.realFs.open(npath.fromPortablePath(p), flags, mode, this.makeCallback(resolve, reject));
	    });
	  }
	  openSync(p, flags, mode) {
	    return this.realFs.openSync(npath.fromPortablePath(p), flags, mode);
	  }
	  async opendirPromise(p, opts) {
	    return await new Promise((resolve, reject) => {
	      if (typeof opts !== `undefined`) {
	        this.realFs.opendir(npath.fromPortablePath(p), opts, this.makeCallback(resolve, reject));
	      } else {
	        this.realFs.opendir(npath.fromPortablePath(p), this.makeCallback(resolve, reject));
	      }
	    }).then((dir) => {
	      const dirWithFixedPath = dir;
	      Object.defineProperty(dirWithFixedPath, `path`, {
	        value: p,
	        configurable: true,
	        writable: true
	      });
	      return dirWithFixedPath;
	    });
	  }
	  opendirSync(p, opts) {
	    const dir = typeof opts !== `undefined` ? this.realFs.opendirSync(npath.fromPortablePath(p), opts) : this.realFs.opendirSync(npath.fromPortablePath(p));
	    const dirWithFixedPath = dir;
	    Object.defineProperty(dirWithFixedPath, `path`, {
	      value: p,
	      configurable: true,
	      writable: true
	    });
	    return dirWithFixedPath;
	  }
	  async readPromise(fd, buffer, offset = 0, length = 0, position = -1) {
	    return await new Promise((resolve, reject) => {
	      this.realFs.read(fd, buffer, offset, length, position, (error, bytesRead) => {
	        if (error) {
	          reject(error);
	        } else {
	          resolve(bytesRead);
	        }
	      });
	    });
	  }
	  readSync(fd, buffer, offset, length, position) {
	    return this.realFs.readSync(fd, buffer, offset, length, position);
	  }
	  async writePromise(fd, buffer, offset, length, position) {
	    return await new Promise((resolve, reject) => {
	      if (typeof buffer === `string`) {
	        return this.realFs.write(fd, buffer, offset, this.makeCallback(resolve, reject));
	      } else {
	        return this.realFs.write(fd, buffer, offset, length, position, this.makeCallback(resolve, reject));
	      }
	    });
	  }
	  writeSync(fd, buffer, offset, length, position) {
	    if (typeof buffer === `string`) {
	      return this.realFs.writeSync(fd, buffer, offset);
	    } else {
	      return this.realFs.writeSync(fd, buffer, offset, length, position);
	    }
	  }
	  async closePromise(fd) {
	    await new Promise((resolve, reject) => {
	      this.realFs.close(fd, this.makeCallback(resolve, reject));
	    });
	  }
	  closeSync(fd) {
	    this.realFs.closeSync(fd);
	  }
	  createReadStream(p, opts) {
	    const realPath = p !== null ? npath.fromPortablePath(p) : p;
	    return this.realFs.createReadStream(realPath, opts);
	  }
	  createWriteStream(p, opts) {
	    const realPath = p !== null ? npath.fromPortablePath(p) : p;
	    return this.realFs.createWriteStream(realPath, opts);
	  }
	  async realpathPromise(p) {
	    return await new Promise((resolve, reject) => {
	      this.realFs.realpath(npath.fromPortablePath(p), {}, this.makeCallback(resolve, reject));
	    }).then((path) => {
	      return npath.toPortablePath(path);
	    });
	  }
	  realpathSync(p) {
	    return npath.toPortablePath(this.realFs.realpathSync(npath.fromPortablePath(p), {}));
	  }
	  async existsPromise(p) {
	    return await new Promise((resolve) => {
	      this.realFs.exists(npath.fromPortablePath(p), resolve);
	    });
	  }
	  accessSync(p, mode) {
	    return this.realFs.accessSync(npath.fromPortablePath(p), mode);
	  }
	  async accessPromise(p, mode) {
	    return await new Promise((resolve, reject) => {
	      this.realFs.access(npath.fromPortablePath(p), mode, this.makeCallback(resolve, reject));
	    });
	  }
	  existsSync(p) {
	    return this.realFs.existsSync(npath.fromPortablePath(p));
	  }
	  async statPromise(p, opts) {
	    return await new Promise((resolve, reject) => {
	      if (opts) {
	        this.realFs.stat(npath.fromPortablePath(p), opts, this.makeCallback(resolve, reject));
	      } else {
	        this.realFs.stat(npath.fromPortablePath(p), this.makeCallback(resolve, reject));
	      }
	    });
	  }
	  statSync(p, opts) {
	    if (opts) {
	      return this.realFs.statSync(npath.fromPortablePath(p), opts);
	    } else {
	      return this.realFs.statSync(npath.fromPortablePath(p));
	    }
	  }
	  async fstatPromise(fd, opts) {
	    return await new Promise((resolve, reject) => {
	      if (opts) {
	        this.realFs.fstat(fd, opts, this.makeCallback(resolve, reject));
	      } else {
	        this.realFs.fstat(fd, this.makeCallback(resolve, reject));
	      }
	    });
	  }
	  fstatSync(fd, opts) {
	    if (opts) {
	      return this.realFs.fstatSync(fd, opts);
	    } else {
	      return this.realFs.fstatSync(fd);
	    }
	  }
	  async lstatPromise(p, opts) {
	    return await new Promise((resolve, reject) => {
	      if (opts) {
	        this.realFs.lstat(npath.fromPortablePath(p), opts, this.makeCallback(resolve, reject));
	      } else {
	        this.realFs.lstat(npath.fromPortablePath(p), this.makeCallback(resolve, reject));
	      }
	    });
	  }
	  lstatSync(p, opts) {
	    if (opts) {
	      return this.realFs.lstatSync(npath.fromPortablePath(p), opts);
	    } else {
	      return this.realFs.lstatSync(npath.fromPortablePath(p));
	    }
	  }
	  async fchmodPromise(fd, mask) {
	    return await new Promise((resolve, reject) => {
	      this.realFs.fchmod(fd, mask, this.makeCallback(resolve, reject));
	    });
	  }
	  fchmodSync(fd, mask) {
	    return this.realFs.fchmodSync(fd, mask);
	  }
	  async chmodPromise(p, mask) {
	    return await new Promise((resolve, reject) => {
	      this.realFs.chmod(npath.fromPortablePath(p), mask, this.makeCallback(resolve, reject));
	    });
	  }
	  chmodSync(p, mask) {
	    return this.realFs.chmodSync(npath.fromPortablePath(p), mask);
	  }
	  async fchownPromise(fd, uid, gid) {
	    return await new Promise((resolve, reject) => {
	      this.realFs.fchown(fd, uid, gid, this.makeCallback(resolve, reject));
	    });
	  }
	  fchownSync(fd, uid, gid) {
	    return this.realFs.fchownSync(fd, uid, gid);
	  }
	  async chownPromise(p, uid, gid) {
	    return await new Promise((resolve, reject) => {
	      this.realFs.chown(npath.fromPortablePath(p), uid, gid, this.makeCallback(resolve, reject));
	    });
	  }
	  chownSync(p, uid, gid) {
	    return this.realFs.chownSync(npath.fromPortablePath(p), uid, gid);
	  }
	  async renamePromise(oldP, newP) {
	    return await new Promise((resolve, reject) => {
	      this.realFs.rename(npath.fromPortablePath(oldP), npath.fromPortablePath(newP), this.makeCallback(resolve, reject));
	    });
	  }
	  renameSync(oldP, newP) {
	    return this.realFs.renameSync(npath.fromPortablePath(oldP), npath.fromPortablePath(newP));
	  }
	  async copyFilePromise(sourceP, destP, flags = 0) {
	    return await new Promise((resolve, reject) => {
	      this.realFs.copyFile(npath.fromPortablePath(sourceP), npath.fromPortablePath(destP), flags, this.makeCallback(resolve, reject));
	    });
	  }
	  copyFileSync(sourceP, destP, flags = 0) {
	    return this.realFs.copyFileSync(npath.fromPortablePath(sourceP), npath.fromPortablePath(destP), flags);
	  }
	  async appendFilePromise(p, content, opts) {
	    return await new Promise((resolve, reject) => {
	      const fsNativePath = typeof p === `string` ? npath.fromPortablePath(p) : p;
	      if (opts) {
	        this.realFs.appendFile(fsNativePath, content, opts, this.makeCallback(resolve, reject));
	      } else {
	        this.realFs.appendFile(fsNativePath, content, this.makeCallback(resolve, reject));
	      }
	    });
	  }
	  appendFileSync(p, content, opts) {
	    const fsNativePath = typeof p === `string` ? npath.fromPortablePath(p) : p;
	    if (opts) {
	      this.realFs.appendFileSync(fsNativePath, content, opts);
	    } else {
	      this.realFs.appendFileSync(fsNativePath, content);
	    }
	  }
	  async writeFilePromise(p, content, opts) {
	    return await new Promise((resolve, reject) => {
	      const fsNativePath = typeof p === `string` ? npath.fromPortablePath(p) : p;
	      if (opts) {
	        this.realFs.writeFile(fsNativePath, content, opts, this.makeCallback(resolve, reject));
	      } else {
	        this.realFs.writeFile(fsNativePath, content, this.makeCallback(resolve, reject));
	      }
	    });
	  }
	  writeFileSync(p, content, opts) {
	    const fsNativePath = typeof p === `string` ? npath.fromPortablePath(p) : p;
	    if (opts) {
	      this.realFs.writeFileSync(fsNativePath, content, opts);
	    } else {
	      this.realFs.writeFileSync(fsNativePath, content);
	    }
	  }
	  async unlinkPromise(p) {
	    return await new Promise((resolve, reject) => {
	      this.realFs.unlink(npath.fromPortablePath(p), this.makeCallback(resolve, reject));
	    });
	  }
	  unlinkSync(p) {
	    return this.realFs.unlinkSync(npath.fromPortablePath(p));
	  }
	  async utimesPromise(p, atime, mtime) {
	    return await new Promise((resolve, reject) => {
	      this.realFs.utimes(npath.fromPortablePath(p), atime, mtime, this.makeCallback(resolve, reject));
	    });
	  }
	  utimesSync(p, atime, mtime) {
	    this.realFs.utimesSync(npath.fromPortablePath(p), atime, mtime);
	  }
	  async lutimesPromise(p, atime, mtime) {
	    return await new Promise((resolve, reject) => {
	      this.realFs.lutimes(npath.fromPortablePath(p), atime, mtime, this.makeCallback(resolve, reject));
	    });
	  }
	  lutimesSync(p, atime, mtime) {
	    this.realFs.lutimesSync(npath.fromPortablePath(p), atime, mtime);
	  }
	  async mkdirPromise(p, opts) {
	    return await new Promise((resolve, reject) => {
	      this.realFs.mkdir(npath.fromPortablePath(p), opts, this.makeCallback(resolve, reject));
	    });
	  }
	  mkdirSync(p, opts) {
	    return this.realFs.mkdirSync(npath.fromPortablePath(p), opts);
	  }
	  async rmdirPromise(p, opts) {
	    return await new Promise((resolve, reject) => {
	      if (opts) {
	        this.realFs.rmdir(npath.fromPortablePath(p), opts, this.makeCallback(resolve, reject));
	      } else {
	        this.realFs.rmdir(npath.fromPortablePath(p), this.makeCallback(resolve, reject));
	      }
	    });
	  }
	  rmdirSync(p, opts) {
	    return this.realFs.rmdirSync(npath.fromPortablePath(p), opts);
	  }
	  async rmPromise(p, opts) {
	    return await new Promise((resolve, reject) => {
	      if (opts) {
	        this.realFs.rm(npath.fromPortablePath(p), opts, this.makeCallback(resolve, reject));
	      } else {
	        this.realFs.rm(npath.fromPortablePath(p), this.makeCallback(resolve, reject));
	      }
	    });
	  }
	  rmSync(p, opts) {
	    return this.realFs.rmSync(npath.fromPortablePath(p), opts);
	  }
	  async linkPromise(existingP, newP) {
	    return await new Promise((resolve, reject) => {
	      this.realFs.link(npath.fromPortablePath(existingP), npath.fromPortablePath(newP), this.makeCallback(resolve, reject));
	    });
	  }
	  linkSync(existingP, newP) {
	    return this.realFs.linkSync(npath.fromPortablePath(existingP), npath.fromPortablePath(newP));
	  }
	  async symlinkPromise(target, p, type) {
	    return await new Promise((resolve, reject) => {
	      this.realFs.symlink(npath.fromPortablePath(target.replace(/\/+$/, ``)), npath.fromPortablePath(p), type, this.makeCallback(resolve, reject));
	    });
	  }
	  symlinkSync(target, p, type) {
	    return this.realFs.symlinkSync(npath.fromPortablePath(target.replace(/\/+$/, ``)), npath.fromPortablePath(p), type);
	  }
	  async readFilePromise(p, encoding) {
	    return await new Promise((resolve, reject) => {
	      const fsNativePath = typeof p === `string` ? npath.fromPortablePath(p) : p;
	      this.realFs.readFile(fsNativePath, encoding, this.makeCallback(resolve, reject));
	    });
	  }
	  readFileSync(p, encoding) {
	    const fsNativePath = typeof p === `string` ? npath.fromPortablePath(p) : p;
	    return this.realFs.readFileSync(fsNativePath, encoding);
	  }
	  async readdirPromise(p, opts) {
	    return await new Promise((resolve, reject) => {
	      if (opts) {
	        if (opts.recursive && process.platform === `win32`) {
	          if (opts.withFileTypes) {
	            this.realFs.readdir(npath.fromPortablePath(p), opts, this.makeCallback((results) => resolve(results.map(direntToPortable)), reject));
	          } else {
	            this.realFs.readdir(npath.fromPortablePath(p), opts, this.makeCallback((results) => resolve(results.map(npath.toPortablePath)), reject));
	          }
	        } else {
	          this.realFs.readdir(npath.fromPortablePath(p), opts, this.makeCallback(resolve, reject));
	        }
	      } else {
	        this.realFs.readdir(npath.fromPortablePath(p), this.makeCallback(resolve, reject));
	      }
	    });
	  }
	  readdirSync(p, opts) {
	    if (opts) {
	      if (opts.recursive && process.platform === `win32`) {
	        if (opts.withFileTypes) {
	          return this.realFs.readdirSync(npath.fromPortablePath(p), opts).map(direntToPortable);
	        } else {
	          return this.realFs.readdirSync(npath.fromPortablePath(p), opts).map(npath.toPortablePath);
	        }
	      } else {
	        return this.realFs.readdirSync(npath.fromPortablePath(p), opts);
	      }
	    } else {
	      return this.realFs.readdirSync(npath.fromPortablePath(p));
	    }
	  }
	  async readlinkPromise(p) {
	    return await new Promise((resolve, reject) => {
	      this.realFs.readlink(npath.fromPortablePath(p), this.makeCallback(resolve, reject));
	    }).then((path) => {
	      return npath.toPortablePath(path);
	    });
	  }
	  readlinkSync(p) {
	    return npath.toPortablePath(this.realFs.readlinkSync(npath.fromPortablePath(p)));
	  }
	  async truncatePromise(p, len) {
	    return await new Promise((resolve, reject) => {
	      this.realFs.truncate(npath.fromPortablePath(p), len, this.makeCallback(resolve, reject));
	    });
	  }
	  truncateSync(p, len) {
	    return this.realFs.truncateSync(npath.fromPortablePath(p), len);
	  }
	  async ftruncatePromise(fd, len) {
	    return await new Promise((resolve, reject) => {
	      this.realFs.ftruncate(fd, len, this.makeCallback(resolve, reject));
	    });
	  }
	  ftruncateSync(fd, len) {
	    return this.realFs.ftruncateSync(fd, len);
	  }
	  watch(p, a, b) {
	    return this.realFs.watch(
	      npath.fromPortablePath(p),
	      // @ts-expect-error - reason TBS
	      a,
	      b
	    );
	  }
	  watchFile(p, a, b) {
	    return this.realFs.watchFile(
	      npath.fromPortablePath(p),
	      // @ts-expect-error - reason TBS
	      a,
	      b
	    );
	  }
	  unwatchFile(p, cb) {
	    return this.realFs.unwatchFile(npath.fromPortablePath(p), cb);
	  }
	  makeCallback(resolve, reject) {
	    return (err, result) => {
	      if (err) {
	        reject(err);
	      } else {
	        resolve(result);
	      }
	    };
	  }
	}

	const NUMBER_REGEXP = /^[0-9]+$/;
	const VIRTUAL_REGEXP = /^(\/(?:[^/]+\/)*?(?:\$\$virtual|__virtual__))((?:\/((?:[^/]+-)?[a-f0-9]+)(?:\/([^/]+))?)?((?:\/.*)?))$/;
	const VALID_COMPONENT = /^([^/]+-)?[a-f0-9]+$/;
	class VirtualFS extends ProxiedFS {
	  baseFs;
	  static makeVirtualPath(base, component, to) {
	    if (ppath.basename(base) !== `__virtual__`)
	      throw new Error(`Assertion failed: Virtual folders must be named "__virtual__"`);
	    if (!ppath.basename(component).match(VALID_COMPONENT))
	      throw new Error(`Assertion failed: Virtual components must be ended by an hexadecimal hash`);
	    const target = ppath.relative(ppath.dirname(base), to);
	    const segments = target.split(`/`);
	    let depth = 0;
	    while (depth < segments.length && segments[depth] === `..`)
	      depth += 1;
	    const finalSegments = segments.slice(depth);
	    const fullVirtualPath = ppath.join(base, component, String(depth), ...finalSegments);
	    return fullVirtualPath;
	  }
	  static resolveVirtual(p) {
	    const match = p.match(VIRTUAL_REGEXP);
	    if (!match || !match[3] && match[5])
	      return p;
	    const target = ppath.dirname(match[1]);
	    if (!match[3] || !match[4])
	      return target;
	    const isnum = NUMBER_REGEXP.test(match[4]);
	    if (!isnum)
	      return p;
	    const depth = Number(match[4]);
	    const backstep = `../`.repeat(depth);
	    const subpath = match[5] || `.`;
	    return VirtualFS.resolveVirtual(ppath.join(target, backstep, subpath));
	  }
	  constructor({ baseFs = new NodeFS() } = {}) {
	    super(ppath);
	    this.baseFs = baseFs;
	  }
	  getExtractHint(hints) {
	    return this.baseFs.getExtractHint(hints);
	  }
	  getRealPath() {
	    return this.baseFs.getRealPath();
	  }
	  realpathSync(p) {
	    const match = p.match(VIRTUAL_REGEXP);
	    if (!match)
	      return this.baseFs.realpathSync(p);
	    if (!match[5])
	      return p;
	    const realpath = this.baseFs.realpathSync(this.mapToBase(p));
	    return VirtualFS.makeVirtualPath(match[1], match[3], realpath);
	  }
	  async realpathPromise(p) {
	    const match = p.match(VIRTUAL_REGEXP);
	    if (!match)
	      return await this.baseFs.realpathPromise(p);
	    if (!match[5])
	      return p;
	    const realpath = await this.baseFs.realpathPromise(this.mapToBase(p));
	    return VirtualFS.makeVirtualPath(match[1], match[3], realpath);
	  }
	  mapToBase(p) {
	    if (p === ``)
	      return p;
	    if (this.pathUtils.isAbsolute(p))
	      return VirtualFS.resolveVirtual(p);
	    const resolvedRoot = VirtualFS.resolveVirtual(this.baseFs.resolve(PortablePath.dot));
	    const resolvedP = VirtualFS.resolveVirtual(this.baseFs.resolve(p));
	    return ppath.relative(resolvedRoot, resolvedP) || PortablePath.dot;
	  }
	  mapFromBase(p) {
	    return p;
	  }
	}

	const prettyJsonMachine = {
	  ["DEFAULT" /* DEFAULT */]: {
	    collapsed: false,
	    next: {
	      [`*`]: "DEFAULT" /* DEFAULT */
	    }
	  },
	  // {
	  //   "fallbackExclusionList": ...
	  // }
	  ["TOP_LEVEL" /* TOP_LEVEL */]: {
	    collapsed: false,
	    next: {
	      [`fallbackExclusionList`]: "FALLBACK_EXCLUSION_LIST" /* FALLBACK_EXCLUSION_LIST */,
	      [`packageRegistryData`]: "PACKAGE_REGISTRY_DATA" /* PACKAGE_REGISTRY_DATA */,
	      [`*`]: "DEFAULT" /* DEFAULT */
	    }
	  },
	  // "fallbackExclusionList": [
	  //   ...
	  // ]
	  ["FALLBACK_EXCLUSION_LIST" /* FALLBACK_EXCLUSION_LIST */]: {
	    collapsed: false,
	    next: {
	      [`*`]: "FALLBACK_EXCLUSION_ENTRIES" /* FALLBACK_EXCLUSION_ENTRIES */
	    }
	  },
	  // "fallbackExclusionList": [
	  //   [...]
	  // ]
	  ["FALLBACK_EXCLUSION_ENTRIES" /* FALLBACK_EXCLUSION_ENTRIES */]: {
	    collapsed: true,
	    next: {
	      [`*`]: "FALLBACK_EXCLUSION_DATA" /* FALLBACK_EXCLUSION_DATA */
	    }
	  },
	  // "fallbackExclusionList": [
	  //   [..., [...]]
	  // ]
	  ["FALLBACK_EXCLUSION_DATA" /* FALLBACK_EXCLUSION_DATA */]: {
	    collapsed: true,
	    next: {
	      [`*`]: "DEFAULT" /* DEFAULT */
	    }
	  },
	  // "packageRegistryData": [
	  //   ...
	  // ]
	  ["PACKAGE_REGISTRY_DATA" /* PACKAGE_REGISTRY_DATA */]: {
	    collapsed: false,
	    next: {
	      [`*`]: "PACKAGE_REGISTRY_ENTRIES" /* PACKAGE_REGISTRY_ENTRIES */
	    }
	  },
	  // "packageRegistryData": [
	  //   [...]
	  // ]
	  ["PACKAGE_REGISTRY_ENTRIES" /* PACKAGE_REGISTRY_ENTRIES */]: {
	    collapsed: true,
	    next: {
	      [`*`]: "PACKAGE_STORE_DATA" /* PACKAGE_STORE_DATA */
	    }
	  },
	  // "packageRegistryData": [
	  //   [..., [
	  //     ...
	  //   ]]
	  // ]
	  ["PACKAGE_STORE_DATA" /* PACKAGE_STORE_DATA */]: {
	    collapsed: false,
	    next: {
	      [`*`]: "PACKAGE_STORE_ENTRIES" /* PACKAGE_STORE_ENTRIES */
	    }
	  },
	  // "packageRegistryData": [
	  //   [..., [
	  //     [...]
	  //   ]]
	  // ]
	  ["PACKAGE_STORE_ENTRIES" /* PACKAGE_STORE_ENTRIES */]: {
	    collapsed: true,
	    next: {
	      [`*`]: "PACKAGE_INFORMATION_DATA" /* PACKAGE_INFORMATION_DATA */
	    }
	  },
	  // "packageRegistryData": [
	  //   [..., [
	  //     [..., {
	  //       ...
	  //     }]
	  //   ]]
	  // ]
	  ["PACKAGE_INFORMATION_DATA" /* PACKAGE_INFORMATION_DATA */]: {
	    collapsed: false,
	    next: {
	      [`packageDependencies`]: "PACKAGE_DEPENDENCIES" /* PACKAGE_DEPENDENCIES */,
	      [`*`]: "DEFAULT" /* DEFAULT */
	    }
	  },
	  // "packageRegistryData": [
	  //   [..., [
	  //     [..., {
	  //       "packagePeers": [
	  //         ...
	  //       ]
	  //     }]
	  //   ]]
	  // ]
	  ["PACKAGE_DEPENDENCIES" /* PACKAGE_DEPENDENCIES */]: {
	    collapsed: false,
	    next: {
	      [`*`]: "PACKAGE_DEPENDENCY" /* PACKAGE_DEPENDENCY */
	    }
	  },
	  // "packageRegistryData": [
	  //   [..., [
	  //     [..., {
	  //       "packageDependencies": [
	  //         [...]
	  //       ]
	  //     }]
	  //   ]]
	  // ]
	  ["PACKAGE_DEPENDENCY" /* PACKAGE_DEPENDENCY */]: {
	    collapsed: true,
	    next: {
	      [`*`]: "DEFAULT" /* DEFAULT */
	    }
	  }
	};
	function generateCollapsedArray(data, state, indent) {
	  let result = ``;
	  result += `[`;
	  for (let t = 0, T = data.length; t < T; ++t) {
	    result += generateNext(String(t), data[t], state, indent).replace(/^ +/g, ``);
	    if (t + 1 < T) {
	      result += `, `;
	    }
	  }
	  result += `]`;
	  return result;
	}
	function generateExpandedArray(data, state, indent) {
	  const nextIndent = `${indent}  `;
	  let result = ``;
	  result += indent;
	  result += `[
`;
	  for (let t = 0, T = data.length; t < T; ++t) {
	    result += nextIndent + generateNext(String(t), data[t], state, nextIndent).replace(/^ +/, ``);
	    if (t + 1 < T)
	      result += `,`;
	    result += `
`;
	  }
	  result += indent;
	  result += `]`;
	  return result;
	}
	function generateCollapsedObject(data, state, indent) {
	  const keys = Object.keys(data);
	  let result = ``;
	  result += `{`;
	  for (let t = 0, T = keys.length, keysPrinted = 0; t < T; ++t) {
	    const key = keys[t];
	    const value = data[key];
	    if (typeof value === `undefined`)
	      continue;
	    if (keysPrinted !== 0)
	      result += `, `;
	    result += JSON.stringify(key);
	    result += `: `;
	    result += generateNext(key, value, state, indent).replace(/^ +/g, ``);
	    keysPrinted += 1;
	  }
	  result += `}`;
	  return result;
	}
	function generateExpandedObject(data, state, indent) {
	  const keys = Object.keys(data);
	  const nextIndent = `${indent}  `;
	  let result = ``;
	  result += indent;
	  result += `{
`;
	  let keysPrinted = 0;
	  for (let t = 0, T = keys.length; t < T; ++t) {
	    const key = keys[t];
	    const value = data[key];
	    if (typeof value === `undefined`)
	      continue;
	    if (keysPrinted !== 0) {
	      result += `,`;
	      result += `
`;
	    }
	    result += nextIndent;
	    result += JSON.stringify(key);
	    result += `: `;
	    result += generateNext(key, value, state, nextIndent).replace(/^ +/g, ``);
	    keysPrinted += 1;
	  }
	  if (keysPrinted !== 0)
	    result += `
`;
	  result += indent;
	  result += `}`;
	  return result;
	}
	function generateNext(key, data, state, indent) {
	  const { next } = prettyJsonMachine[state];
	  const nextState = next[key] || next[`*`];
	  return generate(data, nextState, indent);
	}
	function generate(data, state, indent) {
	  const { collapsed } = prettyJsonMachine[state];
	  if (Array.isArray(data)) {
	    if (collapsed) {
	      return generateCollapsedArray(data, state, indent);
	    } else {
	      return generateExpandedArray(data, state, indent);
	    }
	  }
	  if (typeof data === `object` && data !== null) {
	    if (collapsed) {
	      return generateCollapsedObject(data, state, indent);
	    } else {
	      return generateExpandedObject(data, state, indent);
	    }
	  }
	  return JSON.stringify(data);
	}
	function generatePrettyJson(data) {
	  return generate(data, "TOP_LEVEL" /* TOP_LEVEL */, ``);
	}

	function sortMap(values, mappers) {
	  const asArray = Array.from(values);
	  if (!Array.isArray(mappers))
	    mappers = [mappers];
	  const stringified = [];
	  for (const mapper of mappers)
	    stringified.push(asArray.map((value) => mapper(value)));
	  const indices = asArray.map((_, index) => index);
	  indices.sort((a, b) => {
	    for (const layer of stringified) {
	      const comparison = layer[a] < layer[b] ? -1 : layer[a] > layer[b] ? 1 : 0;
	      if (comparison !== 0) {
	        return comparison;
	      }
	    }
	    return 0;
	  });
	  return indices.map((index) => {
	    return asArray[index];
	  });
	}
	function generateFallbackExclusionList(settings) {
	  const fallbackExclusionList = /* @__PURE__ */ new Map();
	  const sortedData = sortMap(settings.fallbackExclusionList || [], [
	    ({ name, reference }) => name,
	    ({ name, reference }) => reference
	  ]);
	  for (const { name, reference } of sortedData) {
	    let references = fallbackExclusionList.get(name);
	    if (typeof references === `undefined`)
	      fallbackExclusionList.set(name, references = /* @__PURE__ */ new Set());
	    references.add(reference);
	  }
	  return Array.from(fallbackExclusionList).map(([name, references]) => {
	    return [name, Array.from(references)];
	  });
	}
	function generateFallbackPoolData(settings) {
	  return sortMap(settings.fallbackPool || [], ([name]) => name);
	}
	function generatePackageRegistryData(settings) {
	  const packageRegistryData = [];
	  const topLevelPackageLocator = settings.dependencyTreeRoots.find((locator) => {
	    return settings.packageRegistry.get(locator.name)?.get(locator.reference)?.packageLocation === `./`;
	  });
	  for (const [packageName, packageStore] of sortMap(settings.packageRegistry, ([packageName2]) => packageName2 === null ? `0` : `1${packageName2}`)) {
	    if (packageName === null)
	      continue;
	    const packageStoreData = [];
	    packageRegistryData.push([packageName, packageStoreData]);
	    for (const [packageReference, { packageLocation, packageDependencies, packagePeers, linkType, discardFromLookup }] of sortMap(packageStore, ([packageReference2]) => packageReference2 === null ? `0` : `1${packageReference2}`)) {
	      if (packageReference === null)
	        continue;
	      const normalizedDependencies = [];
	      if (packageName !== null && packageReference !== null && !packageDependencies.has(packageName))
	        normalizedDependencies.push([packageName, packageReference]);
	      for (const [dependencyName, dependencyReference] of packageDependencies)
	        normalizedDependencies.push([dependencyName, dependencyReference]);
	      const sortedDependencies = sortMap(normalizedDependencies, ([dependencyName]) => dependencyName);
	      const normalizedPeers = packagePeers && packagePeers.size > 0 ? Array.from(packagePeers) : void 0;
	      const normalizedDiscardFromLookup = discardFromLookup ? discardFromLookup : void 0;
	      const packageData = {
	        packageLocation,
	        packageDependencies: sortedDependencies,
	        packagePeers: normalizedPeers,
	        linkType,
	        discardFromLookup: normalizedDiscardFromLookup
	      };
	      packageStoreData.push([packageReference, packageData]);
	      if (topLevelPackageLocator && packageName === topLevelPackageLocator.name && packageReference === topLevelPackageLocator.reference) {
	        packageRegistryData.unshift([null, [[null, packageData]]]);
	      }
	    }
	  }
	  return packageRegistryData;
	}
	function generateSerializedState(settings) {
	  return {
	    // @eslint-ignore-next-line @typescript-eslint/naming-convention
	    __info: [
	      `This file is automatically generated. Do not touch it, or risk`,
	      `your modifications being lost.`
	    ],
	    dependencyTreeRoots: settings.dependencyTreeRoots,
	    enableTopLevelFallback: settings.enableTopLevelFallback || false,
	    ignorePatternData: settings.ignorePattern || null,
	    pnpZipBackend: settings.pnpZipBackend,
	    fallbackExclusionList: generateFallbackExclusionList(settings),
	    fallbackPool: generateFallbackPoolData(settings),
	    packageRegistryData: generatePackageRegistryData(settings)
	  };
	}

	let hook$1;
	var hook_1 = () => {
	  if (typeof hook$1 === `undefined`)
	    hook$1 = require$$0__default.default.brotliDecompressSync(Buffer.from("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", "base64")).toString();
	  return hook$1;
	};

	function generateLoader(shebang, loader) {
	  return [
	    shebang ? `${shebang}
` : ``,
	    `/* eslint-disable */
`,
	    `// @ts-nocheck
`,
	    `"use strict";
`,
	    `
`,
	    loader,
	    `
`,
	    hook_1()
	  ].join(``);
	}
	function generateJsonString(data) {
	  return JSON.stringify(data, null, 2);
	}
	function generateStringLiteral(value) {
	  return `'${value.replace(/\\/g, `\\\\`).replace(/'/g, `\\'`).replace(/\n/g, `\\
`)}'`;
	}
	function generateInlinedSetup(data) {
	  return [
	    `const RAW_RUNTIME_STATE =
`,
	    `${generateStringLiteral(generatePrettyJson(data))};

`,
	    `function $$SETUP_STATE(hydrateRuntimeState, basePath) {
`,
	    `  return hydrateRuntimeState(JSON.parse(RAW_RUNTIME_STATE), {basePath: basePath || __dirname});
`,
	    `}
`
	  ].join(``);
	}
	function generateSplitSetup() {
	  return [
	    `function $$SETUP_STATE(hydrateRuntimeState, basePath) {
`,
	    `  const fs = require('fs');
`,
	    `  const path = require('path');
`,
	    `  const pnpDataFilepath = path.resolve(__dirname, ${JSON.stringify(Filename.pnpData)});
`,
	    `  return hydrateRuntimeState(JSON.parse(fs.readFileSync(pnpDataFilepath, 'utf8')), {basePath: basePath || __dirname});
`,
	    `}
`
	  ].join(``);
	}
	function generateInlinedScript(settings) {
	  const data = generateSerializedState(settings);
	  const setup = generateInlinedSetup(data);
	  const loaderFile = generateLoader(settings.shebang, setup);
	  return loaderFile;
	}
	function generateSplitScript(settings) {
	  const data = generateSerializedState(settings);
	  const setup = generateSplitSetup();
	  const loaderFile = generateLoader(settings.shebang, setup);
	  return { dataFile: generateJsonString(data), loaderFile };
	}

	function hydrateRuntimeState(data, { basePath }) {
	  const portablePath = npath.toPortablePath(basePath);
	  const absolutePortablePath = ppath.resolve(portablePath);
	  const ignorePattern = data.ignorePatternData !== null ? new RegExp(data.ignorePatternData) : null;
	  const packageLocatorsByLocations = /* @__PURE__ */ new Map();
	  const packageRegistry = new Map(data.packageRegistryData.map(([packageName, packageStoreData]) => {
	    return [packageName, new Map(packageStoreData.map(([packageReference, packageInformationData]) => {
	      if (packageName === null !== (packageReference === null))
	        throw new Error(`Assertion failed: The name and reference should be null, or neither should`);
	      const discardFromLookup = packageInformationData.discardFromLookup ?? false;
	      const packageLocator = { name: packageName, reference: packageReference };
	      const entry = packageLocatorsByLocations.get(packageInformationData.packageLocation);
	      if (!entry) {
	        packageLocatorsByLocations.set(packageInformationData.packageLocation, { locator: packageLocator, discardFromLookup });
	      } else {
	        entry.discardFromLookup = entry.discardFromLookup && discardFromLookup;
	        if (!discardFromLookup) {
	          entry.locator = packageLocator;
	        }
	      }
	      let resolvedPackageLocation = null;
	      return [packageReference, {
	        packageDependencies: new Map(packageInformationData.packageDependencies),
	        packagePeers: new Set(packageInformationData.packagePeers),
	        linkType: packageInformationData.linkType,
	        discardFromLookup,
	        // we only need this for packages that are used by the currently running script
	        // this is a lazy getter because `ppath.join` has some overhead
	        get packageLocation() {
	          return resolvedPackageLocation || (resolvedPackageLocation = ppath.join(absolutePortablePath, packageInformationData.packageLocation));
	        }
	      }];
	    }))];
	  }));
	  const fallbackExclusionList = new Map(data.fallbackExclusionList.map(([packageName, packageReferences]) => {
	    return [packageName, new Set(packageReferences)];
	  }));
	  const fallbackPool = new Map(data.fallbackPool);
	  const dependencyTreeRoots = data.dependencyTreeRoots;
	  const enableTopLevelFallback = data.enableTopLevelFallback;
	  return {
	    basePath: portablePath,
	    dependencyTreeRoots,
	    enableTopLevelFallback,
	    fallbackExclusionList,
	    pnpZipBackend: data.pnpZipBackend,
	    fallbackPool,
	    ignorePattern,
	    packageLocatorsByLocations,
	    packageRegistry
	  };
	}

	const ArrayIsArray = Array.isArray;
	const JSONStringify = JSON.stringify;
	const ObjectGetOwnPropertyNames = Object.getOwnPropertyNames;
	const ObjectPrototypeHasOwnProperty = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
	const RegExpPrototypeExec = (obj, string) => RegExp.prototype.exec.call(obj, string);
	const RegExpPrototypeSymbolReplace = (obj, ...rest) => RegExp.prototype[Symbol.replace].apply(obj, rest);
	const StringPrototypeEndsWith = (str, ...rest) => String.prototype.endsWith.apply(str, rest);
	const StringPrototypeIncludes = (str, ...rest) => String.prototype.includes.apply(str, rest);
	const StringPrototypeLastIndexOf = (str, ...rest) => String.prototype.lastIndexOf.apply(str, rest);
	const StringPrototypeIndexOf = (str, ...rest) => String.prototype.indexOf.apply(str, rest);
	const StringPrototypeReplace = (str, ...rest) => String.prototype.replace.apply(str, rest);
	const StringPrototypeSlice = (str, ...rest) => String.prototype.slice.apply(str, rest);
	const StringPrototypeStartsWith = (str, ...rest) => String.prototype.startsWith.apply(str, rest);
	const SafeMap = Map;
	const JSONParse = JSON.parse;

	function createErrorType(code, messageCreator, errorType) {
	  return class extends errorType {
	    constructor(...args) {
	      super(messageCreator(...args));
	      this.code = code;
	      this.name = `${errorType.name} [${code}]`;
	    }
	  };
	}
	const ERR_PACKAGE_IMPORT_NOT_DEFINED = createErrorType(
	  `ERR_PACKAGE_IMPORT_NOT_DEFINED`,
	  (specifier, packagePath, base) => {
	    return `Package import specifier "${specifier}" is not defined${packagePath ? ` in package ${packagePath}package.json` : ``} imported from ${base}`;
	  },
	  TypeError
	);
	const ERR_INVALID_MODULE_SPECIFIER = createErrorType(
	  `ERR_INVALID_MODULE_SPECIFIER`,
	  (request, reason, base = void 0) => {
	    return `Invalid module "${request}" ${reason}${base ? ` imported from ${base}` : ``}`;
	  },
	  TypeError
	);
	const ERR_INVALID_PACKAGE_TARGET = createErrorType(
	  `ERR_INVALID_PACKAGE_TARGET`,
	  (pkgPath, key, target, isImport = false, base = void 0) => {
	    const relError = typeof target === `string` && !isImport && target.length && !StringPrototypeStartsWith(target, `./`);
	    if (key === `.`) {
	      assert__default.default(isImport === false);
	      return `Invalid "exports" main target ${JSONStringify(target)} defined in the package config ${pkgPath}package.json${base ? ` imported from ${base}` : ``}${relError ? `; targets must start with "./"` : ``}`;
	    }
	    return `Invalid "${isImport ? `imports` : `exports`}" target ${JSONStringify(
	      target
	    )} defined for '${key}' in the package config ${pkgPath}package.json${base ? ` imported from ${base}` : ``}${relError ? `; targets must start with "./"` : ``}`;
	  },
	  Error
	);
	const ERR_INVALID_PACKAGE_CONFIG = createErrorType(
	  `ERR_INVALID_PACKAGE_CONFIG`,
	  (path, base, message) => {
	    return `Invalid package config ${path}${base ? ` while importing ${base}` : ``}${message ? `. ${message}` : ``}`;
	  },
	  Error
	);
	const ERR_PACKAGE_PATH_NOT_EXPORTED = createErrorType(
	  "ERR_PACKAGE_PATH_NOT_EXPORTED",
	  (pkgPath, subpath, base = void 0) => {
	    if (subpath === ".")
	      return `No "exports" main defined in ${pkgPath}package.json${base ? ` imported from ${base}` : ""}`;
	    return `Package subpath '${subpath}' is not defined by "exports" in ${pkgPath}package.json${base ? ` imported from ${base}` : ""}`;
	  },
	  Error
	);

	function filterOwnProperties(source, keys) {
	  const filtered = /* @__PURE__ */ Object.create(null);
	  for (let i = 0; i < keys.length; i++) {
	    const key = keys[i];
	    if (ObjectPrototypeHasOwnProperty(source, key)) {
	      filtered[key] = source[key];
	    }
	  }
	  return filtered;
	}

	const packageJSONCache = new SafeMap();
	function getPackageConfig(path, specifier, base, readFileSyncFn) {
	  const existing = packageJSONCache.get(path);
	  if (existing !== void 0) {
	    return existing;
	  }
	  const source = readFileSyncFn(path);
	  if (source === void 0) {
	    const packageConfig2 = {
	      pjsonPath: path,
	      exists: false,
	      main: void 0,
	      name: void 0,
	      type: "none",
	      exports: void 0,
	      imports: void 0
	    };
	    packageJSONCache.set(path, packageConfig2);
	    return packageConfig2;
	  }
	  let packageJSON;
	  try {
	    packageJSON = JSONParse(source);
	  } catch (error) {
	    throw new ERR_INVALID_PACKAGE_CONFIG(
	      path,
	      (base ? `"${specifier}" from ` : "") + url.fileURLToPath(base || specifier),
	      error.message
	    );
	  }
	  let { imports, main, name, type } = filterOwnProperties(packageJSON, [
	    "imports",
	    "main",
	    "name",
	    "type"
	  ]);
	  const exports = ObjectPrototypeHasOwnProperty(packageJSON, "exports") ? packageJSON.exports : void 0;
	  if (typeof imports !== "object" || imports === null) {
	    imports = void 0;
	  }
	  if (typeof main !== "string") {
	    main = void 0;
	  }
	  if (typeof name !== "string") {
	    name = void 0;
	  }
	  if (type !== "module" && type !== "commonjs") {
	    type = "none";
	  }
	  const packageConfig = {
	    pjsonPath: path,
	    exists: true,
	    main,
	    name,
	    type,
	    exports,
	    imports
	  };
	  packageJSONCache.set(path, packageConfig);
	  return packageConfig;
	}
	function getPackageScopeConfig(resolved, readFileSyncFn) {
	  let packageJSONUrl = new URL("./package.json", resolved);
	  while (true) {
	    const packageJSONPath2 = packageJSONUrl.pathname;
	    if (StringPrototypeEndsWith(packageJSONPath2, "node_modules/package.json")) {
	      break;
	    }
	    const packageConfig2 = getPackageConfig(
	      url.fileURLToPath(packageJSONUrl),
	      resolved,
	      void 0,
	      readFileSyncFn
	    );
	    if (packageConfig2.exists) {
	      return packageConfig2;
	    }
	    const lastPackageJSONUrl = packageJSONUrl;
	    packageJSONUrl = new URL("../package.json", packageJSONUrl);
	    if (packageJSONUrl.pathname === lastPackageJSONUrl.pathname) {
	      break;
	    }
	  }
	  const packageJSONPath = url.fileURLToPath(packageJSONUrl);
	  const packageConfig = {
	    pjsonPath: packageJSONPath,
	    exists: false,
	    main: void 0,
	    name: void 0,
	    type: "none",
	    exports: void 0,
	    imports: void 0
	  };
	  packageJSONCache.set(packageJSONPath, packageConfig);
	  return packageConfig;
	}

	/**
	  @license
	  Copyright Node.js contributors. All rights reserved.

	  Permission is hereby granted, free of charge, to any person obtaining a copy
	  of this software and associated documentation files (the "Software"), to
	  deal in the Software without restriction, including without limitation the
	  rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
	  sell copies of the Software, and to permit persons to whom the Software is
	  furnished to do so, subject to the following conditions:

	  The above copyright notice and this permission notice shall be included in
	  all copies or substantial portions of the Software.

	  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
	  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
	  IN THE SOFTWARE.
	*/
	function throwImportNotDefined(specifier, packageJSONUrl, base) {
	  throw new ERR_PACKAGE_IMPORT_NOT_DEFINED(
	    specifier,
	    packageJSONUrl && url.fileURLToPath(new URL(".", packageJSONUrl)),
	    url.fileURLToPath(base)
	  );
	}
	function throwInvalidSubpath(subpath, packageJSONUrl, internal, base) {
	  const reason = `request is not a valid subpath for the "${internal ? "imports" : "exports"}" resolution of ${url.fileURLToPath(packageJSONUrl)}`;
	  throw new ERR_INVALID_MODULE_SPECIFIER(
	    subpath,
	    reason,
	    base && url.fileURLToPath(base)
	  );
	}
	function throwInvalidPackageTarget(subpath, target, packageJSONUrl, internal, base) {
	  if (typeof target === "object" && target !== null) {
	    target = JSONStringify(target, null, "");
	  } else {
	    target = `${target}`;
	  }
	  throw new ERR_INVALID_PACKAGE_TARGET(
	    url.fileURLToPath(new URL(".", packageJSONUrl)),
	    subpath,
	    target,
	    internal,
	    base && url.fileURLToPath(base)
	  );
	}
	const invalidSegmentRegEx = /(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))(\\|\/|$)/i;
	const patternRegEx = /\*/g;
	function resolvePackageTargetString(target, subpath, match, packageJSONUrl, base, pattern, internal, conditions) {
	  if (subpath !== "" && !pattern && target[target.length - 1] !== "/")
	    throwInvalidPackageTarget(match, target, packageJSONUrl, internal, base);
	  if (!StringPrototypeStartsWith(target, "./")) {
	    if (internal && !StringPrototypeStartsWith(target, "../") && !StringPrototypeStartsWith(target, "/")) {
	      let isURL = false;
	      try {
	        new URL(target);
	        isURL = true;
	      } catch {
	      }
	      if (!isURL) {
	        const exportTarget = pattern ? RegExpPrototypeSymbolReplace(patternRegEx, target, () => subpath) : target + subpath;
	        return exportTarget;
	      }
	    }
	    throwInvalidPackageTarget(match, target, packageJSONUrl, internal, base);
	  }
	  if (RegExpPrototypeExec(
	    invalidSegmentRegEx,
	    StringPrototypeSlice(target, 2)
	  ) !== null)
	    throwInvalidPackageTarget(match, target, packageJSONUrl, internal, base);
	  const resolved = new URL(target, packageJSONUrl);
	  const resolvedPath = resolved.pathname;
	  const packagePath = new URL(".", packageJSONUrl).pathname;
	  if (!StringPrototypeStartsWith(resolvedPath, packagePath))
	    throwInvalidPackageTarget(match, target, packageJSONUrl, internal, base);
	  if (subpath === "") return resolved;
	  if (RegExpPrototypeExec(invalidSegmentRegEx, subpath) !== null) {
	    const request = pattern ? StringPrototypeReplace(match, "*", () => subpath) : match + subpath;
	    throwInvalidSubpath(request, packageJSONUrl, internal, base);
	  }
	  if (pattern) {
	    return new URL(
	      RegExpPrototypeSymbolReplace(patternRegEx, resolved.href, () => subpath)
	    );
	  }
	  return new URL(subpath, resolved);
	}
	function isArrayIndex(key) {
	  const keyNum = +key;
	  if (`${keyNum}` !== key) return false;
	  return keyNum >= 0 && keyNum < 4294967295;
	}
	function resolvePackageTarget(packageJSONUrl, target, subpath, packageSubpath, base, pattern, internal, conditions) {
	  if (typeof target === "string") {
	    return resolvePackageTargetString(
	      target,
	      subpath,
	      packageSubpath,
	      packageJSONUrl,
	      base,
	      pattern,
	      internal);
	  } else if (ArrayIsArray(target)) {
	    if (target.length === 0) {
	      return null;
	    }
	    let lastException;
	    for (let i = 0; i < target.length; i++) {
	      const targetItem = target[i];
	      let resolveResult;
	      try {
	        resolveResult = resolvePackageTarget(
	          packageJSONUrl,
	          targetItem,
	          subpath,
	          packageSubpath,
	          base,
	          pattern,
	          internal,
	          conditions
	        );
	      } catch (e) {
	        lastException = e;
	        if (e.code === "ERR_INVALID_PACKAGE_TARGET") {
	          continue;
	        }
	        throw e;
	      }
	      if (resolveResult === void 0) {
	        continue;
	      }
	      if (resolveResult === null) {
	        lastException = null;
	        continue;
	      }
	      return resolveResult;
	    }
	    if (lastException === void 0 || lastException === null)
	      return lastException;
	    throw lastException;
	  } else if (typeof target === "object" && target !== null) {
	    const keys = ObjectGetOwnPropertyNames(target);
	    for (let i = 0; i < keys.length; i++) {
	      const key = keys[i];
	      if (isArrayIndex(key)) {
	        throw new ERR_INVALID_PACKAGE_CONFIG(
	          url.fileURLToPath(packageJSONUrl),
	          base,
	          '"exports" cannot contain numeric property keys.'
	        );
	      }
	    }
	    for (let i = 0; i < keys.length; i++) {
	      const key = keys[i];
	      if (key === "default" || conditions.has(key)) {
	        const conditionalTarget = target[key];
	        const resolveResult = resolvePackageTarget(
	          packageJSONUrl,
	          conditionalTarget,
	          subpath,
	          packageSubpath,
	          base,
	          pattern,
	          internal,
	          conditions
	        );
	        if (resolveResult === void 0) continue;
	        return resolveResult;
	      }
	    }
	    return void 0;
	  } else if (target === null) {
	    return null;
	  }
	  throwInvalidPackageTarget(
	    packageSubpath,
	    target,
	    packageJSONUrl,
	    internal,
	    base
	  );
	}
	function patternKeyCompare(a, b) {
	  const aPatternIndex = StringPrototypeIndexOf(a, "*");
	  const bPatternIndex = StringPrototypeIndexOf(b, "*");
	  const baseLenA = aPatternIndex === -1 ? a.length : aPatternIndex + 1;
	  const baseLenB = bPatternIndex === -1 ? b.length : bPatternIndex + 1;
	  if (baseLenA > baseLenB) return -1;
	  if (baseLenB > baseLenA) return 1;
	  if (aPatternIndex === -1) return 1;
	  if (bPatternIndex === -1) return -1;
	  if (a.length > b.length) return -1;
	  if (b.length > a.length) return 1;
	  return 0;
	}
	function isConditionalExportsMainSugar(exports, packageJSONUrl, base) {
	  if (typeof exports === "string" || ArrayIsArray(exports)) return true;
	  if (typeof exports !== "object" || exports === null) return false;
	  const keys = ObjectGetOwnPropertyNames(exports);
	  let isConditionalSugar = false;
	  let i = 0;
	  for (let j = 0; j < keys.length; j++) {
	    const key = keys[j];
	    const curIsConditionalSugar = key === "" || key[0] !== ".";
	    if (i++ === 0) {
	      isConditionalSugar = curIsConditionalSugar;
	    } else if (isConditionalSugar !== curIsConditionalSugar) {
	      throw new ERR_INVALID_PACKAGE_CONFIG(
	        url.fileURLToPath(packageJSONUrl),
	        base,
	        `"exports" cannot contain some keys starting with '.' and some not. The exports object must either be an object of package subpath keys or an object of main entry condition name keys only.`
	      );
	    }
	  }
	  return isConditionalSugar;
	}
	function throwExportsNotFound(subpath, packageJSONUrl, base) {
	  throw new ERR_PACKAGE_PATH_NOT_EXPORTED(
	    url.fileURLToPath(new URL(".", packageJSONUrl)),
	    subpath,
	    base && url.fileURLToPath(base)
	  );
	}
	const emittedPackageWarnings = /* @__PURE__ */ new Set();
	function emitTrailingSlashPatternDeprecation(match, pjsonUrl, base) {
	  const pjsonPath = url.fileURLToPath(pjsonUrl);
	  if (emittedPackageWarnings.has(pjsonPath + "|" + match)) return;
	  emittedPackageWarnings.add(pjsonPath + "|" + match);
	  process.emitWarning(
	    `Use of deprecated trailing slash pattern mapping "${match}" in the "exports" field module resolution of the package at ${pjsonPath}${base ? ` imported from ${url.fileURLToPath(base)}` : ""}. Mapping specifiers ending in "/" is no longer supported.`,
	    "DeprecationWarning",
	    "DEP0155"
	  );
	}
	function packageExportsResolve({
	  packageJSONUrl,
	  packageSubpath,
	  exports,
	  base,
	  conditions
	}) {
	  if (isConditionalExportsMainSugar(exports, packageJSONUrl, base))
	    exports = { ".": exports };
	  if (ObjectPrototypeHasOwnProperty(exports, packageSubpath) && !StringPrototypeIncludes(packageSubpath, "*") && !StringPrototypeEndsWith(packageSubpath, "/")) {
	    const target = exports[packageSubpath];
	    const resolveResult = resolvePackageTarget(
	      packageJSONUrl,
	      target,
	      "",
	      packageSubpath,
	      base,
	      false,
	      false,
	      conditions
	    );
	    if (resolveResult == null) {
	      throwExportsNotFound(packageSubpath, packageJSONUrl, base);
	    }
	    return resolveResult;
	  }
	  let bestMatch = "";
	  let bestMatchSubpath;
	  const keys = ObjectGetOwnPropertyNames(exports);
	  for (let i = 0; i < keys.length; i++) {
	    const key = keys[i];
	    const patternIndex = StringPrototypeIndexOf(key, "*");
	    if (patternIndex !== -1 && StringPrototypeStartsWith(
	      packageSubpath,
	      StringPrototypeSlice(key, 0, patternIndex)
	    )) {
	      if (StringPrototypeEndsWith(packageSubpath, "/"))
	        emitTrailingSlashPatternDeprecation(
	          packageSubpath,
	          packageJSONUrl,
	          base
	        );
	      const patternTrailer = StringPrototypeSlice(key, patternIndex + 1);
	      if (packageSubpath.length >= key.length && StringPrototypeEndsWith(packageSubpath, patternTrailer) && patternKeyCompare(bestMatch, key) === 1 && StringPrototypeLastIndexOf(key, "*") === patternIndex) {
	        bestMatch = key;
	        bestMatchSubpath = StringPrototypeSlice(
	          packageSubpath,
	          patternIndex,
	          packageSubpath.length - patternTrailer.length
	        );
	      }
	    }
	  }
	  if (bestMatch) {
	    const target = exports[bestMatch];
	    const resolveResult = resolvePackageTarget(
	      packageJSONUrl,
	      target,
	      bestMatchSubpath,
	      bestMatch,
	      base,
	      true,
	      false,
	      conditions
	    );
	    if (resolveResult == null) {
	      throwExportsNotFound(packageSubpath, packageJSONUrl, base);
	    }
	    return resolveResult;
	  }
	  throwExportsNotFound(packageSubpath, packageJSONUrl, base);
	}
	function packageImportsResolve({ name, base, conditions, readFileSyncFn }) {
	  if (name === "#" || StringPrototypeStartsWith(name, "#/") || StringPrototypeEndsWith(name, "/")) {
	    const reason = "is not a valid internal imports specifier name";
	    throw new ERR_INVALID_MODULE_SPECIFIER(name, reason, url.fileURLToPath(base));
	  }
	  let packageJSONUrl;
	  const packageConfig = getPackageScopeConfig(base, readFileSyncFn);
	  if (packageConfig.exists) {
	    packageJSONUrl = url.pathToFileURL(packageConfig.pjsonPath);
	    const imports = packageConfig.imports;
	    if (imports) {
	      if (ObjectPrototypeHasOwnProperty(imports, name) && !StringPrototypeIncludes(name, "*")) {
	        const resolveResult = resolvePackageTarget(
	          packageJSONUrl,
	          imports[name],
	          "",
	          name,
	          base,
	          false,
	          true,
	          conditions
	        );
	        if (resolveResult != null) {
	          return resolveResult;
	        }
	      } else {
	        let bestMatch = "";
	        let bestMatchSubpath;
	        const keys = ObjectGetOwnPropertyNames(imports);
	        for (let i = 0; i < keys.length; i++) {
	          const key = keys[i];
	          const patternIndex = StringPrototypeIndexOf(key, "*");
	          if (patternIndex !== -1 && StringPrototypeStartsWith(
	            name,
	            StringPrototypeSlice(key, 0, patternIndex)
	          )) {
	            const patternTrailer = StringPrototypeSlice(key, patternIndex + 1);
	            if (name.length >= key.length && StringPrototypeEndsWith(name, patternTrailer) && patternKeyCompare(bestMatch, key) === 1 && StringPrototypeLastIndexOf(key, "*") === patternIndex) {
	              bestMatch = key;
	              bestMatchSubpath = StringPrototypeSlice(
	                name,
	                patternIndex,
	                name.length - patternTrailer.length
	              );
	            }
	          }
	        }
	        if (bestMatch) {
	          const target = imports[bestMatch];
	          const resolveResult = resolvePackageTarget(
	            packageJSONUrl,
	            target,
	            bestMatchSubpath,
	            bestMatch,
	            base,
	            true,
	            true,
	            conditions
	          );
	          if (resolveResult != null) {
	            return resolveResult;
	          }
	        }
	      }
	    }
	  }
	  throwImportNotDefined(name, packageJSONUrl, base);
	}

	var ErrorCode = /* @__PURE__ */ ((ErrorCode2) => {
	  ErrorCode2["API_ERROR"] = `API_ERROR`;
	  ErrorCode2["BUILTIN_NODE_RESOLUTION_FAILED"] = `BUILTIN_NODE_RESOLUTION_FAILED`;
	  ErrorCode2["EXPORTS_RESOLUTION_FAILED"] = `EXPORTS_RESOLUTION_FAILED`;
	  ErrorCode2["MISSING_DEPENDENCY"] = `MISSING_DEPENDENCY`;
	  ErrorCode2["MISSING_PEER_DEPENDENCY"] = `MISSING_PEER_DEPENDENCY`;
	  ErrorCode2["QUALIFIED_PATH_RESOLUTION_FAILED"] = `QUALIFIED_PATH_RESOLUTION_FAILED`;
	  ErrorCode2["INTERNAL"] = `INTERNAL`;
	  ErrorCode2["UNDECLARED_DEPENDENCY"] = `UNDECLARED_DEPENDENCY`;
	  ErrorCode2["UNSUPPORTED"] = `UNSUPPORTED`;
	  return ErrorCode2;
	})(ErrorCode || {});
	const MODULE_NOT_FOUND_ERRORS = /* @__PURE__ */ new Set([
	  "BUILTIN_NODE_RESOLUTION_FAILED" /* BUILTIN_NODE_RESOLUTION_FAILED */,
	  "MISSING_DEPENDENCY" /* MISSING_DEPENDENCY */,
	  "MISSING_PEER_DEPENDENCY" /* MISSING_PEER_DEPENDENCY */,
	  "QUALIFIED_PATH_RESOLUTION_FAILED" /* QUALIFIED_PATH_RESOLUTION_FAILED */,
	  "UNDECLARED_DEPENDENCY" /* UNDECLARED_DEPENDENCY */
	]);
	function makeError(pnpCode, message, data = {}, code) {
	  code ??= MODULE_NOT_FOUND_ERRORS.has(pnpCode) ? `MODULE_NOT_FOUND` : pnpCode;
	  const propertySpec = {
	    configurable: true,
	    writable: true,
	    enumerable: false
	  };
	  return Object.defineProperties(new Error(message), {
	    code: {
	      ...propertySpec,
	      value: code
	    },
	    pnpCode: {
	      ...propertySpec,
	      value: pnpCode
	    },
	    data: {
	      ...propertySpec,
	      value: data
	    }
	  });
	}
	function getPathForDisplay(p) {
	  return npath.normalize(npath.fromPortablePath(p));
	}

	const flagSymbol = Symbol('arg flag');

	class ArgError extends Error {
		constructor(msg, code) {
			super(msg);
			this.name = 'ArgError';
			this.code = code;

			Object.setPrototypeOf(this, ArgError.prototype);
		}
	}

	function arg(
		opts,
		{
			argv = process.argv.slice(2),
			permissive = false,
			stopAtPositional = false
		} = {}
	) {
		if (!opts) {
			throw new ArgError(
				'argument specification object is required',
				'ARG_CONFIG_NO_SPEC'
			);
		}

		const result = { _: [] };

		const aliases = {};
		const handlers = {};

		for (const key of Object.keys(opts)) {
			if (!key) {
				throw new ArgError(
					'argument key cannot be an empty string',
					'ARG_CONFIG_EMPTY_KEY'
				);
			}

			if (key[0] !== '-') {
				throw new ArgError(
					`argument key must start with '-' but found: '${key}'`,
					'ARG_CONFIG_NONOPT_KEY'
				);
			}

			if (key.length === 1) {
				throw new ArgError(
					`argument key must have a name; singular '-' keys are not allowed: ${key}`,
					'ARG_CONFIG_NONAME_KEY'
				);
			}

			if (typeof opts[key] === 'string') {
				aliases[key] = opts[key];
				continue;
			}

			let type = opts[key];
			let isFlag = false;

			if (
				Array.isArray(type) &&
				type.length === 1 &&
				typeof type[0] === 'function'
			) {
				const [fn] = type;
				type = (value, name, prev = []) => {
					prev.push(fn(value, name, prev[prev.length - 1]));
					return prev;
				};
				isFlag = fn === Boolean || fn[flagSymbol] === true;
			} else if (typeof type === 'function') {
				isFlag = type === Boolean || type[flagSymbol] === true;
			} else {
				throw new ArgError(
					`type missing or not a function or valid array type: ${key}`,
					'ARG_CONFIG_VAD_TYPE'
				);
			}

			if (key[1] !== '-' && key.length > 2) {
				throw new ArgError(
					`short argument keys (with a single hyphen) must have only one character: ${key}`,
					'ARG_CONFIG_SHORTOPT_TOOLONG'
				);
			}

			handlers[key] = [type, isFlag];
		}

		for (let i = 0, len = argv.length; i < len; i++) {
			const wholeArg = argv[i];

			if (stopAtPositional && result._.length > 0) {
				result._ = result._.concat(argv.slice(i));
				break;
			}

			if (wholeArg === '--') {
				result._ = result._.concat(argv.slice(i + 1));
				break;
			}

			if (wholeArg.length > 1 && wholeArg[0] === '-') {
				/* eslint-disable operator-linebreak */
				const separatedArguments =
					wholeArg[1] === '-' || wholeArg.length === 2
						? [wholeArg]
						: wholeArg
								.slice(1)
								.split('')
								.map((a) => `-${a}`);
				/* eslint-enable operator-linebreak */

				for (let j = 0; j < separatedArguments.length; j++) {
					const arg = separatedArguments[j];
					const [originalArgName, argStr] =
						arg[1] === '-' ? arg.split(/=(.*)/, 2) : [arg, undefined];

					let argName = originalArgName;
					while (argName in aliases) {
						argName = aliases[argName];
					}

					if (!(argName in handlers)) {
						if (permissive) {
							result._.push(arg);
							continue;
						} else {
							throw new ArgError(
								`unknown or unexpected option: ${originalArgName}`,
								'ARG_UNKNOWN_OPTION'
							);
						}
					}

					const [type, isFlag] = handlers[argName];

					if (!isFlag && j + 1 < separatedArguments.length) {
						throw new ArgError(
							`option requires argument (but was followed by another short argument): ${originalArgName}`,
							'ARG_MISSING_REQUIRED_SHORTARG'
						);
					}

					if (isFlag) {
						result[argName] = type(true, argName, result[argName]);
					} else if (argStr === undefined) {
						if (
							argv.length < i + 2 ||
							(argv[i + 1].length > 1 &&
								argv[i + 1][0] === '-' &&
								!(
									argv[i + 1].match(/^-?\d*(\.(?=\d))?\d*$/) &&
									(type === Number ||
										// eslint-disable-next-line no-undef
										(typeof BigInt !== 'undefined' && type === BigInt))
								))
						) {
							const extended =
								originalArgName === argName ? '' : ` (alias for ${argName})`;
							throw new ArgError(
								`option requires argument: ${originalArgName}${extended}`,
								'ARG_MISSING_REQUIRED_LONGARG'
							);
						}

						result[argName] = type(argv[i + 1], argName, result[argName]);
						++i;
					} else {
						result[argName] = type(argStr, argName, result[argName]);
					}
				}
			} else {
				result._.push(wholeArg);
			}
		}

		return result;
	}

	arg.flag = (fn) => {
		fn[flagSymbol] = true;
		return fn;
	};

	// Utility types
	arg.COUNT = arg.flag((v, name, existingCount) => (existingCount || 0) + 1);

	// Expose error class
	arg.ArgError = ArgError;

	var arg_1 = arg;

	/**
	  @license
	  The MIT License (MIT)

	  Copyright (c) 2014 Blake Embrey (hello@blakeembrey.com)

	  Permission is hereby granted, free of charge, to any person obtaining a copy
	  of this software and associated documentation files (the "Software"), to deal
	  in the Software without restriction, including without limitation the rights
	  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	  copies of the Software, and to permit persons to whom the Software is
	  furnished to do so, subject to the following conditions:

	  The above copyright notice and this permission notice shall be included in
	  all copies or substantial portions of the Software.

	  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	  THE SOFTWARE.
	*/
	function getOptionValue(opt) {
	  parseOptions();
	  return options[opt];
	}
	let options;
	function parseOptions() {
	  if (!options) {
	    options = {
	      "--conditions": [],
	      ...parseArgv(getNodeOptionsEnvArgv()),
	      ...parseArgv(process.execArgv)
	    };
	  }
	}
	function parseArgv(argv) {
	  return arg_1(
	    {
	      "--conditions": [String],
	      "-C": "--conditions"
	    },
	    {
	      argv,
	      permissive: true
	    }
	  );
	}
	function getNodeOptionsEnvArgv() {
	  const errors = [];
	  const envArgv = ParseNodeOptionsEnvVar(process.env.NODE_OPTIONS || "", errors);
	  if (errors.length !== 0) ;
	  return envArgv;
	}
	function ParseNodeOptionsEnvVar(node_options, errors) {
	  const env_argv = [];
	  let is_in_string = false;
	  let will_start_new_arg = true;
	  for (let index = 0; index < node_options.length; ++index) {
	    let c = node_options[index];
	    if (c === "\\" && is_in_string) {
	      if (index + 1 === node_options.length) {
	        errors.push("invalid value for NODE_OPTIONS (invalid escape)\n");
	        return env_argv;
	      } else {
	        c = node_options[++index];
	      }
	    } else if (c === " " && !is_in_string) {
	      will_start_new_arg = true;
	      continue;
	    } else if (c === '"') {
	      is_in_string = !is_in_string;
	      continue;
	    }
	    if (will_start_new_arg) {
	      env_argv.push(c);
	      will_start_new_arg = false;
	    } else {
	      env_argv[env_argv.length - 1] += c;
	    }
	  }
	  if (is_in_string) {
	    errors.push("invalid value for NODE_OPTIONS (unterminated string)\n");
	  }
	  return env_argv;
	}

	const [major, minor] = process.versions.node.split(`.`).map((value) => parseInt(value, 10));
	const WATCH_MODE_MESSAGE_USES_ARRAYS = major > 19 || major === 19 && minor >= 2 || major === 18 && minor >= 13;

	function reportRequiredFilesToWatchMode(paths) {
	  if (process.env.WATCH_REPORT_DEPENDENCIES && process.send) {
	    const files = paths.map((filename) => npath.fromPortablePath(VirtualFS.resolveVirtual(filename)));
	    if (WATCH_MODE_MESSAGE_USES_ARRAYS) {
	      process.send({ "watch:require": files });
	    } else {
	      for (const filename of files) {
	        process.send({ "watch:require": filename });
	      }
	    }
	  }
	}

	function makeApi(runtimeState, opts) {
	  const alwaysWarnOnFallback = Number(process.env.PNP_ALWAYS_WARN_ON_FALLBACK) > 0;
	  const debugLevel = Number(process.env.PNP_DEBUG_LEVEL);
	  const pathRegExp = /^(?![a-zA-Z]:[\\/]|\\\\|\.{0,2}(?:\/|$))((?:node:)?(?:@[^/]+\/)?[^/]+)\/*(.*|)$/;
	  const isStrictRegExp = /^(\/|\.{1,2}(\/|$))/;
	  const isDirRegExp = /\/$/;
	  const isRelativeRegexp = /^\.{0,2}\//;
	  const topLevelLocator = { name: null, reference: null };
	  const fallbackLocators = [];
	  const emittedWarnings = /* @__PURE__ */ new Set();
	  if (runtimeState.enableTopLevelFallback === true)
	    fallbackLocators.push(topLevelLocator);
	  if (opts.compatibilityMode !== false) {
	    for (const name of [`react-scripts`, `gatsby`]) {
	      const packageStore = runtimeState.packageRegistry.get(name);
	      if (packageStore) {
	        for (const reference of packageStore.keys()) {
	          if (reference === null) {
	            throw new Error(`Assertion failed: This reference shouldn't be null`);
	          } else {
	            fallbackLocators.push({ name, reference });
	          }
	        }
	      }
	    }
	  }
	  const {
	    ignorePattern,
	    packageRegistry,
	    packageLocatorsByLocations
	  } = runtimeState;
	  function makeLogEntry(name, args) {
	    return {
	      fn: name,
	      args,
	      error: null,
	      result: null
	    };
	  }
	  function trace(entry) {
	    const colors = process.stderr?.hasColors?.() ?? process.stdout.isTTY;
	    const c = (n, str) => `\x1B[${n}m${str}\x1B[0m`;
	    const error = entry.error;
	    if (error)
	      console.error(c(`31;1`, `\u2716 ${entry.error?.message.replace(/\n.*/s, ``)}`));
	    else
	      console.error(c(`33;1`, `\u203C Resolution`));
	    if (entry.args.length > 0)
	      console.error();
	    for (const arg of entry.args)
	      console.error(`  ${c(`37;1`, `In \u2190`)} ${nodeUtils.inspect(arg, { colors, compact: true })}`);
	    if (entry.result) {
	      console.error();
	      console.error(`  ${c(`37;1`, `Out \u2192`)} ${nodeUtils.inspect(entry.result, { colors, compact: true })}`);
	    }
	    const stack = new Error().stack.match(/(?<=^ +)at.*/gm)?.slice(2) ?? [];
	    if (stack.length > 0) {
	      console.error();
	      for (const line of stack) {
	        console.error(`  ${c(`38;5;244`, line)}`);
	      }
	    }
	    console.error();
	  }
	  function maybeLog(name, fn) {
	    if (opts.allowDebug === false)
	      return fn;
	    if (Number.isFinite(debugLevel)) {
	      if (debugLevel >= 2) {
	        return (...args) => {
	          const logEntry = makeLogEntry(name, args);
	          try {
	            return logEntry.result = fn(...args);
	          } catch (error) {
	            throw logEntry.error = error;
	          } finally {
	            trace(logEntry);
	          }
	        };
	      } else if (debugLevel >= 1) {
	        return (...args) => {
	          try {
	            return fn(...args);
	          } catch (error) {
	            const logEntry = makeLogEntry(name, args);
	            logEntry.error = error;
	            trace(logEntry);
	            throw error;
	          }
	        };
	      }
	    }
	    return fn;
	  }
	  function getPackageInformationSafe(packageLocator) {
	    const packageInformation = getPackageInformation(packageLocator);
	    if (!packageInformation) {
	      throw makeError(
	        ErrorCode.INTERNAL,
	        `Couldn't find a matching entry in the dependency tree for the specified parent (this is probably an internal error)`
	      );
	    }
	    return packageInformation;
	  }
	  function isDependencyTreeRoot(packageLocator) {
	    if (packageLocator.name === null)
	      return true;
	    for (const dependencyTreeRoot of runtimeState.dependencyTreeRoots)
	      if (dependencyTreeRoot.name === packageLocator.name && dependencyTreeRoot.reference === packageLocator.reference)
	        return true;
	    return false;
	  }
	  const defaultExportsConditions = /* @__PURE__ */ new Set([
	    `node`,
	    `require`,
	    ...getOptionValue(`--conditions`)
	  ]);
	  function applyNodeExportsResolution(unqualifiedPath, conditions = defaultExportsConditions, issuer) {
	    const locator = findPackageLocator(ppath.join(unqualifiedPath, `internal.js`), {
	      resolveIgnored: true,
	      includeDiscardFromLookup: true
	    });
	    if (locator === null) {
	      throw makeError(
	        ErrorCode.INTERNAL,
	        `The locator that owns the "${unqualifiedPath}" path can't be found inside the dependency tree (this is probably an internal error)`
	      );
	    }
	    const { packageLocation } = getPackageInformationSafe(locator);
	    const manifestPath = ppath.join(packageLocation, Filename.manifest);
	    if (!opts.fakeFs.existsSync(manifestPath))
	      return null;
	    const pkgJson = JSON.parse(opts.fakeFs.readFileSync(manifestPath, `utf8`));
	    if (pkgJson.exports == null)
	      return null;
	    let subpath = ppath.contains(packageLocation, unqualifiedPath);
	    if (subpath === null) {
	      throw makeError(
	        ErrorCode.INTERNAL,
	        `unqualifiedPath doesn't contain the packageLocation (this is probably an internal error)`
	      );
	    }
	    if (subpath !== `.` && !isRelativeRegexp.test(subpath))
	      subpath = `./${subpath}`;
	    try {
	      const resolvedExport = packageExportsResolve({
	        packageJSONUrl: url.pathToFileURL(npath.fromPortablePath(manifestPath)),
	        packageSubpath: subpath,
	        exports: pkgJson.exports,
	        base: issuer ? url.pathToFileURL(npath.fromPortablePath(issuer)) : null,
	        conditions
	      });
	      return npath.toPortablePath(url.fileURLToPath(resolvedExport));
	    } catch (error) {
	      throw makeError(
	        ErrorCode.EXPORTS_RESOLUTION_FAILED,
	        error.message,
	        { unqualifiedPath: getPathForDisplay(unqualifiedPath), locator, pkgJson, subpath: getPathForDisplay(subpath), conditions },
	        error.code
	      );
	    }
	  }
	  function applyNodeExtensionResolution(unqualifiedPath, candidates, { extensions }) {
	    let stat;
	    try {
	      candidates.push(unqualifiedPath);
	      stat = opts.fakeFs.statSync(unqualifiedPath);
	    } catch {
	    }
	    if (stat && !stat.isDirectory())
	      return opts.fakeFs.realpathSync(unqualifiedPath);
	    if (stat && stat.isDirectory()) {
	      let pkgJson;
	      try {
	        pkgJson = JSON.parse(opts.fakeFs.readFileSync(ppath.join(unqualifiedPath, Filename.manifest), `utf8`));
	      } catch {
	      }
	      let nextUnqualifiedPath;
	      if (pkgJson && pkgJson.main)
	        nextUnqualifiedPath = ppath.resolve(unqualifiedPath, pkgJson.main);
	      if (nextUnqualifiedPath && nextUnqualifiedPath !== unqualifiedPath) {
	        const resolution = applyNodeExtensionResolution(nextUnqualifiedPath, candidates, { extensions });
	        if (resolution !== null) {
	          return resolution;
	        }
	      }
	    }
	    for (let i = 0, length = extensions.length; i < length; i++) {
	      const candidateFile = `${unqualifiedPath}${extensions[i]}`;
	      candidates.push(candidateFile);
	      if (opts.fakeFs.existsSync(candidateFile)) {
	        return candidateFile;
	      }
	    }
	    if (stat && stat.isDirectory()) {
	      for (let i = 0, length = extensions.length; i < length; i++) {
	        const candidateFile = ppath.format({ dir: unqualifiedPath, name: `index`, ext: extensions[i] });
	        candidates.push(candidateFile);
	        if (opts.fakeFs.existsSync(candidateFile)) {
	          return candidateFile;
	        }
	      }
	    }
	    return null;
	  }
	  function makeFakeModule(path) {
	    const fakeModule = new module$1.Module(path, null);
	    fakeModule.filename = path;
	    fakeModule.paths = module$1.Module._nodeModulePaths(path);
	    return fakeModule;
	  }
	  function callNativeResolution(request, issuer) {
	    if (issuer.endsWith(`/`))
	      issuer = ppath.join(issuer, `internal.js`);
	    return module$1.Module._resolveFilename(npath.fromPortablePath(request), makeFakeModule(npath.fromPortablePath(issuer)), false, { plugnplay: false });
	  }
	  function isPathIgnored(path) {
	    if (ignorePattern === null)
	      return false;
	    const subPath = ppath.contains(runtimeState.basePath, path);
	    if (subPath === null)
	      return false;
	    if (ignorePattern.test(subPath.replace(/\/$/, ``))) {
	      return true;
	    } else {
	      return false;
	    }
	  }
	  const VERSIONS = { std: 3, resolveVirtual: 1, getAllLocators: 1 };
	  const topLevel = topLevelLocator;
	  function getPackageInformation({ name, reference }) {
	    const packageInformationStore = packageRegistry.get(name);
	    if (!packageInformationStore)
	      return null;
	    const packageInformation = packageInformationStore.get(reference);
	    if (!packageInformation)
	      return null;
	    return packageInformation;
	  }
	  function findPackageDependents({ name, reference }) {
	    const dependents = [];
	    for (const [dependentName, packageInformationStore] of packageRegistry) {
	      if (dependentName === null)
	        continue;
	      for (const [dependentReference, packageInformation] of packageInformationStore) {
	        if (dependentReference === null)
	          continue;
	        const dependencyReference = packageInformation.packageDependencies.get(name);
	        if (dependencyReference !== reference)
	          continue;
	        if (dependentName === name && dependentReference === reference)
	          continue;
	        dependents.push({
	          name: dependentName,
	          reference: dependentReference
	        });
	      }
	    }
	    return dependents;
	  }
	  function findBrokenPeerDependencies(dependency, initialPackage) {
	    const brokenPackages = /* @__PURE__ */ new Map();
	    const alreadyVisited = /* @__PURE__ */ new Set();
	    const traversal = (currentPackage) => {
	      const identifier = JSON.stringify(currentPackage.name);
	      if (alreadyVisited.has(identifier))
	        return;
	      alreadyVisited.add(identifier);
	      const dependents = findPackageDependents(currentPackage);
	      for (const dependent of dependents) {
	        const dependentInformation = getPackageInformationSafe(dependent);
	        if (dependentInformation.packagePeers.has(dependency)) {
	          traversal(dependent);
	        } else {
	          let brokenSet = brokenPackages.get(dependent.name);
	          if (typeof brokenSet === `undefined`)
	            brokenPackages.set(dependent.name, brokenSet = /* @__PURE__ */ new Set());
	          brokenSet.add(dependent.reference);
	        }
	      }
	    };
	    traversal(initialPackage);
	    const brokenList = [];
	    for (const name of [...brokenPackages.keys()].sort())
	      for (const reference of [...brokenPackages.get(name)].sort())
	        brokenList.push({ name, reference });
	    return brokenList;
	  }
	  function findPackageLocator(location, { resolveIgnored = false, includeDiscardFromLookup = false } = {}) {
	    if (isPathIgnored(location) && !resolveIgnored)
	      return null;
	    let relativeLocation = ppath.relative(runtimeState.basePath, location);
	    if (!relativeLocation.match(isStrictRegExp))
	      relativeLocation = `./${relativeLocation}`;
	    if (!relativeLocation.endsWith(`/`))
	      relativeLocation = `${relativeLocation}/`;
	    do {
	      const entry = packageLocatorsByLocations.get(relativeLocation);
	      if (typeof entry === `undefined` || entry.discardFromLookup && !includeDiscardFromLookup) {
	        relativeLocation = relativeLocation.substring(0, relativeLocation.lastIndexOf(`/`, relativeLocation.length - 2) + 1);
	        continue;
	      }
	      return entry.locator;
	    } while (relativeLocation !== ``);
	    return null;
	  }
	  function tryReadFile(filePath) {
	    try {
	      return opts.fakeFs.readFileSync(npath.toPortablePath(filePath), `utf8`);
	    } catch (err) {
	      if (err.code === `ENOENT`)
	        return void 0;
	      throw err;
	    }
	  }
	  function resolveToUnqualified(request, issuer, { considerBuiltins = true } = {}) {
	    if (request.startsWith(`#`))
	      throw new Error(`resolveToUnqualified can not handle private import mappings`);
	    if (request === `pnpapi`)
	      return npath.toPortablePath(opts.pnpapiResolution);
	    if (considerBuiltins && module$1.isBuiltin(request))
	      return null;
	    const requestForDisplay = getPathForDisplay(request);
	    const issuerForDisplay = issuer && getPathForDisplay(issuer);
	    if (issuer && isPathIgnored(issuer)) {
	      if (!ppath.isAbsolute(request) || findPackageLocator(request) === null) {
	        const result = callNativeResolution(request, issuer);
	        if (result === false) {
	          throw makeError(
	            ErrorCode.BUILTIN_NODE_RESOLUTION_FAILED,
	            `The builtin node resolution algorithm was unable to resolve the requested module (it didn't go through the pnp resolver because the issuer was explicitely ignored by the regexp)

Require request: "${requestForDisplay}"
Required by: ${issuerForDisplay}
`,
	            { request: requestForDisplay, issuer: issuerForDisplay }
	          );
	        }
	        return npath.toPortablePath(result);
	      }
	    }
	    let unqualifiedPath;
	    const dependencyNameMatch = request.match(pathRegExp);
	    if (!dependencyNameMatch) {
	      if (ppath.isAbsolute(request)) {
	        unqualifiedPath = ppath.normalize(request);
	      } else {
	        if (!issuer) {
	          throw makeError(
	            ErrorCode.API_ERROR,
	            `The resolveToUnqualified function must be called with a valid issuer when the path isn't a builtin nor absolute`,
	            { request: requestForDisplay, issuer: issuerForDisplay }
	          );
	        }
	        const absoluteIssuer = ppath.resolve(issuer);
	        if (issuer.match(isDirRegExp)) {
	          unqualifiedPath = ppath.normalize(ppath.join(absoluteIssuer, request));
	        } else {
	          unqualifiedPath = ppath.normalize(ppath.join(ppath.dirname(absoluteIssuer), request));
	        }
	      }
	    } else {
	      if (!issuer) {
	        throw makeError(
	          ErrorCode.API_ERROR,
	          `The resolveToUnqualified function must be called with a valid issuer when the path isn't a builtin nor absolute`,
	          { request: requestForDisplay, issuer: issuerForDisplay }
	        );
	      }
	      const [, dependencyName, subPath] = dependencyNameMatch;
	      const issuerLocator = findPackageLocator(issuer);
	      if (!issuerLocator) {
	        const result = callNativeResolution(request, issuer);
	        if (result === false) {
	          throw makeError(
	            ErrorCode.BUILTIN_NODE_RESOLUTION_FAILED,
	            `The builtin node resolution algorithm was unable to resolve the requested module (it didn't go through the pnp resolver because the issuer doesn't seem to be part of the Yarn-managed dependency tree).

Require path: "${requestForDisplay}"
Required by: ${issuerForDisplay}
`,
	            { request: requestForDisplay, issuer: issuerForDisplay }
	          );
	        }
	        return npath.toPortablePath(result);
	      }
	      const issuerInformation = getPackageInformationSafe(issuerLocator);
	      let dependencyReference = issuerInformation.packageDependencies.get(dependencyName);
	      let fallbackReference = null;
	      if (dependencyReference == null) {
	        if (issuerLocator.name !== null) {
	          const exclusionEntry = runtimeState.fallbackExclusionList.get(issuerLocator.name);
	          const canUseFallbacks = !exclusionEntry || !exclusionEntry.has(issuerLocator.reference);
	          if (canUseFallbacks) {
	            for (let t = 0, T = fallbackLocators.length; t < T; ++t) {
	              const fallbackInformation = getPackageInformationSafe(fallbackLocators[t]);
	              const reference = fallbackInformation.packageDependencies.get(dependencyName);
	              if (reference == null)
	                continue;
	              if (alwaysWarnOnFallback)
	                fallbackReference = reference;
	              else
	                dependencyReference = reference;
	              break;
	            }
	            if (runtimeState.enableTopLevelFallback) {
	              if (dependencyReference == null && fallbackReference === null) {
	                const reference = runtimeState.fallbackPool.get(dependencyName);
	                if (reference != null) {
	                  fallbackReference = reference;
	                }
	              }
	            }
	          }
	        }
	      }
	      let error = null;
	      if (dependencyReference === null) {
	        if (isDependencyTreeRoot(issuerLocator)) {
	          error = makeError(
	            ErrorCode.MISSING_PEER_DEPENDENCY,
	            `Your application tried to access ${dependencyName} (a peer dependency); this isn't allowed as there is no ancestor to satisfy the requirement. Use a devDependency if needed.

Required package: ${dependencyName}${dependencyName !== requestForDisplay ? ` (via "${requestForDisplay}")` : ``}
Required by: ${issuerForDisplay}
`,
	            { request: requestForDisplay, issuer: issuerForDisplay, dependencyName }
	          );
	        } else {
	          const brokenAncestors = findBrokenPeerDependencies(dependencyName, issuerLocator);
	          if (brokenAncestors.every((ancestor) => isDependencyTreeRoot(ancestor))) {
	            error = makeError(
	              ErrorCode.MISSING_PEER_DEPENDENCY,
	              `${issuerLocator.name} tried to access ${dependencyName} (a peer dependency) but it isn't provided by your application; this makes the require call ambiguous and unsound.

Required package: ${dependencyName}${dependencyName !== requestForDisplay ? ` (via "${requestForDisplay}")` : ``}
Required by: ${issuerLocator.name}@${issuerLocator.reference} (via ${issuerForDisplay})
${brokenAncestors.map((ancestorLocator) => `Ancestor breaking the chain: ${ancestorLocator.name}@${ancestorLocator.reference}
`).join(``)}
`,
	              { request: requestForDisplay, issuer: issuerForDisplay, issuerLocator: Object.assign({}, issuerLocator), dependencyName, brokenAncestors }
	            );
	          } else {
	            error = makeError(
	              ErrorCode.MISSING_PEER_DEPENDENCY,
	              `${issuerLocator.name} tried to access ${dependencyName} (a peer dependency) but it isn't provided by its ancestors; this makes the require call ambiguous and unsound.

Required package: ${dependencyName}${dependencyName !== requestForDisplay ? ` (via "${requestForDisplay}")` : ``}
Required by: ${issuerLocator.name}@${issuerLocator.reference} (via ${issuerForDisplay})

${brokenAncestors.map((ancestorLocator) => `Ancestor breaking the chain: ${ancestorLocator.name}@${ancestorLocator.reference}
`).join(``)}
`,
	              { request: requestForDisplay, issuer: issuerForDisplay, issuerLocator: Object.assign({}, issuerLocator), dependencyName, brokenAncestors }
	            );
	          }
	        }
	      } else if (dependencyReference === void 0) {
	        if (!considerBuiltins && module$1.isBuiltin(request)) {
	          if (isDependencyTreeRoot(issuerLocator)) {
	            error = makeError(
	              ErrorCode.UNDECLARED_DEPENDENCY,
	              `Your application tried to access ${dependencyName}. While this module is usually interpreted as a Node builtin, your resolver is running inside a non-Node resolution context where such builtins are ignored. Since ${dependencyName} isn't otherwise declared in your dependencies, this makes the require call ambiguous and unsound.

Required package: ${dependencyName}${dependencyName !== requestForDisplay ? ` (via "${requestForDisplay}")` : ``}
Required by: ${issuerForDisplay}
`,
	              { request: requestForDisplay, issuer: issuerForDisplay, dependencyName }
	            );
	          } else {
	            error = makeError(
	              ErrorCode.UNDECLARED_DEPENDENCY,
	              `${issuerLocator.name} tried to access ${dependencyName}. While this module is usually interpreted as a Node builtin, your resolver is running inside a non-Node resolution context where such builtins are ignored. Since ${dependencyName} isn't otherwise declared in ${issuerLocator.name}'s dependencies, this makes the require call ambiguous and unsound.

Required package: ${dependencyName}${dependencyName !== requestForDisplay ? ` (via "${requestForDisplay}")` : ``}
Required by: ${issuerForDisplay}
`,
	              { request: requestForDisplay, issuer: issuerForDisplay, issuerLocator: Object.assign({}, issuerLocator), dependencyName }
	            );
	          }
	        } else {
	          if (isDependencyTreeRoot(issuerLocator)) {
	            error = makeError(
	              ErrorCode.UNDECLARED_DEPENDENCY,
	              `Your application tried to access ${dependencyName}, but it isn't declared in your dependencies; this makes the require call ambiguous and unsound.

Required package: ${dependencyName}${dependencyName !== requestForDisplay ? ` (via "${requestForDisplay}")` : ``}
Required by: ${issuerForDisplay}
`,
	              { request: requestForDisplay, issuer: issuerForDisplay, dependencyName }
	            );
	          } else {
	            error = makeError(
	              ErrorCode.UNDECLARED_DEPENDENCY,
	              `${issuerLocator.name} tried to access ${dependencyName}, but it isn't declared in its dependencies; this makes the require call ambiguous and unsound.

Required package: ${dependencyName}${dependencyName !== requestForDisplay ? ` (via "${requestForDisplay}")` : ``}
Required by: ${issuerLocator.name}@${issuerLocator.reference} (via ${issuerForDisplay})
`,
	              { request: requestForDisplay, issuer: issuerForDisplay, issuerLocator: Object.assign({}, issuerLocator), dependencyName }
	            );
	          }
	        }
	      }
	      if (dependencyReference == null) {
	        if (fallbackReference === null || error === null)
	          throw error || new Error(`Assertion failed: Expected an error to have been set`);
	        dependencyReference = fallbackReference;
	        const message = error.message.replace(/\n.*/g, ``);
	        error.message = message;
	        if (!emittedWarnings.has(message) && debugLevel !== 0) {
	          emittedWarnings.add(message);
	          process.emitWarning(error);
	        }
	      }
	      const dependencyLocator = Array.isArray(dependencyReference) ? { name: dependencyReference[0], reference: dependencyReference[1] } : { name: dependencyName, reference: dependencyReference };
	      const dependencyInformation = getPackageInformationSafe(dependencyLocator);
	      if (!dependencyInformation.packageLocation) {
	        throw makeError(
	          ErrorCode.MISSING_DEPENDENCY,
	          `A dependency seems valid but didn't get installed for some reason. This might be caused by a partial install, such as dev vs prod.

Required package: ${dependencyLocator.name}@${dependencyLocator.reference}${dependencyLocator.name !== requestForDisplay ? ` (via "${requestForDisplay}")` : ``}
Required by: ${issuerLocator.name}@${issuerLocator.reference} (via ${issuerForDisplay})
`,
	          { request: requestForDisplay, issuer: issuerForDisplay, dependencyLocator: Object.assign({}, dependencyLocator) }
	        );
	      }
	      const dependencyLocation = dependencyInformation.packageLocation;
	      if (subPath) {
	        unqualifiedPath = ppath.join(dependencyLocation, subPath);
	      } else {
	        unqualifiedPath = dependencyLocation;
	      }
	    }
	    return ppath.normalize(unqualifiedPath);
	  }
	  function resolveUnqualifiedExport(request, unqualifiedPath, conditions = defaultExportsConditions, issuer) {
	    if (isStrictRegExp.test(request))
	      return unqualifiedPath;
	    const unqualifiedExportPath = applyNodeExportsResolution(unqualifiedPath, conditions, issuer);
	    if (unqualifiedExportPath) {
	      return ppath.normalize(unqualifiedExportPath);
	    } else {
	      return unqualifiedPath;
	    }
	  }
	  function resolveUnqualified(unqualifiedPath, { extensions = Object.keys(module$1.Module._extensions) } = {}) {
	    const candidates = [];
	    const qualifiedPath = applyNodeExtensionResolution(unqualifiedPath, candidates, { extensions });
	    if (qualifiedPath) {
	      reportRequiredFilesToWatchMode([qualifiedPath]);
	      return ppath.normalize(qualifiedPath);
	    } else {
	      reportRequiredFilesToWatchMode(candidates);
	      const unqualifiedPathForDisplay = getPathForDisplay(unqualifiedPath);
	      const containingPackage = findPackageLocator(unqualifiedPath);
	      if (containingPackage) {
	        const { packageLocation } = getPackageInformationSafe(containingPackage);
	        let exists = true;
	        try {
	          opts.fakeFs.accessSync(packageLocation);
	        } catch (err) {
	          if (err?.code === `ENOENT`) {
	            exists = false;
	          } else {
	            const readableError = (err?.message ?? err ?? `empty exception thrown`).replace(/^[A-Z]/, ($0) => $0.toLowerCase());
	            throw makeError(ErrorCode.QUALIFIED_PATH_RESOLUTION_FAILED, `Required package exists but could not be accessed (${readableError}).

Missing package: ${containingPackage.name}@${containingPackage.reference}
Expected package location: ${getPathForDisplay(packageLocation)}
`, { unqualifiedPath: unqualifiedPathForDisplay, extensions });
	          }
	        }
	        if (!exists) {
	          const errorMessage = packageLocation.includes(`/unplugged/`) ? `Required unplugged package missing from disk. This may happen when switching branches without running installs (unplugged packages must be fully materialized on disk to work).` : `Required package missing from disk. If you keep your packages inside your repository then restarting the Node process may be enough. Otherwise, try to run an install first.`;
	          throw makeError(
	            ErrorCode.QUALIFIED_PATH_RESOLUTION_FAILED,
	            `${errorMessage}

Missing package: ${containingPackage.name}@${containingPackage.reference}
Expected package location: ${getPathForDisplay(packageLocation)}
`,
	            { unqualifiedPath: unqualifiedPathForDisplay, extensions }
	          );
	        }
	      }
	      throw makeError(
	        ErrorCode.QUALIFIED_PATH_RESOLUTION_FAILED,
	        `Qualified path resolution failed: we looked for the following paths, but none could be accessed.

Source path: ${unqualifiedPathForDisplay}
${candidates.map((candidate) => `Not found: ${getPathForDisplay(candidate)}
`).join(``)}`,
	        { unqualifiedPath: unqualifiedPathForDisplay, extensions }
	      );
	    }
	  }
	  function resolvePrivateRequest(request, issuer, opts2) {
	    if (!issuer)
	      throw new Error(`Assertion failed: An issuer is required to resolve private import mappings`);
	    const resolved = packageImportsResolve({
	      name: request,
	      base: url.pathToFileURL(npath.fromPortablePath(issuer)),
	      conditions: opts2.conditions ?? defaultExportsConditions,
	      readFileSyncFn: tryReadFile
	    });
	    if (resolved instanceof URL) {
	      return resolveUnqualified(npath.toPortablePath(url.fileURLToPath(resolved)), { extensions: opts2.extensions });
	    } else {
	      if (resolved.startsWith(`#`))
	        throw new Error(`Mapping from one private import to another isn't allowed`);
	      return resolveRequest(resolved, issuer, opts2);
	    }
	  }
	  function resolveRequest(request, issuer, opts2 = {}) {
	    try {
	      if (request.startsWith(`#`))
	        return resolvePrivateRequest(request, issuer, opts2);
	      const { considerBuiltins, extensions, conditions } = opts2;
	      const unqualifiedPath = resolveToUnqualified(request, issuer, { considerBuiltins });
	      if (request === `pnpapi`)
	        return unqualifiedPath;
	      if (unqualifiedPath === null)
	        return null;
	      const isIssuerIgnored = () => issuer !== null ? isPathIgnored(issuer) : false;
	      const remappedPath = (!considerBuiltins || !module$1.isBuiltin(request)) && !isIssuerIgnored() ? resolveUnqualifiedExport(request, unqualifiedPath, conditions, issuer) : unqualifiedPath;
	      return resolveUnqualified(remappedPath, { extensions });
	    } catch (error) {
	      if (Object.hasOwn(error, `pnpCode`))
	        Object.assign(error.data, { request: getPathForDisplay(request), issuer: issuer && getPathForDisplay(issuer) });
	      throw error;
	    }
	  }
	  function resolveVirtual(request) {
	    const normalized = ppath.normalize(request);
	    const resolved = VirtualFS.resolveVirtual(normalized);
	    return resolved !== normalized ? resolved : null;
	  }
	  return {
	    VERSIONS,
	    topLevel,
	    getLocator: (name, referencish) => {
	      if (Array.isArray(referencish)) {
	        return { name: referencish[0], reference: referencish[1] };
	      } else {
	        return { name, reference: referencish };
	      }
	    },
	    getDependencyTreeRoots: () => {
	      return [...runtimeState.dependencyTreeRoots];
	    },
	    getAllLocators() {
	      const locators = [];
	      for (const [name, entry] of packageRegistry)
	        for (const reference of entry.keys())
	          if (name !== null && reference !== null)
	            locators.push({ name, reference });
	      return locators;
	    },
	    getPackageInformation: (locator) => {
	      const info = getPackageInformation(locator);
	      if (info === null)
	        return null;
	      const packageLocation = npath.fromPortablePath(info.packageLocation);
	      const nativeInfo = { ...info, packageLocation };
	      return nativeInfo;
	    },
	    findPackageLocator: (path) => {
	      return findPackageLocator(npath.toPortablePath(path));
	    },
	    resolveToUnqualified: maybeLog(`resolveToUnqualified`, (request, issuer, opts2) => {
	      const portableIssuer = issuer !== null ? npath.toPortablePath(issuer) : null;
	      const resolution = resolveToUnqualified(npath.toPortablePath(request), portableIssuer, opts2);
	      if (resolution === null)
	        return null;
	      return npath.fromPortablePath(resolution);
	    }),
	    resolveUnqualified: maybeLog(`resolveUnqualified`, (unqualifiedPath, opts2) => {
	      return npath.fromPortablePath(resolveUnqualified(npath.toPortablePath(unqualifiedPath), opts2));
	    }),
	    resolveRequest: maybeLog(`resolveRequest`, (request, issuer, opts2) => {
	      const portableIssuer = issuer !== null ? npath.toPortablePath(issuer) : null;
	      const resolution = resolveRequest(npath.toPortablePath(request), portableIssuer, opts2);
	      if (resolution === null)
	        return null;
	      return npath.fromPortablePath(resolution);
	    }),
	    resolveVirtual: maybeLog(`resolveVirtual`, (path) => {
	      const result = resolveVirtual(npath.toPortablePath(path));
	      if (result !== null) {
	        return npath.fromPortablePath(result);
	      } else {
	        return null;
	      }
	    })
	  };
	}

	async function hydratePnpFile(location, { fakeFs, pnpapiResolution }) {
	  const source = await fakeFs.readFilePromise(location, `utf8`);
	  return hydratePnpSource(source, {
	    basePath: path.dirname(location),
	    fakeFs,
	    pnpapiResolution
	  });
	}
	function hydratePnpSource(source, { basePath, fakeFs, pnpapiResolution }) {
	  const data = JSON.parse(source);
	  const runtimeState = hydrateRuntimeState(data, {
	    basePath
	  });
	  return makeApi(runtimeState, {
	    compatibilityMode: true,
	    fakeFs,
	    pnpapiResolution
	  });
	}

	const makeRuntimeApi = (settings, basePath, fakeFs) => {
	  const data = generateSerializedState(settings);
	  const state = hydrateRuntimeState(data, { basePath });
	  const pnpapiResolution = npath.join(basePath, Filename.pnpCjs);
	  return makeApi(state, { fakeFs, pnpapiResolution });
	};

	let hook;
	var builtLoader = () => {
	  if (typeof hook === `undefined`)
	    hook = require$$0__default.default.brotliDecompressSync(Buffer.from("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", "base64")).toString();
	  return hook;
	};

	lib.LinkType = LinkType;
	lib.generateInlinedScript = generateInlinedScript;
	lib.generateLoader = generateLoader;
	lib.generatePrettyJson = generatePrettyJson;
	lib.generateSplitScript = generateSplitScript;
	lib.getESMLoaderTemplate = builtLoader;
	lib.hydratePnpFile = hydratePnpFile;
	lib.hydratePnpSource = hydratePnpSource;
	lib.makeRuntimeApi = makeRuntimeApi;
	return lib;
}

var libExports = requireLib();

const ROOT_LOCATION = "./";
/** Normalize a package path into a PnP package location (relative directory). */
function location(path) {
    const normalized = node_path.posix.normalize(path).replace(/\/+$/, "");
    if (normalized === ".") {
        return ROOT_LOCATION;
    }
    // PnP wants a "./" prefix on subpaths; absolute and parent paths keep theirs.
    const relative = /^(\.\.(\/|$)|\/)/.test(normalized)
        ? normalized
        : `./${normalized}`;
    return `${relative}/`;
}
/**
 * Generate a Yarn Plug'n'Play file (`.pnp.cjs`) from a CommonJS package tree.
 *
 * Each package becomes a PnP package keyed by its path; its deps become package
 * dependencies. The roots become the dependency tree roots.
 */
function pnpScript(tree, roots) {
    if (!roots.length) {
        throw new Error("At least one root is required");
    }
    const nameByPath = new Map();
    for (const [path, package_] of tree.packages) {
        nameByPath.set(path, package_.name);
    }
    const dependencyTreeRoots = [];
    for (const path of new Set(roots)) {
        const name = nameByPath.get(path);
        if (name === undefined) {
            throw new Error(`Root package "${path}" is not known`);
        }
        dependencyTreeRoots.push({ name, reference: path });
    }
    const target = (name, path) => {
        const depName = nameByPath.get(path);
        if (depName === undefined) {
            throw new Error(`Package "${path}" (required as "${name}") is not known`);
        }
        return depName === name ? path : [depName, path];
    };
    const deps = (entries) => [...entries].map(([name, dep]) => [
        name,
        target(name, dep),
    ]);
    // Packages are grouped under their name in the registry.
    const packageRegistry = new Map();
    const store = (name) => {
        let store = packageRegistry.get(name);
        if (store === undefined) {
            packageRegistry.set(name, (store = []));
        }
        return store;
    };
    for (const [path, package_] of tree.packages) {
        store(package_.name).push([
            path,
            {
                linkType: libExports.LinkType.HARD,
                packageLocation: location(path),
                // The leading self-reference lets the package require itself by name.
                packageDependencies: [
                    [package_.name, path],
                    ...deps(package_.deps),
                ],
            },
        ]);
    }
    // Use the top level for global dependencies. (Note: the top level is not a
    // real package, so it is discarded from location lookup.)
    store(null).push([
        null,
        {
            discardFromLookup: true,
            linkType: libExports.LinkType.HARD,
            packageLocation: ROOT_LOCATION,
            packageDependencies: deps(tree.globals),
        },
    ]);
    // Ideally, would use generateInlinedScript, but need to have more control
    // over the top-level package.
    const data = {
        __info: ["Generated by rules_javascript"],
        dependencyTreeRoots,
        enableTopLevelFallback: true,
        fallbackExclusionList: [],
        fallbackPool: [],
        ignorePatternData: null,
        packageRegistryData: [...packageRegistry],
        pnpZipBackend: "js",
    };
    return preserveSymlinks(libExports.generateLoader(undefined, generateInlinedSetup(data)));
}
// PnP canonicalizes resolved modules with `realpathSync`, ignoring Node's
// `--preserve-symlinks`. Under Bazel runfiles that follows the runfiles symlink
// out of RUNFILES_DIR, so `findPackageLocator` no longer matches `__filename`.
// Skip the realpath and keep the symlinked path.
const REALPATH = "return opts.fakeFs.realpathSync(unqualifiedPath);";
const NO_REALPATH = "return unqualifiedPath;";
function preserveSymlinks(script) {
    if (!script.includes(REALPATH)) {
        throw new Error("Yarn PnP template changed: realpath resolution expression not found");
    }
    return script.replace(REALPATH, NO_REALPATH);
}
/**
 * Generate the Yarn Plug'n'Play ESM loader (`.pnp.loader.mjs`).
 *
 * The loader is static: at runtime it finds the PnP API set up by the adjacent
 * `.pnp.cjs` (preloaded via `node --require`), so it must sit next to it.
 */
function pnpLoader() {
    return libExports.getESMLoaderTemplate();
}
function generateStringLiteral(value) {
    return `'${value
        .replaceAll("\\", `\\\\`)
        .replaceAll("'", String.raw `\'`)
        .replaceAll("\n", `\\\n`)}'`;
}
function generateInlinedSetup(data) {
    return [
        `const RAW_RUNTIME_STATE =\n`,
        `${generateStringLiteral(libExports.generatePrettyJson(data))};\n\n`,
        `function $$SETUP_STATE(hydrateRuntimeState, basePath) {\n`,
        `  return hydrateRuntimeState(JSON.parse(RAW_RUNTIME_STATE), {basePath: basePath || __dirname});\n`,
        `}\n`,
    ].join(``);
}

function depArg(value) {
    return JSON.parse(value);
}
function packageArg(value) {
    return JSON.parse(value);
}
class ManifestWorkerError extends Error {
}
class ManifestWorker {
    async run(a) {
        const args = {
            deps: [],
            packages: [],
            roots: [],
            cjs: "",
            loader: "",
        };
        // argparse seems to be slow for very long argument lists
        for (let index = 0; index < a.length; index++) {
            switch (a[index]) {
                case "--dep": {
                    args.deps.push(depArg(a[++index]));
                    break;
                }
                case "--package": {
                    args.packages.push(packageArg(a[++index]));
                    break;
                }
                case "--root": {
                    args.roots.push(a[++index]);
                    break;
                }
                case "--loader": {
                    args.loader = a[++index];
                    break;
                }
                case "--pnp": {
                    args.cjs = a[++index];
                }
            }
        }
        if (!args.roots.length) {
            throw new ManifestWorkerError("At least one --root is required");
        }
        const tree = packageTree(args.packages, args.deps);
        await Promise.all([
            promises.writeFile(args.cjs, pnpScript(tree, args.roots)),
            args.loader ? promises.writeFile(args.loader, pnpLoader()) : Promise.resolve(),
        ]);
    }
}

var worker = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ManifestWorkerError: ManifestWorkerError,
    ManifestWorker: ManifestWorker
});
