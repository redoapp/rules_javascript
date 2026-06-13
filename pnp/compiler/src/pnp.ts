import { PackageTree } from "@rules-javascript/commonjs-package";
import { PortablePath } from "@yarnpkg/fslib";
import {
  DependencyTarget,
  LinkType,
  PackageInformation,
  PackageRegistry,
  PhysicalPackageLocator,
  PnpSettings,
  generateInlinedScript,
  getESMLoaderTemplate,
} from "@yarnpkg/pnp";
import { posix } from "node:path";

const ROOT_LOCATION = "./" as PortablePath;

/** Normalize a package path into a PnP package location (relative directory). */
function location(path: string): PortablePath {
  const normalized = posix.normalize(path).replace(/\/+$/, "");
  if (normalized === ".") {
    return ROOT_LOCATION;
  }
  // PnP wants a "./" prefix on subpaths; absolute and parent paths keep theirs.
  const relative = /^(\.\.(\/|$)|\/)/.test(normalized)
    ? normalized
    : `./${normalized}`;
  return `${relative}/` as PortablePath;
}

/**
 * Generate a Yarn Plug'n'Play file (`.pnp.cjs`) from a CommonJS package tree.
 *
 * Each package becomes a PnP package keyed by its path; its deps become package
 * dependencies. The roots become the dependency tree roots.
 */
export function pnpScript(tree: PackageTree, roots: string[]): string {
  if (!roots.length) {
    throw new Error("At least one root is required");
  }

  const nameByPath = new Map<string, string>();
  for (const [path, package_] of tree.packages) {
    nameByPath.set(path, package_.name);
  }

  const dependencyTreeRoots: PhysicalPackageLocator[] = [];
  for (const path of new Set(roots)) {
    const name = nameByPath.get(path);
    if (name === undefined) {
      throw new Error(`Root package "${path}" is not known`);
    }
    dependencyTreeRoots.push({ name, reference: path });
  }

  const target = (name: string, path: string): DependencyTarget => {
    const depName = nameByPath.get(path);
    if (depName === undefined) {
      throw new Error(`Package "${path}" (required as "${name}") is not known`);
    }
    return depName === name ? path : [depName, path];
  };

  const packageRegistry: PackageRegistry = new Map();

  for (const [path, package_] of tree.packages) {
    const packageDependencies = new Map<string, DependencyTarget>();
    for (const [name, dep] of package_.deps) {
      packageDependencies.set(name, target(name, dep));
    }

    const information: PackageInformation<PortablePath> = {
      packageLocation: location(path),
      packageDependencies,
      packagePeers: new Set(),
      linkType: LinkType.HARD,
      discardFromLookup: false,
    };

    let store = packageRegistry.get(package_.name);
    if (store === undefined) {
      packageRegistry.set(package_.name, (store = new Map()));
    }
    store.set(path, information);
  }

  const fallbackPool = new Map<string, DependencyTarget>();
  for (const [name, dep] of tree.globals) {
    fallbackPool.set(name, target(name, dep));
  }

  const settings: PnpSettings = {
    dependencyTreeRoots,
    enableTopLevelFallback: false,
    fallbackExclusionList: [],
    fallbackPool,
    ignorePattern: null,
    packageRegistry,
    pnpZipBackend: "js",
    shebang: "#!/usr/bin/env node",
  };

  return preserveSymlinks(generateInlinedScript(settings));
}

// PnP canonicalizes resolved modules with `realpathSync`, ignoring Node's
// `--preserve-symlinks`. Under Bazel runfiles that follows the runfiles symlink
// out of RUNFILES_DIR, so `findPackageLocator` no longer matches `__filename`.
// Skip the realpath and keep the symlinked path.
const REALPATH = "return opts.fakeFs.realpathSync(unqualifiedPath);";
const NO_REALPATH = "return unqualifiedPath;";

function preserveSymlinks(script: string): string {
  if (!script.includes(REALPATH)) {
    throw new Error(
      "Yarn PnP template changed: realpath resolution expression not found",
    );
  }
  return script.replace(REALPATH, NO_REALPATH);
}

/**
 * Generate the Yarn Plug'n'Play ESM loader (`.pnp.loader.mjs`).
 *
 * The loader is static: at runtime it finds the PnP API set up by the adjacent
 * `.pnp.cjs` (preloaded via `node --require`), so it must sit next to it.
 */
export function pnpLoader(): string {
  return getESMLoaderTemplate();
}
