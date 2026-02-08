const { Dirent } = require("node:fs");
const path = require("node:path");

Dirent.prototype.isFile = function () {
  return !this.isDirectory();
};

const pathResolve = path.resolve;
path.resolve = function (base, path) {
  if (path === "../../../playwright") {
    return "/";
  }
  return Reflect.apply(pathResolve, this, arguments);
};
