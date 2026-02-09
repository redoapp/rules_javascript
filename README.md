# rules_javascript

[![Build](https://github.com/rivethealth/rules_javascript/actions/workflows/build.yml/badge.svg)](https://github.com/rivethealth/rules_javascript/actions/workflows/build.yml)

Bazel rules for JavaScript, TypeScript, and related technologies.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Documentation](#documentation)
- [Philosophy](#philosophy)
- [Install](#install)
- [Example](#example)
- [Developing](#developing)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Documentation

See [documentation](docs/index.md).

## Philosophy

1. Flexibility and extensibility
1. Performance
1. Bazel idioms
1. Clear separation of concerns

## Install

**MODULE.bazel**

```bzl
RULES_JAVACRIPT_VERSION = "<commit>"

bazel_dep(name = "rules_javascript")
archive_override(
    module_name = "rules_javascript",
    sha256 = "<sha256>",
    strip_prefix = "rules_javascript-%s" % RULES_JAVACRIPT_VERSION,
    url = "https://github.com/redoapp/rules_javascript/archive/%s.tar.gz" % RULES_JAVACRIPT_VERSION,
)
```

## Example

**main.ts**

```ts
console.log("Hello world");
```

**tsconfig.json**

```json
{ "compilerOptions": { "lib": ["dom"] } }
```

**BUILD.bazel**

```bzl
load("@rules_javascript//commonjs:rules.bzl", "cjs_root")
load("@rules_javascript//javascript:rules.bzl", "js_library")
load("@rules_javascript//typescript:rules.bzl", "tsconfig", "ts_library")
load("@rules_javascript//nodejs:rules.bzl", "nodejs_binary")

nodejs_binary(
    name = "bin",
    dep = ":lib",
    main = "main.js",
)

ts_library(
    name = "lib",
    config = ":tsconfig",
    root = ":root",
    srcs = ["main.ts"],
    deps = [":lib"],
)

cjs_root(
  name = "root",
  package_name = "example",
)

js_library(
    name = "tsconfig",
    root = ":root",
    srcs = ["tsconfig.json"],
)
```

Running:

```sh
$ bazel run //:bin
Hello world
```

## Developing

See [DEVELOPING.md](DEVELOPING.md).
