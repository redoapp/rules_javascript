import { AppendAction } from "@rules-javascript/util-argparse/actions";
import { ArgumentParser } from "argparse";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, relative } from "node:path";

const parser = new ArgumentParser(<any>{
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
parser.add_argument("--package-manifest", { dest: "packageManifest" });
parser.add_argument("--no-preserve-symlinks", {
  action: "store_true",
  default: false,
  dest: "noPreserveSymlinks",
});
parser.add_argument("output");

interface Args {
  config?: string;
  declarationDir?: string;
  files: string[];
  empty: boolean;
  module?: string;
  rootDir: string;
  rootDirs?: string[];
  outDir?: string;
  sourceMap: "true" | "false";
  target?: string;
  typeRoots: string[];
  packageManifest?: string;
  noPreserveSymlinks: boolean;
  output: string;
}

(async () => {
  const args: Args = parser.parse_args();

  const outDir = dirname(args.output);
  const relativePath = (path_: string) => {
    let result = relative(outDir, path_);
    const [first] = result.split("/", 1);
    if (first != "." && first != "..") {
      result = `./${result}`;
    }
    return result;
  };

  const tsconfig: any = {
    compilerOptions: {
      composite: true,
      declaration: !!args.declarationDir,
      rootDir: relativePath(args.rootDir),
      sourceMap: args.sourceMap === "true",
      inlineSources: args.sourceMap === "true",
    },
    files: args.files.map(relativePath),
  };
  if (args.typeRoots.length > 0) {
    tsconfig.compilerOptions.typeRoots = args.typeRoots.map(relativePath);
  }
  // preserveSymlinks is critical for the native (tsgo) compile path
  // (--package-manifest): the runtime stager creates real node_modules/
  // symlinks from the manifest; without preserveSymlinks, tsc/tsgo may
  // resolve through symlinks to duplicate nominal type identities and
  // emit TS2322 errors where none exist.
  //
  // It is NOT safe for the lint path. The lint binary uses the
  // fs-linker per-package nested VFS; with preserveSymlinks=true, the
  // resolver walks every nested-symlink chain and accumulates a
  // quadratic miss-cache that exhausts the heap on large packages.
  // Callers that emit a lint-specific tsconfig pass --no-preserve-symlinks.
  if (args.packageManifest && !args.noPreserveSymlinks) {
    tsconfig.compilerOptions.preserveSymlinks = true;
  }
  if (args.rootDirs) {
    tsconfig.compilerOptions.rootDirs = args.rootDirs.map(relativePath);
  }

  if (args.module) {
    tsconfig.compilerOptions.module = args.module;
    // should allow choices, but it's so complicated
    switch (args.module.toLowerCase()) {
      case "bundler":
      case "es2015":
      case "es2020":
      case "es2022": {
        tsconfig.compilerOptions.moduleResolution = "bundler";
        break;
      }
      case "node16":
      case "node18":
      case "node20":
      case "nodenext": {
        tsconfig.compilerOptions.moduleResolution = "nodenext";
        break;
      }
      default: {
        tsconfig.compilerOptions.moduleResolution = "node";
      }
    }
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

  // NOTE: --package-manifest is passed by rules.bzl in native mode as a
  // signal that tsc/tsgo will see a real node_modules/ tree staged by
  // the _STAGE_NM_JS runtime stager. We intentionally do NOT emit
  // compilerOptions.paths or explicit ambient files here — doing so
  // would give tsc a second way to reach the same dep file and produce
  // "type X is not assignable to type X" errors from duplicate nominal
  // identities. TypeScript 7 (tsgo) loads no ambient @types implicitly,
  // so the manifest's visible @types packages are listed explicitly,
  // resolved from the staged tree. The lint tsconfig
  // (--no-preserve-symlinks) keeps the fs-linker VFS resolution instead.
  if (args.packageManifest && !args.noPreserveSymlinks) {
    const manifest: {
      packages?: Record<string, { deps?: Record<string, string> }>;
      globals?: Record<string, string>;
    } = JSON.parse(await readFile(args.packageManifest, "utf8"));
    const typeNames = new Set<string>();
    const collect = (name: string) => {
      if (name.startsWith("@types/")) {
        typeNames.add(name.slice("@types/".length));
      }
    };
    // Mirror the stager's closure walk so every entry is staged.
    const packages = manifest.packages ?? {};
    const seen = new Set<string>();
    const queue = [outDir, ...Object.values(manifest.globals ?? {})];
    for (const name of Object.keys(manifest.globals ?? {})) {
      collect(name);
    }
    for (;;) {
      const packagePath = queue.shift();
      if (packagePath == null) {
        break;
      }
      if (seen.has(packagePath)) {
        continue;
      }
      seen.add(packagePath);
      for (const [depName, depPath] of Object.entries(
        packages[packagePath]?.deps ?? {},
      )) {
        collect(depName);
        queue.push(depPath);
      }
    }
    if (typeNames.size) {
      tsconfig.compilerOptions.types = [...typeNames].sort();
      tsconfig.compilerOptions.typeRoots = [
        relativePath("node_modules/@types"),
      ];
    }
  }

  const content = JSON.stringify(tsconfig);
  await writeFile(args.output, content, "utf8");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
