load("@bazel_skylib//lib:collections.bzl", "collections")
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
load("//playwright/default:browsers.bzl", "TOOLS", "TOOL_VERSIONS")
load(":browser.bzl", "tool_platform")

def playwright_repositories(tool_versions = TOOL_VERSIONS):
    for name, tool_version in tool_versions.items():
        http_archive(
            add_prefix = "files",
            build_file_content = """
load("@better_rules_javascript//playwright:rules.bzl", "playwright_toolchain")

playwright_toolchain(
    name = "tool",
    file = "files",
    path = {path},
    visibility = ["//visibility:public"],
)
""".strip().format(path = json.encode(tool_version.path)),
            name = "playwright_%s" % name,
            integrity = tool_version.integrity,
            urls = [
                "https://cdn.playwright.dev/dbazure/download/playwright/%s" % tool_version.url_path,
                "https://playwright.azureedge.net/dbazure/download/playwright/%s" % tool_version.url_path,
                "https://cdn.playwright.dev/dbazure/download/playwright/%s" % tool_version.url_path,
            ],
        )

def playwright_toolchains(tools = TOOLS):
    for tool_name, tool_platforms in tools.items():
        for platform in sorted(collections.uniq([tool_platform(tool) for tool in tool_platforms]), key = _tool_platform_key):
            native.register_toolchains(
                "@better_rules_javascript//playwright/default:%s.%s_%s" % (
                    tool_name,
                    str(platform.os).replace("@platforms//os:", ""),
                    str(platform.arch).replace("@platforms//cpu:", ""),
                ) if platform else "@better_rules_javascript//playwright/default:%s" % tool_name,
            )

def _tool_platform_key(tool_platform):
    return not tool_platform
