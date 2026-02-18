load("//npm:npm.bzl", "package_repo_name")
load(":npm.bzl", "bin_npm_label")
load(":rules.bzl", "binary")

def _bin_npm_bin(repo, package_id, bin):
    native.alias(
        name = "bin",
        actual = bin_npm_label(package_repo_name(repo, package_id), bin),
        visibility = ["//visibility:public"],
    )

def _bin_npm_hub(repo, root):
    pass

def _bin_npm_package(repo, package):
    for bin, path in package.bins.items():
        native.alias(
            name = "bin/%s" % bin,
            actual = bin_npm_label(package_repo_name(repo, package.id), bin),
            visibility = ["//visibility:public"],
        )

def _bin_npm_spoke(repo, package, files):
    for bin, path in package.bins.items():
        binary(
            name = "bin/%s" % bin,
            bin_name = bin,
            file = ":files",
            path = path,
            root = ":root",
            visibility = ["//visibility:public"],
        )

npm_plugin = struct(
    bin = _bin_npm_bin,
    hub = _bin_npm_hub,
    spoke = _bin_npm_spoke,
)
