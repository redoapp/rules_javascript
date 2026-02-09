load(":repositories.bzl", "npm", "npm_package")

_workspace_tag = tag_class(
    attrs = {
        "path": attr.string(mandatory = True),
        "name": attr.string(mandatory = True),
        "data": attr.label(mandatory = True),
        "plugins": attr.label_list(),
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
                packages = [json.encode({"id": _package_repo_name(workspace.name, root["id"]), "name": root["name"]}) for root in data["roots"]],
                plugins = workspace.plugins,
                data = workspace.data,
                path = workspace.path,
            )

            for package_id, package in data["packages"].items():
                npm_package(
                    name = _package_repo_name(workspace.name, package_id),
                    arch = package.get("arch"),
                    package_name = package["name"],
                    plugins = workspace.plugins,
                    integrity = package["integrity"],
                    deps = [json.encode({"id": _package_repo_name(workspace.name, dep["id"]), "name": dep.get("name")}) for dep in package.get("deps", [])],
                    extra_deps = {
                        _package_repo_name(workspace.name, id): [json.encode({"id": _package_repo_name(workspace.name, dep["id"]), "name": dep.get("name")}) for dep in deps]
                        for id, deps in package.get("extraDeps", {}).items()
                    },
                    libc = package.get("libc"),
                    os = package.get("os"),
                    url = package["url"],
                )

    return ctx.extension_metadata(
        reproducible = True,
    )

yarn = module_extension(
    implementation = _yarn_impl,
    tag_classes = {"workspace": _workspace_tag},
)

def _package_repo_name(prefix, name):
    """Repository name for npm package.

    Replaces characters not permitted in Bazel repository names.

    Args:
        prefix: Namespace
        name: ID
    """
    if name.startswith("@"):
        name = name[len("@"):]
    name = name.replace("@", "_")
    name = name.replace("/", "_")
    return "%s_%s" % (prefix, name)
