# Npm

rules_javascript can use npm packages.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Guide](#guide)
  - [Strategy](#strategy)
  - [Yarn](#yarn)
  - [IDE](#ide)
  - [Limitations](#limitations)
- [//npm:rules.bzl](#npmrulesbzl)
  - [npm_publish](#npm_publish)
  - [yarn_audit_test](#yarn_audit_test)
  - [yarn_resolve](#yarn_resolve)
  - [npm_package](#npm_package)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

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

# //npm:rules.bzl

<!-- Generated with Stardoc: http://skydoc.bazel.build -->

<a id="npm_publish"></a>

## npm_publish

<pre>
load("@rules_javascript//npm:rules.bzl", "npm_publish")

npm_publish(<a href="#npm_publish-name">name</a>, <a href="#npm_publish-src">src</a>)
</pre>

**ATTRIBUTES**

| Name                              | Description                    | Type                                                                | Mandatory | Default |
| :-------------------------------- | :----------------------------- | :------------------------------------------------------------------ | :-------- | :------ |
| <a id="npm_publish-name"></a>name | A unique name for this target. | <a href="https://bazel.build/concepts/labels#target-names">Name</a> | required  |         |
| <a id="npm_publish-src"></a>src   | -                              | <a href="https://bazel.build/concepts/labels">Label</a>             | required  |         |

<a id="yarn_audit_test"></a>

## yarn_audit_test

<pre>
load("@rules_javascript//npm:rules.bzl", "yarn_audit_test")

yarn_audit_test(<a href="#yarn_audit_test-name">name</a>, <a href="#yarn_audit_test-data">data</a>, <a href="#yarn_audit_test-path">path</a>)
</pre>

**ATTRIBUTES**

| Name                                  | Description                    | Type                                                                | Mandatory | Default |
| :------------------------------------ | :----------------------------- | :------------------------------------------------------------------ | :-------- | :------ |
| <a id="yarn_audit_test-name"></a>name | A unique name for this target. | <a href="https://bazel.build/concepts/labels#target-names">Name</a> | required  |         |
| <a id="yarn_audit_test-data"></a>data | -                              | <a href="https://bazel.build/concepts/labels">List of labels</a>    | optional  | `[]`    |
| <a id="yarn_audit_test-path"></a>path | Package relative path          | String                                                              | optional  | `""`    |

<a id="yarn_resolve"></a>

## yarn_resolve

<pre>
load("@rules_javascript//npm:rules.bzl", "yarn_resolve")

yarn_resolve(<a href="#yarn_resolve-name">name</a>, <a href="#yarn_resolve-output">output</a>, <a href="#yarn_resolve-path">path</a>, <a href="#yarn_resolve-refresh">refresh</a>)
</pre>

**ATTRIBUTES**

| Name                                     | Description                                                   | Type                                                                | Mandatory | Default          |
| :--------------------------------------- | :------------------------------------------------------------ | :------------------------------------------------------------------ | :-------- | :--------------- |
| <a id="yarn_resolve-name"></a>name       | A unique name for this target.                                | <a href="https://bazel.build/concepts/labels#target-names">Name</a> | required  |                  |
| <a id="yarn_resolve-output"></a>output   | Package-relative output path                                  | String                                                              | optional  | `"npm_data.bzl"` |
| <a id="yarn_resolve-path"></a>path       | Package-relative path to package.json and yarn.lock directory | String                                                              | optional  | `""`             |
| <a id="yarn_resolve-refresh"></a>refresh | Whether to refresh                                            | Boolean                                                             | optional  | `True`           |

<a id="npm_package"></a>

## npm_package

<pre>
load("@rules_javascript//npm:rules.bzl", "npm_package")

npm_package(<a href="#npm_package-name">name</a>, <a href="#npm_package-srcs">srcs</a>, <a href="#npm_package-visibility">visibility</a>, <a href="#npm_package-kwargs">**kwargs</a>)
</pre>

**PARAMETERS**

| Name                                          | Description               | Default Value |
| :-------------------------------------------- | :------------------------ | :------------ |
| <a id="npm_package-name"></a>name             | <p align="center"> - </p> | none          |
| <a id="npm_package-srcs"></a>srcs             | <p align="center"> - </p> | none          |
| <a id="npm_package-visibility"></a>visibility | <p align="center"> - </p> | `None`        |
| <a id="npm_package-kwargs"></a>kwargs         | <p align="center"> - </p> | none          |
