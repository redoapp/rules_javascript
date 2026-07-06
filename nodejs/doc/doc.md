# Node.js

Node.js is most common execution environment outside a web browser.

<!-- START doctoc -->
<!-- END doctoc -->

# Guide

## Reference

[Starlark reference](stardoc/nodejs.md)

## Example

**package.json**

```json
{}
```

**main.js**

```js
console.log("Hello world");
```

**BUILD.bazel**

```bzl
load("@rules_javascript//commonjs:rules.bzl", "cjs_root")
load("@rules_javascript//javascript:rules.bzl", "js_library")
load("@rules_javascript//nodejs:rules.bzl", "nodejs_binary")

cjs_root(
  name = "root",
  descriptor = "package.json",
  package_name = "example",
)

js_library(
    name = "main",
    root = ":root",
    srcs = ["main.js"],
)

nodejs_binary(
    name = "bin",
    dep = ":main",
    main = "main.js",
)
```

Then

```txt
$ bazel run //:bin
Hello world
```

## IDEs

IDEs use `node_modules`. To install external dependencies or link local files:

**BUILD.bazel**

```bzl
load("@rules_javascript//nodejs:rules.bzl", "nodejs_install", "nodejs_modules_package")

nodejs_install(
  name = "nodejs_install",
  src = ":node_modules",
)

nodejs_modules_package(
  name = "node_modules",
  deps = ["@npm//external-example:lib"],
  links = ["//internal-example:root"],
)
```

Then run:

```sh
bazel run :nodejs_install
```

`nodejs_install` writes `node_modules/.install-manifest.json` and, by default,
`node_modules/.yarn-state.yml`. The Yarn state file contains a digest of the
generated install manifest so tools such as Vite, which key dependency caches
from package-manager install state, invalidate caches when the Bazel-generated
`node_modules` layout changes. Set `package_manager_state_file = ""` to disable
this marker.
