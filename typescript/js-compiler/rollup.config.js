const commonjs = require("@rollup/plugin-commonjs");
const { nodeResolve } = require("@rollup/plugin-node-resolve");

module.exports = {
  input: "src/main.js",
  external: (moduleId, parentId) =>
    !!parentId &&
    !moduleId.startsWith("/") &&
    !moduleId.startsWith("./") &&
    !moduleId.startsWith("../") &&
    !moduleId.startsWith("@better-rules-javascript/"),
  inlineDynamicImports: true,
  output: { file: "bundle.js" },
  plugins: [commonjs(), nodeResolve()],
};
