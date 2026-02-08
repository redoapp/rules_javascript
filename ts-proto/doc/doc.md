# TS Proto

<!-- START doctoc -->
<!-- END doctoc -->

# Guide

## Reference

[Starlark reference](stardoc/ts-proto.md)

## Install

**WORKSPACE.bazel**

Add ts-proto as an [external dependency](#external-dependencies).

## Configure

**BUILD.bazel**

```bzl
load("@rules_javascript//protobuf:rules.bzl", "js_protoc")

package(default_visibility = ["//visibility:public"])

cjs_root(
    descriptor = "proto.package.json",
    name = "proto_root",
    package_name = "@rules_javascript_test/proto"
)

js_protoc(
    name = "js_protoc",
    root = ":proto_root",
    runtime = "@npm//google-protobuf:lib",
)
```

**package.json**

```json
{}
```

**rules.bzl**

```bzl
load("@rules_javascript//ts-proto:aspects.bzl", "js_proto_aspect")
load("@rules_javascript//ts-proto:rules.bzl", "js_proto_library_rule")

js_proto = js_proto_aspect("@rules_javascript_test//:lib_protoc")

js_proto_library = js_proto_library_rule(js_proto)
```

## Use

```bzl
load("@rules_proto//proto:defs.bzl", "proto_library")
load("//:rules.bzl", "js_proto_library")

proto_library(
    name = "proto",
    srcs = glob(["**/*.proto"]),
)

js_proto_library(
    name = "js",
    dep = ":proto",
)
```
