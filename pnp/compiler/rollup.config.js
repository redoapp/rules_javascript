const commonjs = require("@rollup/plugin-commonjs");
const { nodeResolve } = require("@rollup/plugin-node-resolve");

module.exports = {
  inlineDynamicImports: true,
  input: "lib/main.js",
  onwarn(warning) {
    throw new Error(`Build failed due to warning: ${warning.message}`);
  },
  output: { file: "bundle.js" },
  plugins: [commonjs(), nodeResolve()],
};
