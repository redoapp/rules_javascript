load("//rules/commonjs:providers.bzl", "CjsInfo")
load("//rules/javascript:providers.bzl", _JsInfo = "JsInfo")
load(":aspects.bzl", _js_proto_aspect = "js_proto_aspect")
load("//rules/util:path.bzl", "runfile_path")
load(":providers.bzl", _JsProtobuf = "JsProtobuf")

def _js_protoc_impl(ctx):
    js_protobuf = _JsProtobuf(
        root = ctx.attr.root[CjsInfo],
        runtime = ctx.attr.runtime[_JsInfo],
    )

    return [js_protobuf]

js_protoc = rule(
    implementation = _js_protoc_impl,
    attrs = {
        "root": attr.label(
            doc = "CommonJS root",
            providers = [CjsInfo],
        ),
        "runtime": attr.label(
            doc = "Runtime dependencies",
            providers = [_JsInfo],
        ),
    },
)

def _js_proto_library(ctx):
    js_info = ctx.attr.dep[_JsInfo]

    return [js_info]

def js_proto_library_rule(js_proto):
    return rule(
        implementation = _js_proto_library,
        attrs = {
            "dep": attr.label(
                aspects = [js_proto],
            ),
        },
    )