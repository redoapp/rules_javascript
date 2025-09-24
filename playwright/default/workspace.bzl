load("//playwright:workspace.bzl", playwright_repositories_ = "playwright_repositories", playwright_toolchains_ = "playwright_toolchains")
load(":browsers.bzl", "TOOLS", "TOOL_VERSIONS")

def playwright_repositories():
    playwright_repositories_(
        tool_versions = TOOL_VERSIONS,
    )

def playwright_toolchains():
    playwright_toolchains_(
        tools = TOOLS,
        toolchain_prefix = "@better_rules_javascript//playwright/default:",
    )
