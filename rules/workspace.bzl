load("//commonjs:workspace.bzl", "cjs_npm_plugin")
load("//nodejs:workspace.bzl", "nodejs_repositories", "nodejs_toolchains")
load("//nodejs/default:nodejs.bzl", "NODEJS_REPOSITORIES")
load("//npm:workspace.bzl", "npm")
load("//typescript:workspace.bzl", "ts_npm_plugin")
load(":npm_data.bzl", "PACKAGES", "ROOTS")

def repositories(nodejs_version = "24.4.1"):
    nodejs_repositories(
        name = "better_rules_javascript_nodejs",
        repositories = NODEJS_REPOSITORIES[nodejs_version],
    )

    nodejs_toolchains(
        toolchain = Label("//nodejs/default:nodejs_runtime"),
        repositories = NODEJS_REPOSITORIES[nodejs_version],
    )

    npm(
        name = "better_rules_javascript_npm",
        packages = PACKAGES,
        roots = ROOTS,
        plugins = [
            cjs_npm_plugin(),
            ts_npm_plugin(),
        ],
    )
