import { PackageTree } from "@rules-javascript/commonjs-package";
import { JsonFormat } from "@rules-javascript/util-json";
import * as fs from "node:fs";
import {
  DepArg,
  DetailedDeps,
  PackageArg,
  addDeps,
  getPackageTree,
  getPackages,
} from "./manifest";

interface Args {
  deps: DepArg[];
  packages: PackageArg[];
  output: string;
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
    const globals: DetailedDeps = new Map();

    addDeps(args.deps, packages, globals);

    const tree = getPackageTree(packages, globals);

    await fs.promises.writeFile(
      args.output,
      JsonFormat.stringify(PackageTree.json(), tree),
    );
  }
}
