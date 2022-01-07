load("//commonjs:workspace.bzl", "cjs_npm_plugin")
load("//nodejs:workspace.bzl", nodejs_repositories = "repositories")
load("//npm:workspace.bzl", "npm")
load("//typescript:workspace.bzl", "ts_npm_plugin")
load(":npm_data.bzl", "PACKAGES", "ROOTS")

def _fix_angular_material(package, angular_platform_browser):
    package = dict(**package)
    package["deps"] = package["deps"] + [{"name": angular_platform_browser["name"], "dep": angular_platform_browser["id"]}]
    return package

def repositories():
    nodejs_repositories()

    packages = PACKAGES
    angular_platform_browser = [package for package in packages if package["name"] == "@angular/platform-browser"][0]
    packages = [_fix_angular_material(package, angular_platform_browser) if package["name"] == "@angular/material" else package for package in packages]

    plugins = [
        cjs_npm_plugin(),
        ts_npm_plugin(),
    ]
    npm("better_rules_javascript_npm", packages, ROOTS, plugins)
