const { rlocation } = require("@rules-javascript/nodejs-runfiles");
const { readFileSync } = require("node:fs");

const data = rlocation("rules_javascript_test/runfiles/data.txt", __filename);
console.log(readFileSync(data, "utf8"));
