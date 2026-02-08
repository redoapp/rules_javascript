load("//playwright:repositories.bzl", "playwright_http_archive", "playwright_toolchains", playwright_repo = "playwright")

_browsers_tag = tag_class(
    attrs = {
        "data": attr.label(allow_single_file = [".json"], mandatory = True),
        "playwright": attr.label(mandatory = True),
        "name": attr.string(mandatory = True),
        "tools": attr.string_list(mandatory = True),
    },
)

def _playwright_impl(ctx):
    toolsets = []

    for module in ctx.modules:
        for browsers in module.tags.browsers:
            data = json.decode(ctx.read(browsers.data)) if ctx.path(browsers.data).exists else {"tools": {}, "toolVersions": {}}

            playwright_repo(
                name = browsers.name,
                data = str(browsers.data),
                playwright = browsers.playwright,
                tools = browsers.tools,
            )

            toolsets.append({"name": browsers.name, "tools": data["tools"]})

            for name, tool_version in data["toolVersions"].items():
                playwright_http_archive(
                    name = "%s_%s" % (browsers.name, name.replace("-", "_")),
                    integrity = tool_version["integrity"],
                    path = tool_version["path"],
                    urls = [
                        "https://cdn.playwright.dev/dbazure/download/playwright/%s" % tool_version["urlPath"],
                        "https://playwright.azureedge.net/dbazure/download/playwright/%s" % tool_version["urlPath"],
                        "https://cdn.playwright.dev/dbazure/download/playwright/%s" % tool_version["urlPath"],
                    ],
                )

    playwright_toolchains(
        name = "playwright_toolchains",
        toolsets = [json.encode(toolset) for toolset in toolsets],
    )

    return ctx.extension_metadata(
        reproducible = True,
    )

playwright = module_extension(
    implementation = _playwright_impl,
    tag_classes = {"browsers": _browsers_tag},
)
