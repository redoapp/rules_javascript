'use strict';

var promises = require('node:fs/promises');
var fs = require('node:fs');

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n["default"] = e;
    return Object.freeze(n);
}

var fs__namespace = /*#__PURE__*/_interopNamespace(fs);

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
            if (j < 0) {
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

var PackageDeps;
(function (PackageDeps) {
    function json() {
        return JsonFormat.stringMap(JsonFormat.string());
    }
    PackageDeps.json = json;
})(PackageDeps || (PackageDeps = {}));
var Package;
(function (Package) {
    function json() {
        return JsonFormat.object({
            deps: PackageDeps.json(),
            name: JsonFormat.string(),
        });
    }
    Package.json = json;
})(Package || (Package = {}));
var PackageTree;
(function (PackageTree) {
    function json() {
        return JsonFormat.object({
            globals: PackageDeps.json(),
            packages: JsonFormat.stringMap(Package.json()),
        });
    }
    PackageTree.json = json;
})(PackageTree || (PackageTree = {}));

function getPackages(packageArgs) {
    const packages = new Map();
    const packageIdByPath = new Map();
    for (const packageArg of packageArgs) {
        const existingPackage = packages.get(packageArg.id);
        if (existingPackage) {
            throw new Error(`Multiple instances of package ID ${packageArg.id} from ${existingPackage.label} and ${packageArg.label}`);
        }
        packages.set(packageArg.id, {
            label: packageArg.label,
            name: packageArg.name,
            deps: new Map(),
            path: packageArg.path,
        });
        const existingId = packageIdByPath.get(packageArg.path);
        if (existingId) {
            const existingPackage = packages.get(existingId);
            throw new Error(`Multiple instances of package path ${packageArg.id} from ${existingPackage.label} and ${packageArg.label}`);
        }
    }
    return packages;
}
function addDeps(depArgs, packages, globals) {
    for (const depArg of depArgs) {
        if (depArg.id == null) {
            const depPackage = packages.get(depArg.dep);
            if (!depPackage) {
                throw new Error(`Package ${depArg.dep} does not exist, but is referenced globally (${depArg.label})`);
            }
            const existingDep = globals.get(depArg.name);
            if (!existingDep) {
                globals.set(depArg.name, {
                    label: depArg.label,
                    path: depPackage.path,
                });
            }
            else if (existingDep.path !== depArg.dep) {
                throw new Error(`Multiple globals for ${depArg.name}: ${existingDep.path} (via ${existingDep.label}) and ${depArg.dep} (via ${depArg.label})`);
            }
            continue;
        }
        const package_ = packages.get(depArg.id);
        if (!package_) {
            throw new Error(`Package ${depArg.id} does not exist, but is referenced (${depArg.label})`);
        }
        const depPackage = packages.get(depArg.dep);
        if (!depPackage) {
            throw new Error(`Package ${depArg.dep} does not exist, but is referenced by ${depArg.id} (${depArg.label})`);
        }
        const existingDep = depPackage.deps.get(depArg.name);
        if (existingDep && existingDep.path !== depPackage.path) {
            throw new Error(`Package ${depArg.id} has multiple dependencies for ${depArg.name}: ${existingDep.path} (via ${existingDep.label}) and ${depPackage.path} (via ${depArg.label})`);
        }
        package_.deps.set(depArg.name, {
            label: depArg.label,
            path: depPackage.path,
        });
    }
}
function getPackageTree(packages, globals) {
    const resultGlobals = new Map([...globals.entries()].map(([name, dep]) => [name, dep.path]));
    const resultPackages = new Map([...packages.values()].map((package_) => [
        package_.path,
        {
            name: package_.name,
            deps: new Map([...package_.deps.entries()].map(([name, dep]) => [name, dep.path])),
        },
    ]));
    return { globals: resultGlobals, packages: resultPackages };
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
            output: "",
        };
        // argparse seems to be slow for very long argument lists
        for (let index = 0; index < a.length; index++) {
            switch (a[index]) {
                case "--dep": {
                    args.deps.push(depArg(a[index + 1]));
                    break;
                }
                case "--package": {
                    args.packages.push(packageArg(a[index + 1]));
                    break;
                }
                default: {
                    args.output = a[index];
                }
            }
        }
        const packages = getPackages(args.packages);
        const globals = new Map();
        addDeps(args.deps, packages, globals);
        const tree = getPackageTree(packages, globals);
        await fs__namespace.promises.writeFile(args.output, JsonFormat.stringify(PackageTree.json(), tree));
    }
}

var worker = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ManifestWorkerError: ManifestWorkerError,
    ManifestWorker: ManifestWorker
});
