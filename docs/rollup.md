# Rollup

Rollup bundles modules into one or more files.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Guide](#guide)
  - [Reference](#reference)
  - [Install](#install)
  - [Use](#use)
- [//rollup:rules.bzl](#rolluprulesbzl)
  - [rollup](#rollup)
  - [rollup_bundle](#rollup_bundle)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Guide

## Reference

[Starlark reference](stardoc/rollup.md)

## Install

Add rollup as an [external dependency](#external_dependencies).

## Use

**example/package.json**

```json
{}
```

**example/a.js**

```js
export const a = "apple";
```

**example/b.js**

```js
import { a } from "./a";

console.log(a);
```

**example/rollup.config.js**

```js
export default {
  input: `${process.env.ROLLUP_INPUT_ROOT}/index.js`,
  output: { file: process.env.ROLLUP_OUTPUT, format: "cjs" },
};
```

**example/BUILD.bzl**

```bzl
load("@rules_javascript//javascript:rules.bzl", "js_file", "js_library")
load("@rules_javascript//rollup:rules.bzl", "configure_rollup", "rollup_bundle")

cjs_root(
  name = "root",
  descriptor = "package.json"
)

js_library(
    name = "js",
    root = ":root",
    srcs = ["a.js", "b.js"],
)

js_file(
    name = "rollup_config",
    root = ":root",
    src = "rollup.config.js",
)

configure_rollup(
    name = "rollup",
    config = ":rollup_config",
    dep = "@npm//rollup:lib",
)

rollup_bundle(
    name = "bundle",
    dep = ":b",
    rollup = ":rollup",
)
```

# //rollup:rules.bzl

<!-- Generated with Stardoc: http://skydoc.bazel.build -->

<a id="rollup"></a>

## rollup

<pre>
load("@rules_javascript//rollup:rules.bzl", "rollup")

rollup(<a href="#rollup-name">name</a>, <a href="#rollup-dep">dep</a>, <a href="#rollup-node">node</a>)
</pre>

Rollup.

**ATTRIBUTES**

| Name                         | Description                    | Type                                                                | Mandatory | Default                       |
| :--------------------------- | :----------------------------- | :------------------------------------------------------------------ | :-------- | :---------------------------- |
| <a id="rollup-name"></a>name | A unique name for this target. | <a href="https://bazel.build/concepts/labels#target-names">Name</a> | required  |                               |
| <a id="rollup-dep"></a>dep   | -                              | <a href="https://bazel.build/concepts/labels">Label</a>             | optional  | `None`                        |
| <a id="rollup-node"></a>node | -                              | <a href="https://bazel.build/concepts/labels">Label</a>             | optional  | `"@rules_javascript//nodejs"` |

<a id="rollup_bundle"></a>

## rollup_bundle

<pre>
load("@rules_javascript//rollup:rules.bzl", "rollup_bundle")

rollup_bundle(<a href="#rollup_bundle-name">name</a>, <a href="#rollup_bundle-config">config</a>, <a href="#rollup_bundle-dep">dep</a>, <a href="#rollup_bundle-output">output</a>, <a href="#rollup_bundle-rollup">rollup</a>)
</pre>

Rollup bundle

**ATTRIBUTES**

| Name                                    | Description                                           | Type                                                                | Mandatory | Default                       |
| :-------------------------------------- | :---------------------------------------------------- | :------------------------------------------------------------------ | :-------- | :---------------------------- |
| <a id="rollup_bundle-name"></a>name     | A unique name for this target.                        | <a href="https://bazel.build/concepts/labels#target-names">Name</a> | required  |                               |
| <a id="rollup_bundle-config"></a>config | -                                                     | <a href="https://bazel.build/concepts/labels">Label</a>             | optional  | `None`                        |
| <a id="rollup_bundle-dep"></a>dep       | JavaScript dependencies                               | <a href="https://bazel.build/concepts/labels">Label</a>             | optional  | `None`                        |
| <a id="rollup_bundle-output"></a>output | Output directory. Defaults to the name as the target. | String                                                              | optional  | `""`                          |
| <a id="rollup_bundle-rollup"></a>rollup | Rollup tools                                          | <a href="https://bazel.build/concepts/labels">Label</a>             | optional  | `"@rules_javascript//rollup"` |
