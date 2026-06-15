import { Package, PackageTree } from "@rules-javascript/commonjs-package";

export interface PackageArg {
  id: string;
  label: string;
  name: string;
  path: string;
}

export interface DepArg {
  dep: string;
  id: string | null;
  label: string;
  name: string;
}

interface Dep {
  label: string;
  path: string;
}

interface Pkg {
  label: string;
  name: string;
  path: string;
  deps: Map<string, Dep>;
}

export function packageTree(
  packageArgs: PackageArg[],
  depArgs: DepArg[],
): PackageTree {
  const byId = new Map<string, Pkg>();
  const byPath = new Map<string, Pkg>();

  for (const arg of packageArgs) {
    const dupId = byId.get(arg.id);
    if (dupId) {
      throw new Error(
        `Multiple instances of package ID ${arg.id} from ${dupId.label} and ${arg.label}`,
      );
    }
    const dupPath = byPath.get(arg.path);
    if (dupPath) {
      throw new Error(
        `Multiple instances of package path ${arg.path} from ${dupPath.label} and ${arg.label}`,
      );
    }
    const pkg: Pkg = {
      label: arg.label,
      name: arg.name,
      path: arg.path,
      deps: new Map(),
    };
    byId.set(arg.id, pkg);
    byPath.set(arg.path, pkg);
  }

  const globals = new Map<string, Dep>();

  for (const arg of depArgs) {
    const dep = byId.get(arg.dep);
    if (!dep) {
      const via = arg.id == null ? "globally" : `by ${arg.id}`;
      throw new Error(
        `Package ${arg.dep} does not exist, but is referenced ${via} (${arg.label})`,
      );
    }

    let deps: Map<string, Dep>;
    if (arg.id == null) {
      deps = globals;
    } else {
      const pkg = byId.get(arg.id);
      if (!pkg) {
        throw new Error(
          `Package ${arg.id} does not exist, but is referenced (${arg.label})`,
        );
      }
      deps = pkg.deps;
    }

    const existing = deps.get(arg.name);
    if (existing && existing.path !== dep.path) {
      const subject = arg.id == null ? "globals" : `dependencies for ${arg.id}`;
      throw new Error(
        `Multiple ${subject} named ${arg.name}: ${existing.path} (via ${existing.label}) and ${dep.path} (via ${arg.label})`,
      );
    }
    deps.set(arg.name, { label: arg.label, path: dep.path });
  }

  const paths = (deps: Map<string, Dep>): Map<string, string> =>
    new Map(Array.from(deps, ([name, dep]) => [name, dep.path]));

  const packages = new Map<string, Package>(
    Array.from(byId.values(), (pkg) => [
      pkg.path,
      { name: pkg.name, deps: paths(pkg.deps) },
    ]),
  );

  return { globals: paths(globals), packages };
}
