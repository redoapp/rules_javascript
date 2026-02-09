load("@bazel_skylib//lib:selects.bzl", "selects")
load("@bazel_util//file:rules.bzl", "untar")
load("@rules_javascript//commonjs:rules.bzl", "cjs_root")

def _cjs_npm_hub(repo, root):
    pass

def _cjs_npm_spoke(repo, package, files):
    selects.config_setting_group(
        name = "arch",
        match_any = [Label("//nodejs/platform:arch_%s" % arch) for arch in package.arch] if package.arch else ["//conditions:default"],
    )

    selects.config_setting_group(
        name = "compatible",
        match_all = [":arch", ":os"],
    )

    untar(
        name = "files",
        srcs = ["package.tar.gz"],
        strip_components = 1,
    )

    selects.config_setting_group(
        name = "os",
        match_any = [Label("//nodejs/platform:platform_%s" % os) for os in package.os] if package.os else ["//conditions:default"],
    )

    cjs_root(
        name = "root",
        descriptors = [":files"],
        package_name = package.name,
        path = "files",
        visibility = ["//visibility:public"],
    )

npm_plugin = struct(
    hub = _cjs_npm_hub,
    spoke = _cjs_npm_spoke,
)
