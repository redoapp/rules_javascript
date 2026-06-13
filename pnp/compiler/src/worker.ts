import { writeFile } from "node:fs/promises";
import {
  DepArg,
  DetailedDeps,
  PackageArg,
  addDeps,
  getPackageTree,
  getPackages,
} from "./manifest";
import { pnpLoader, pnpScript } from "./pnp";

interface Args {
  deps: DepArg[];
  packages: PackageArg[];
  roots: string[];
  cjs: string;
  loader: string;
}

function depArg(value: string): DepArg {
  return JSON.parse(value);
}

function packageArg(value: string): PackageArg {
  return JSON.parse(value);
}

export class ManifestWorkerError extends Error {}

export class ManifestWorker {
  async run(a: string[]) {
    const args: Args = {
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

    const packages = getPackages(args.packages);
    const globals: DetailedDeps = new Map();

    addDeps(args.deps, packages, globals);

    const tree = getPackageTree(packages, globals);

    await Promise.all([
      writeFile(args.cjs, pnpScript(tree, args.roots)),
      args.loader ? writeFile(args.loader, pnpLoader()) : Promise.resolve(),
    ]);
  }
}
