# OpenAPI

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Guide](#guide)
  - [Use](#use)
- [//openapi:rules.bzl](#openapirulesbzl)
  - [openapi_ts](#openapi_ts)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Guide

## Use

To format:

```sh
bazel run //:prettier_format -- write
```

To check format (e.g. in CI):

```sh
bazel run //:prettier_format
```

# //openapi:rules.bzl

<!-- Generated with Stardoc: http://skydoc.bazel.build -->

<a id="openapi_ts"></a>

## openapi_ts

<pre>
load("@better_rules_javascript//openapi:rules.bzl", "openapi_ts")

openapi_ts(<a href="#openapi_ts-name">name</a>, <a href="#openapi_ts-src">src</a>, <a href="#openapi_ts-options">options</a>, <a href="#openapi_ts-output">output</a>)
</pre>

**ATTRIBUTES**

| Name                                   | Description                    | Type                                                                                                                                                               | Mandatory | Default             |
| :------------------------------------- | :----------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------- | :------------------ |
| <a id="openapi_ts-name"></a>name       | A unique name for this target. | <a href="https://bazel.build/concepts/labels#target-names">Name</a>                                                                                                | required  |                     |
| <a id="openapi_ts-src"></a>src         | OpenAPI spec                   | <a href="https://bazel.build/concepts/labels">Label</a>                                                                                                            | required  |                     |
| <a id="openapi_ts-options"></a>options | Openapi-typescript options     | List of strings                                                                                                                                                    | optional  | `["--alphabetize"]` |
| <a id="openapi_ts-output"></a>output   | TypeScript output              | <a href="https://bazel.build/concepts/labels">Label</a>; <a href="https://bazel.build/reference/be/common-definitions#configurable-attributes">nonconfigurable</a> | optional  | `None`              |
