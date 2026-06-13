const commonjs = require("@rollup/plugin-commonjs");
const { nodeResolve } = require("@rollup/plugin-node-resolve");

module.exports = {
  input: "src/main.js",
  external: ["argparse"],
  inlineDynamicImports: true,
  onwarn(warning, delegate) {
    if (warning.code === "UNRESOLVED_IMPORT") {
      throw new Error(warning.message);
    }
    delegate(warning);
  },
  output: { file: "bundle.js" },
  plugins: [commonjs(), nodeResolve()],
};
