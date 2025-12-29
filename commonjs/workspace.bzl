def _cjs_directory_npm_package_build(package):
    return """
load("@better_rules_javascript//commonjs:rules.bzl", "cjs_root")
load("@bazel_util//file:rules.bzl", "untar")

untar(
    name = "files",
    srcs = {archives},
    strip_components = 1,
)

cjs_root(
    name = "root",
    descriptors = [":files"],
    package_name = {package_name},
    path = "files",
    visibility = ["//visibility:public"],
)
    """.strip().format(
        archives = json.encode([str(archive) for archive in package.archives]),
        package_name = json.encode(package.name),
    )

def _cjs_npm_package_build(package):
    return """
load("@better_rules_javascript//commonjs:rules.bzl", "cjs_root")

cjs_root(
    name = "root",
    descriptors = glob(["npm/**/package.json"]),
    package_name = {package_name},
    strip_prefix = "npm",
)
    """.strip().format(
        package_name = json.encode(package.name),
    )

def cjs_directory_npm_plugin():
    def alias_build(package_name, repo):
        return ""

    def package_build(package, files):
        return _cjs_directory_npm_package_build(package)

    return struct(
        alias_build = alias_build,
        package_build = package_build,
    )

def cjs_npm_plugin():
    def alias_build(package_name, repo):
        return ""

    def package_build(package, files):
        return _cjs_npm_package_build(package)

    return struct(
        alias_build = alias_build,
        package_build = package_build,
    )
