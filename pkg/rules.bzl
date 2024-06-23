load("@rules_pkg//pkg:tar.bzl", "pkg_tar")

def pkg_runfiles_manifest(name, pkg, visibility = None, **kwargs):
    _pkg_runfiles_manifest(
        name = name,
        archive = ":%s.tar" % name,
    )

    pkg_tar(
        name = "%s.tar" % name,
        srcs = [pkg],
        visibility = ["//visibility:private"],
        **kwargs
    )

def _pkg_runfiles_manifest_impl(ctx):
    actions = ctx.actions
    archive_manifest = ctx.attr.archive[OutputGroupInfo].manifest.to_list()[0]
    name = ctx.attr.name
    runfiles_manifest = ctx.executable._runfiles_manifest
    runfiles_manifest_default = ctx.attr._runfiles_manifest[DefaultInfo]
    workspace = ctx.workspace_name

    output = actions.declare_file("%s.json" % name)
    args = actions.args()
    args.add("--workspace", workspace)
    args.add(archive_manifest)
    args.add(output)
    actions.run(
        arguments = [args],
        executable = runfiles_manifest,
        inputs = [archive_manifest],
        outputs = [output],
        tools = [runfiles_manifest_default.files_to_run],
    )

    default_info = DefaultInfo(files = depset([output]))

    return [default_info]

_pkg_runfiles_manifest = rule(
    attrs = {
        "archive": attr.label(
            allow_single_file = [".tar"],
            mandatory = True,
        ),
        "_runfiles_manifest": attr.label(
            cfg = "exec",
            default = "//pkg/runfiles-manifest:bin",
            executable = True,
        ),
    },
    implementation = _pkg_runfiles_manifest_impl,
)
