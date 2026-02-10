load("@bazel_skylib//lib:selects.bzl", "selects")
load("//commonjs:providers.bzl", "cjs_npm_label")
load("//javascript:npm.bzl", "js_npm_inner_label", "js_npm_label")
load("//javascript:npm_plugin.bzl", js_npm_plugin = "npm_plugin")
load("//javascript:providers.bzl", "JsInfo")
load("//javascript:rules.bzl", "js_library")
load("//npm:npm.bzl", "package_repo_name")
load("//typescript:rules.bzl", "js_import_ts", "ts_export", "ts_import")

def _ts_npm_hub(repo, root):
    ts_export(
        name = "lib",
        dep = js_npm_label(package_repo_name(repo, root.id)),
        package_name = root.name,
        visibility = ["//visibility:public"],
    )
    if root.name.startswith("@types/"):
        js_import_ts(
            name = "lib_js",
            dep = ":lib",
            visibility = ["//visibility:public"],
        )
    else:
        native.alias(
            name = "lib_js",
            actual = ":lib",
            visibility = ["//visibility:public"],
        )

def _ts_npm_spoke(repo, package, files):
    has_ts = False
    for file in files:
        if file.endswith(".d.ts"):
            has_ts = True
            break
    if not has_ts:
        js_npm_plugin.spoke(repo, package, files)
        return

    deps = []
    exports = []
    for i, dep in enumerate(package.deps):
        if not dep.name:
            deps.append(js_npm_label(package_repo_name(repo, dep.id)))
            continue
        name = "import%s" % i
        deps.append(name)
        ts_export(
            name = name,
            dep = js_npm_label(package_repo_name(repo, dep.id)),
            package_name = dep.name,
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
            extra_deps = [":lib.export.%s" % index for index, _ in enumerate(package.extra_deps)],
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
            dep = js_npm_inner_label(package_repo_name(repo, id)),
            deps = [js_npm_inner_label(package_repo_name(repo, dep.id)) for dep in deps],
        )

npm_plugin = struct(
    hub = _ts_npm_hub,
    spoke = _ts_npm_spoke,
)
