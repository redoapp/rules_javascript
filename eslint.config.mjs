// for unicorn loadRules()
import { Dirent } from "node:fs";
Dirent.prototype.isFile = function () {
  return !this.isDirectory();
};

import js from "@eslint/js";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    plugins: { js, tseslint, eslintPluginUnicorn },
    extends: [
      js.configs.recommended,
      eslintPluginUnicorn.configs.unopinionated,
    ],
    rules: {
      // can be useful to have await inside Promise callback
      "no-async-promise-executor": "off",
      // https://github.com/typescript-eslint/typescript-eslint/issues/2818
      "no-redeclare": "off",
      // control characters (escaped) are legitimate in regexes
      "no-control-regex": "off",
      // only err if all variables can be constant
      "prefer-const": ["error", { destructuring: "all" }],
      // while(true) is legitimate
      "no-constant-condition": ["error", { checkLoops: false }],
      // catch {} is legitimate
      "no-empty": ["error", { allowEmptyCatch: true }],
      // legitimate inside TS namespaces
      "no-inner-declarations": "off",
      // prettier causes this
      "no-unexpected-multiline": "off",
      // https://gqqithub.com/typescript-eslint/typescript-eslint/issues/291
      "no-dupe-class-members": "off",
      "unicorn/import-style": "off",
      "unicorn/no-array-method-this-argument": "off",
      "unicorn/no-array-sort": "off",
      "unicorn/no-process-exit": "off",
      "unicorn/prefer-module": "off",
      "unicorn/prefer-top-level-await": "off",
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.node,
      },
    },
  },
  {
    extends: [tseslint.configs.recommended],
    files: ["**/*.ts"],
    rules: {
      // useful
      "@typescript-eslint/no-require-imports": "off",
      // arrow functions cannot be generators
      "@typescript-eslint/no-this-alias": "off",
      // helpful for typing
      "@typescript-eslint/ban-ts-comment": "off",
      // too many exceptions
      "@typescript-eslint/ban-types": "off",
      // no-ops are legitimate
      "@typescript-eslint/no-empty-function": "off",
      // legitimate
      "@typescript-eslint/no-empty-object-type": "off",
      // helpful for typing
      "@typescript-eslint/no-explicit-any": "off",
      // helpful for documentation
      "@typescript-eslint/no-inferrable-types": "off",
      // helpful for organization
      "@typescript-eslint/no-namespace": "off",
      // helpful for typing
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-var-requires": "off",
      // useful
      "@typescript-eslint/no-unsafe-function-type": "off",
      "prefer-rest-params": "off",
      "prefer-spread": "off",
    },
  },
]);
