# Npm

rules_javascript can use npm packages.

<!-- START doctoc -->
<!-- END doctoc -->

# Guide

## Strategy

A package manager resolves the dependency graph. The information is converted to
Bazel repositories. This approach integrates well into the Bazel ecosystem and
avoid excessive downloads. Compare with
[rules_jvm_external](https://github.com/bazelbuild/rules_jvm_external).

rules_javascript uses Yarn 2.

## Yarn

### Install

Create a package.json.

**package.json**

```json
{
  "dependencies": {
    "@org/package": "^1.0.0"
  }
}
```

Also create an empty yarn.lock.

**yarn.lock**

```text

```

Add to yarn extension.

**MODULE.bazel**

```bzl
yarn = use_extension("@rules_javascript//npm:extensions.bzl", "yarn")
yarn.workspace(
  name = "my_npm",
  data = "npm.json",
  path = "/",
)
use_repo(yarn, npm = "my_npm")
```

Resolve packages and generate npm.json.

```sh
bazel run @npm//:resolve
```

### Plugins

Several types of files can be distributed in NPM packages: JavaScript,
TypeScript, CSS, etc.

To support these, the npm repositories can be customized via "plugins."

If you use TypeScript, use

```bzl
yarn.workspace(
    name = "my_npm",
    data = "npm.json",
    path = "/",
    plugins = [
        "@rules_javascript//commonjs:npm_plugin.bzl",
        "@rules_javascript//typescript:npm_plugin.bzl",
    ],
)
```

### Usage

JS libraries are available as `@npm//<package_name>:lib`.

For example,

**BUILD.bazel**

```bzl
js_library(
    name = "example",
    deps = ["@npm//@org/package:lib"],
)
```

## IDE

To make these accessible to the IDE in `node_modules`, see
[Node.js docs](nodejs.md).

## Limitations

Post-install scripts, including native dependencies (node-gyp), are not
supported.

To support those, filter the package from `PACKAGES`, and instead use Bazel
rules to replicate the build process.
