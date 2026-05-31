load("@bazel_lib//lib:copy_directory.bzl", "copy_directory")
load("@bazel_skylib//lib:selects.bzl", "selects")
load("@rules_javascript//commonjs:rules.bzl", "cjs_root")

def _cjs_npm_bin(repo, package_id, bin):
    pass

def _cjs_npm_hub(repo, root):
    pass

def _cjs_npm_package(repo, package):
    pass

def _cjs_npm_spoke(repo, package):
    # Reduce the number of runfiles, by using a directory
    # Note that source directories are not directly suitable, due to
    # https://github.com/bazelbuild/bazel/issues/12954
    copy_directory(
        name = "files",
        src = "src",
        out = "files",
        hardlink = "on",
    )

    cjs_root(
        name = "root",
        descriptors = [":files"],
        package_name = package.name,
        path = "files",
        visibility = ["//visibility:public"],
    )

    compatible = []
    if package.arch:
        selects.config_setting_group(
            name = "arch",
            match_any = [Label("//nodejs/platform:arch_%s" % arch) for arch in package.arch],
        )
        compatible.append(":arch")
    if package.os:
        selects.config_setting_group(
            name = "os",
            match_any = [Label("//nodejs/platform:platform_%s" % os) for os in package.os],
        )
        compatible.append(":os")

    if not compatible:
        native.alias(
            name = "compatible",
            actual = Label("//bazel:always_true")
        )
    elif len(compatible) == 1:
        native.alias(
            name = "compatible",
            actual = compatible[0],
        )
    else:
        selects.config_setting_group(
            name = "compatible",
            match_all = compatible,
        )

npm_plugin = struct(
    bin = _cjs_npm_bin,
    hub = _cjs_npm_hub,
    package = _cjs_npm_package,
    spoke = _cjs_npm_spoke,
)
