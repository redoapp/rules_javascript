load("@bazel_skylib//lib:selects.bzl", "selects")
load("//commonjs:providers.bzl", "cjs_npm_label")
load("//javascript:npm_plugin.bzl", js_npm_plugin = "npm_plugin")
load("//javascript:providers.bzl", "JsInfo", "js_npm_inner_label", "js_npm_label")
load("//javascript:rules.bzl", "js_library")
load("//typescript:rules.bzl", "ts_export", "ts_import")

def _ts_npm_hub(id, package_name):
    ts_export(
        name = "lib",
        dep = js_npm_label(id),
        package_name = package_name,
        visibility = ["//visibility:public"],
    )

def _ts_npm_spoke(package, files):
    has_ts = False
    for file in files:
        if file.endswith(".d.ts"):
            has_ts = True
            break
    if not has_ts:
        return js_npm_plugin.spoke(package, files)

    deps = []
    exports = []
    for i, dep in enumerate(package.deps):
        if not dep["name"]:
            deps.append(js_npm_label(dep["id"]))
            continue
        name = "import%s" % i
        deps.append(name)
        ts_export(
            name = name,
            dep = js_npm_label(dep["id"]),
            package_name = dep["name"],
        )

    native.alias(
        name = "lib.inner",
        actual = select({
            ":compatible": ":lib.inner1",
            "//conditions:default": Label("//typescript/null:lib"),
        }),
        visibility = ["//visibility:public"],
    )

    ts_import(
        name = "lib.inner1",
        declarations = [":files"],
        deps = deps,
        js = [":files"] if not package.name.startswith("@types/") else [],
        root = ":root",
        visibility = ["//visibility:public"],
    )

    if package.extra_deps:
        ts_export(
            name = "lib",
            dep = ":lib.inner",
            extra_deps = [":lib.export.%s" % i for i in range(len(package.extra_deps))],
            visibility = ["//visibility:public"],
        )
    else:
        native.alias(
            name = "lib",
            actual = ":lib.inner",
            visibility = ["//visibility:public"],
        )

    for i, (id, deps) in enumerate(package.extra_deps.items()):
        ts_export(
            name = "lib.export.%s" % i,
            dep = js_npm_inner_label(id),
            deps = [js_npm_inner_label(dep["id"]) for dep in deps],
        )

npm_plugin = struct(
    hub = _ts_npm_hub,
    spoke = _ts_npm_spoke,
)
