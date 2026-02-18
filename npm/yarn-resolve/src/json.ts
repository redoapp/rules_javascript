export interface BzlPackage {
  arch: string[] | undefined;
  binaries: Map<string, string>;
  deps: BzlDeps;
  extraDeps: Map<string, BzlDeps>;
  integrity: string;
  libc: string[] | undefined;
  name: string;
  os: string[] | undefined;
  url: string;
}

export namespace BzlPackage {
  export function toJson(value: BzlPackage): any {
    const extraDeps = [...value.extraDeps.entries()].sort(
      (a, b) => +(b[0] < a[0]) - +(a[0] < b[0]),
    );

    return {
      arch: value.arch,
      bins:
        value.binaries.size > 0
          ? Object.fromEntries(value.binaries.entries())
          : undefined,
      deps: value.deps.length > 0 ? BzlDeps.toJson(value.deps) : undefined,
      extraDeps:
        extraDeps.length > 0
          ? Object.fromEntries(
              extraDeps.map(([id, deps]) => [id, BzlDeps.toJson(deps)]),
            )
          : undefined,
      integrity: value.integrity,
      libc: value.libc,
      name: value.name,
      os: value.os,
      url: value.url,
    };
  }
}

export type BzlPackages = Map<string, BzlPackage>;

export namespace BzlPackages {
  export function toJson(value: BzlPackages) {
    const entries = [...value.entries()].sort(
      (a, b) => +(b[0] < a[0]) - +(a[0] < b[0]),
    );
    return Object.fromEntries(
      entries.map(([id, value]) => [id, BzlPackage.toJson(value)]),
    );
  }
}

export interface BzlDep {
  name: string | null;
  id: string;
  optional: boolean;
}

export type BzlDeps = BzlDep[];

export namespace BzlDeps {
  export function toJson(value: BzlDeps) {
    const entries = [...value].sort((a, b) => +(b.id < a.id) - +(a.id < b.id));
    return entries.map((dep) => {
      const result: Record<string, any> = { id: dep.id };
      if (dep.name !== null) {
        result.name = dep.name;
      }
      if (dep.optional) {
        result.optional = dep.optional;
      }
      return result;
    });
  }
}

export function toJsonFile(packages: BzlPackages, roots: BzlDeps) {
  return {
    packages: BzlPackages.toJson(packages),
    roots: BzlDeps.toJson(roots),
  };
}
