load(":npm.bzl", "package_repo_name")
load(":repositories.bzl", "npm", "npm_package")

_workspace_tag = tag_class(
    attrs = {
        "data_output": attr.label(
            allow_single_file = [".json"],
            doc = "Output data file. Defaults to data.",
        ),
        "data": attr.label(
            allow_single_file = [".json"],
            doc = "Data file.",
            mandatory = True,
        ),
        "name": attr.string(
            doc = "Repository name. Must be unique.",
            mandatory = True,
        ),
        "path": attr.string(
            doc = "Path to Yarn workspace, relative to workspace root.",
            mandatory = True,
        ),
        "plugins": attr.label_list(
            doc = "Plugins to use.",
        ),
    },
)

def _yarn_impl(ctx):
    for module in ctx.modules:
        for workspace in module.tags.workspace:
            if ctx.path(workspace.data).exists:
                data = json.decode(ctx.read(workspace.data))
            else:
                data = {"packages": {}, "roots": []}

            npm(
                name = workspace.name,
                plugins = workspace.plugins,
                data = workspace.data,
                data_output = workspace.data_output,
                path = workspace.path,
            )

            for package_id, package in data["packages"].items():
                npm_package(
                    name = package_repo_name(workspace.name, package_id),
                    id = package_id,
                    integrity = package["integrity"],
                    url = package["url"],
                    repo = workspace.name,
                    plugins = workspace.plugins,
                )

    return ctx.extension_metadata(
        reproducible = True,
    )

yarn = module_extension(
    implementation = _yarn_impl,
    tag_classes = {"workspace": _workspace_tag},
)
