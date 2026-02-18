load("//nodejs:rules.bzl", "nodejs_binary")
load("//npm:npm.bzl", "package_repo_name")
load(":npm.bzl", "nodejs_npm_label")

def _nodejs_npm_bin(repo, package_id, bin):
    native.alias(
        name = "node",
        actual = nodejs_npm_label(package_repo_name(repo, package_id), bin),
        visibility = ["//visibility:public"],
    )

def _nodejs_npm_hub(repo, root):
    pass

def _nodejs_npm_spoke(repo, package, files):
    for bin, path in package.bins.items():
        nodejs_binary(
            name = "node/%s" % bin,
            dep = ":lib",
            main = path,
            visibility = ["//visibility:public"],
        )

npm_plugin = struct(
    bin = _nodejs_npm_bin,
    hub = _nodejs_npm_hub,
    spoke = _nodejs_npm_spoke,
)
