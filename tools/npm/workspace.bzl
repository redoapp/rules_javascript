load("//commonjs:workspace.bzl", "cjs_npm_plugin")
load("//npm:workspace.bzl", "npm")
load("//tools/npm:npm.bzl", "PACKAGES", "ROOTS")
load("//typescript:workspace.bzl", "ts_npm_plugin")

def npm_deps():
    npm(
        name = "npm",
        packages = PACKAGES,
        roots = ROOTS,
        plugins = [
            cjs_npm_plugin(),
            ts_npm_plugin(),
        ],
    )
