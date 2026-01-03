load("@bazel_features//:deps.bzl", "bazel_features_deps")
load("@rules_pkg//:deps.bzl", "rules_pkg_dependencies")
load("@rules_proto//proto:repositories.bzl", "rules_proto_dependencies")
load("@rules_proto//proto:toolchains.bzl", "rules_proto_toolchains")
load("@rules_python//python:repositories.bzl", "py_repositories", "python_register_toolchains")
load("//commonjs:workspace.bzl", "cjs_npm_plugin")
load("//npm:workspace.bzl", "npm")
load("//playwright/default:workspace.bzl", "playwright_repositories", "playwright_toolchains")
load("//rules:workspace.bzl", javascript_repositories = "repositories")
load("//tools/npm:npm.bzl", "PACKAGES", "ROOTS")
load("//typescript:workspace.bzl", "ts_npm_plugin")

def test_repositories1():
    # Bazel features
    bazel_features_deps()

    # Python
    py_repositories()
    python_register_toolchains(name = "python_3_11", python_version = "3.11")

    # Rules pkg

    rules_pkg_dependencies()

    # Protobuf

    rules_proto_dependencies()

    rules_proto_toolchains()

    # JavaScript

    javascript_repositories()

    plugins = [
        cjs_npm_plugin(),
        ts_npm_plugin(),
    ]
    npm("npm", PACKAGES, ROOTS, plugins)

    playwright_repositories()
    playwright_toolchains()
