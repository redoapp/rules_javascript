# typescript-eslint tsgo bridge

ESLint parser that keeps `@typescript-eslint/parser` for the ESTree AST and
takes type information from the native TypeScript compiler (tsgo, TypeScript
7.1+) through its `typescript/unstable/sync` API, instead of building a Strada
(`typescript@5.x`) `ts.Program`. typescript-eslint rules see an ordinary
`parserServices.program` / `getTypeChecker()` and run unmodified.

The package has no dependencies of its own. The consumer passes the modules so
the bridge cannot drift from the versions the rules import:

```js
// tslint.config.mjs
import { createTsgoParser } from "@rules-javascript/typescript-eslint-tsgo-bridge";
import { createRequire } from "node:module";
import tseslint from "typescript-eslint";

const require = createRequire(import.meta.url);
const bridge = createTsgoParser({
  ts: require("typescript"), // 5.x, what the rules import
  tsParser: tseslint.parser,
  tsgoSync: await import("typescript-native/unstable/sync"), // alias of typescript@7.1.0-dev.*
  tsgoAst: await import("typescript-native/unstable/ast"),
  tsconfig: process.env.TS_CONFIG,
});
export default [{ languageOptions: { parser: bridge.parser } }];
```

`configure_ts_eslint(native = True)` runs the lint action with `node_modules/`
materialized (like the native compile action) and sets `TSGO_BRIDGE=1` plus
`TS_CONFIG` for the config to pick this parser.

How it works: tsgo enum values are renumbered to Strada's by member name; Strada
nodes from typescript-estree are mapped to tsgo nodes by `(pos, end, kind)` on
the decoded tsgo source file (same-span fallback for AST-shape differences);
`Type`/`Symbol`/`Signature` handles are wrapped in identity-cached shims that
expose the Strada surface; declaration nodes resolve lazily and are exposed as
proxied tsgo nodes. `getAwaitedType` and `getContextualTypeForArgumentAtIndex`
have no tsgo equivalent and are emulated.

The API is unstable and unversioned. The bridge pins no TypeScript itself (the
consumer's `@npm` does, like the native `ts_compiler` binary); it records the
nightly it was verified against in `TESTED_NATIVE_VERSION` and
`createTsgoParser` fails at startup with a descriptive error when the handed-in
modules lack an export or checker method it relies on. Pin an exact nightly and
re-run the consumer's parity checks when bumping it.
