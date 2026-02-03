load("//commonjs:workspace.bzl", "cjs_npm_plugin")
load("//npm:workspace.bzl", "npm")
load("//playwright/default:workspace.bzl", "playwright_repositories", "playwright_toolchains")
load("//rules:workspace.bzl", javascript_repositories = "repositories")
load("//tools/npm:npm.bzl", "PACKAGES", "ROOTS")
load("//typescript:workspace.bzl", "ts_npm_plugin")

def test_repositories():
    # JavaScript

    javascript_repositories()

    plugins = [
        cjs_npm_plugin(),
        ts_npm_plugin(),
    ]
    npm("npm", PACKAGES, ROOTS, plugins)

    playwright_repositories()
    playwright_toolchains()
