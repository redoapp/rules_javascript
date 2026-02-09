load("@bazel_skylib//lib:collections.bzl", "collections")
load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")
load(":browser.bzl", "tool_platform")

def _playwright_impl(ctx):
    data = ctx.attr.data
    tools = ctx.attr.tools
    playwright = ctx.attr.playwright

    data_content = json.decode(ctx.read(data)) if ctx.path(data).exists else {"tools": {}, "toolVersions": {}}

    content = ""
    for tool in data_content["tools"]:
        ctx.template(
            "%s/BUILD.bazel" % tool,
            Label("playwright-tool.BUILD.bazel.tpl"),
            substitutions = {
                "%{var}": tool.replace("-", "_"),
            },
        )

        content += """
load(":rules.bzl", "{var}")
toolchain_type(
  name = "{var}_type",
  visibility = ["//visibility:public"],
)
        """.strip().format(
            var = tool.replace("-", "_"),
        )
        content += "\n\n"
    ctx.template(
        "BUILD.bazel",
        Label("playwright.BUILD.bazel.tpl"),
        substitutions = {
            "%{content}": content,
            "%{data}": repr("/%s" % "/".join([part for part in [data.package, data.name] if part])),
            "%{playwright}": repr(str(playwright)),
            "%{rules}": repr(str(Label("rules.bzl"))),
            "%{tools}": repr(tools),
        },
    )

    content = ""
    for tool in tools:
        content += """
{var} = playwright_tool_rule(Label(":{var}_type"))
        """.strip().format(
            var = tool.replace("-", "_"),
        )
        content += "\n\n"

    ctx.template(
        "rules.bzl",
        Label("playwright-rules.bzl.tpl"),
        substitutions = {
            "%{content}": content,
            "%{rules}": repr(str(Label("rules.bzl"))),
        },
    )

playwright = repository_rule(
    attrs = {
        "data": attr.label(allow_single_file = [".json"], mandatory = True),
        "playwright": attr.label(mandatory = True),
        "tools": attr.string_list(),
    },
    implementation = _playwright_impl,
)

def _playwright_http_archive_impl(ctx):
    path = ctx.attr.path
    integrity = ctx.attr.integrity
    urls = ctx.attr.urls

    ctx.template(
        "BUILD.bazel",
        Label("playwright-toolchain.BUILD.bazel.tpl"),
        substitutions = {
            "%{rules}": repr(str(Label("rules.bzl"))),
            "%{path}": repr(path),
        },
    )

    ctx.download_and_extract(
        output = "files",
        integrity = integrity,
        url = urls,
    )

playwright_http_archive = repository_rule(
    implementation = _playwright_http_archive_impl,
    attrs = {
        "path": attr.string(mandatory = True),
        "integrity": attr.string(mandatory = True),
        "urls": attr.string_list(mandatory = True),
    },
)

def _playwright_toolchains_impl(ctx):
    toolsets = [json.decode(tool) for tool in ctx.attr.toolsets]

    content = ""
    for toolset in toolsets:
        content += """
playwright_tool_toolchains(
    name = {name},
    tools = {tools},
    visibility = ["//visibility:public"],
)
        """.strip().format(
            name = repr(toolset["name"]),
            tools = repr(toolset["tools"]),
        )

    ctx.template(
        "BUILD.bazel",
        Label("playwright-toolchains.BUILD.bazel.tpl"),
        substitutions = {
            "%{content}": content,
            "%{browser}": repr(str(Label("browser.bzl"))),
        },
    )

playwright_toolchains = repository_rule(
    implementation = _playwright_toolchains_impl,
    attrs = {
        "toolsets": attr.string_list(mandatory = True),
    },
)

# def playwright_toolchains(tools, toolchain_prefix):
#     for tool_name, tool_platforms in tools.items():
#         for platform in sorted(collections.uniq([tool_platform(tool) for tool in tool_platforms]), key = _tool_platform_key):
#             toolchain = "%s%s.%s_%s" % (
#                 toolchain_prefix,
#                 tool_name,
#                 str(platform.os).replace("@platforms//os:", ""),
#                 str(platform.arch).replace("@platforms//cpu:", ""),
#             ) if platform else "%s%s" % (toolchain_prefix, tool_name)
#             native.register_toolchains(toolchain)

# def _tool_platform_key(tool_platform):
#     return not tool_platform
