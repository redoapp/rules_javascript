"""
TypeScript repositories
"""

load("//commonjs:providers.bzl", "cjs_npm_label")
load("//javascript:providers.bzl", "JsInfo", "js_npm_inner_label", "js_npm_label")
load("//javascript:workspace.bzl", "js_npm_plugin")

def _ts_npm_alias_build(package_name, repo):
    return """
load("@better_rules_javascript//typescript:rules.bzl", "ts_export")

ts_export(
    name = "lib",
    dep = {label},
    package_name = {package_name},
    visibility = ["//visibility:public"],
)
    """.strip().format(
        label = json.encode(js_npm_label(repo)),
        package_name = json.encode(package_name),
    )

def _ts_npm_package_build(package, files):
    if not any([file.endswith(".d.ts") for file in files]):
        return js_npm_plugin().package_build(package, files)

    deps = []
    exports = []
    for i, dep in enumerate(package.deps):
        if not dep.name:
            deps.append(js_npm_label(dep.id))
            continue
        name = "import%s" % i
        deps.append(name)
        exports.append(
            """
ts_export(
    name = {name},
    dep = {dep},
    package_name = {package_name},
)
""".strip().format(
                name = json.encode(name),
                dep = json.encode(js_npm_label(dep.id)),
                package_name = json.encode(dep.name),
            ),
        )

    result = """
load("@bazel_skylib//lib:selects.bzl", "selects")
load("@better_rules_javascript//javascript:rules.bzl", "js_library")
load("@better_rules_javascript//typescript:rules.bzl", "ts_export", "ts_import")

{exports}

selects.config_setting_group(
    name = "arch",
    match_any = {arch},
)

selects.config_setting_group(
    name = "compatible",
    match_all = [":arch", ":os"],
)

alias(
    name = "lib.inner",
    actual = select({{":compatible": ":lib.inner1", "//conditions:default": "@better_rules_javascript//typescript/null:lib"}}),
    visibility = ["//visibility:public"],
)

ts_import(
    name = "lib.inner1",
    declarations = [":files"],
    deps = {deps},
    js = {js},
    root = ":root",
    visibility = ["//visibility:public"],
)

selects.config_setting_group(
    name = "os",
    match_any = {os},
)
    """.strip().format(
        arch = json.encode(["@better_rules_javascript//nodejs/platform:arch_%s" % arch for arch in package.arch] if package.arch else ["//conditions:default"]),
        deps = json.encode(deps),
        exports = "\n\n".join(exports),
        js = [":files"] if not package.name.startswith("@types/") else [],
        os = json.encode(["@better_rules_javascript//nodejs/platform:platform_%s" % os for os in package.os] if package.os else ["//conditions:default"]),
    )
    result += "\n"

    if package.extra_deps:
        result += """
ts_export(
    name = "lib",
    dep = ":lib.inner",
    extra_deps = {extra_deps},
    visibility = ["//visibility:public"]
)
        """.strip().format(
            extra_deps = json.encode([":lib.export.%s" % i for i in range(len(package.extra_deps))]),
        )
    else:
        result += """
alias(
    name = "lib",
    actual = ":lib.inner",
    visibility = ["//visibility:public"],
)
        """.strip()
    result += "\n"

    for i, (id, deps) in enumerate(package.extra_deps.items()):
        result += """
ts_export(
    name = {name},
    dep = {dep},
    deps = {deps},
)
        """.strip().format(
            name = json.encode("lib.export.%s" % i),
            dep = json.encode(js_npm_inner_label(id)),
            deps = json.encode([js_npm_inner_label(dep["id"]) for dep in deps]),
        )
        result += "\n"

    return result

def ts_npm_plugin():
    def alias_build(package_name, repo):
        return _ts_npm_alias_build(package_name, repo)

    def package_build(package, files):
        return _ts_npm_package_build(package, files)

    return struct(
        alias_build = alias_build,
        package_build = package_build,
    )

"""
DEPRECATED: Use ts_npm_plugin instead.
"""
ts_directory_npm_plugin = ts_npm_plugin
