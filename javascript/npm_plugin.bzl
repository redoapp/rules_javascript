load("@rules_javascript//javascript:rules.bzl", "js_export", "js_library")
load("//commonjs:providers.bzl", "cjs_npm_label")
load("//npm:npm.bzl", "package_repo_name")
load(":npm.bzl", "js_npm_inner_label", "js_npm_label")

def _js_npm_hub(repo, root):
    js_export(
        name = "lib",
        dep = js_npm_label(package_repo_name(repo, root.id)),
        package_name = root.name,
        visibility = ["//visibility:public"],
    )

def _js_npm_spoke(repo, package, files):
    deps = []
    exports = []
    for i, dep in enumerate(package.deps):
        if not dep.name:
            deps.append(js_npm_label(package_repo_name(repo, dep.id)))
            continue
        name = "import%s" % i
        deps.append(name)
        js_export(
            name = name,
            dep = js_npm_label(package_repo_name(repo, dep.id)),
            package_name = dep.name,
        )

    native.alias(
        name = "lib.inner",
        actual = select({
            ":compatible": ":lib.inner1",
            "//conditions:default": Label("//javascript/null:lib"),
        }),
        visibility = ["//visibility:public"],
    )

    js_library(
        name = "lib.inner1",
        root = ":root",
        deps = deps,
        srcs = [":files"],
    )

    if package.extra_deps:
        js_export(
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
        js_export(
            name = "lib.export.%s" % i,
            dep = js_npm_inner_label(package_repo_name(repo, id)),
            deps = [js_npm_inner_label(package_repo_name(repo, dep.id)) for dep in deps],
        )

npm_plugin = struct(
    hub = _js_npm_hub,
    spoke = _js_npm_spoke,
)
