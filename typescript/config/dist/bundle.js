'use strict';

var argparse = require('argparse');
var promises = require('node:fs/promises');
var node_path = require('node:path');

/**
 * Faster version of "append" action.
 * @see {@link https://github.com/nodeca/argparse/issues/184 | nodeca/argparse#184}
 */
class AppendAction extends argparse.Action {
    constructor(options) {
        super(options);
        this.default = options.default;
    }
    call(_, namespace, values) {
        let items = namespace[this.dest];
        if (items === this.default) {
            items = this.default ? [...this.default] : [];
            namespace[this.dest] = items;
        }
        items.push(values);
    }
}

const parser = new argparse.ArgumentParser({
    prog: "typescript-config",
    description: "Generate tsconfig.",
    fromfile_prefix_chars: "@",
});
parser.add_argument("--config");
parser.add_argument("--declaration-dir", { dest: "declarationDir" });
parser.add_argument("--file", {
    dest: "files", // https://github.com/nodeca/argparse/issues/184
    action: AppendAction,
    default: [],
});
parser.add_argument("--module");
parser.add_argument("--root-dir", { dest: "rootDir", required: true });
parser.add_argument("--root-dirs", {
    dest: "rootDirs", // https://github.com/nodeca/argparse/issues/184
    action: AppendAction,
});
parser.add_argument("--source-map", { default: "false", dest: "sourceMap" });
parser.add_argument("--out-dir", { dest: "outDir" });
parser.add_argument("--target");
parser.add_argument("--type-root", {
    action: AppendAction,
    dest: "typeRoots",
    default: [],
});
parser.add_argument("output");
(async () => {
    const args = parser.parse_args();
    const outDir = node_path.dirname(args.output);
    const relativePath = (path_) => {
        let result = node_path.relative(outDir, path_);
        const [first] = result.split("/", 1);
        if (first != "." && first != "..") {
            result = `./${result}`;
        }
        return result;
    };
    const tsconfig = {
        compilerOptions: {
            composite: true,
            declaration: !!args.declarationDir,
            typeRoots: args.typeRoots.map(relativePath),
            rootDir: relativePath(args.rootDir),
            sourceMap: args.sourceMap === "true",
            inlineSources: args.sourceMap === "true",
        },
        files: args.files.map(relativePath),
    };
    if (args.rootDirs) {
        tsconfig.compilerOptions.rootDirs = args.rootDirs.map(relativePath);
    }
    if (args.module) {
        tsconfig.compilerOptions.module = args.module;
    }
    if (args.declarationDir) {
        tsconfig.compilerOptions.declarationDir = relativePath(args.declarationDir);
        if (!args.outDir) {
            tsconfig.compilerOptions.emitDeclarationOnly = true;
        }
    }
    if (args.outDir) {
        tsconfig.compilerOptions.outDir = relativePath(args.outDir);
    }
    if (args.config) {
        tsconfig.extends = relativePath(args.config);
    }
    if (args.target) {
        tsconfig.compilerOptions.target = args.target;
    }
    const content = JSON.stringify(tsconfig);
    await promises.writeFile(args.output, content, "utf8");
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
