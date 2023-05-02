import { Resolver } from "@better-rules-javascript/commonjs-package/resolve";
import { lazy } from "@better-rules-javascript/util/cache";
import * as fs from "node:fs";
import Module from "node:module";
import * as path from "node:path";

function parse(resolver: Resolver) {
  return (path_: string) => {
    try {
      const root = path.resolve(
        process.env.RUNFILES_DIR!,
        resolver.root(path_),
      );
      const packageContent = fs.readFileSync(
        path.join(root, "package.json"),
        "utf8",
      );
      const packageJson = JSON.parse(packageContent);
      if (!packageJson.name) {
        return;
      }
      return {
        basedir: root,
        name: packageJson.name,
        path: path_.slice(root.length + 1),
      };
    } catch {
    }
  };
}

const MODULE_NAME = "module-details-from-path";

export function patchModuleDetails(
  resolver: Resolver,
  delegate: typeof Module,
) {
  const originalRequire = delegate.prototype.require;
  const parse_ = parse(resolver);
  delegate.prototype.require = <any>function (this: any, id: string) {
    if (id === MODULE_NAME) {
      return parse_;
    }
    return originalRequire.apply(this, <any>arguments);
  };

  // const originalFilename = (<any>delegate)._resolveFilename;
  // (<any>delegate)._resolveFilename = function (request) {
  //   if (request === MODULE_NAME) {
  //     return __filename;
  //   }
  //   return originalFilename.apply(this, arguments);
  // };
}
