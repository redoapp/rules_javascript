load("@bazel_skylib//lib:shell.bzl", "shell")
load("//commonjs:providers.bzl", "CjsInfo")
load("//util:path.bzl", "runfile_path")
load(":bin.bzl", "BinInfo")

def _binary_impl(ctx):
    actions = ctx.actions
    bin_name = ctx.attr.bin_name
    file = ctx.file.file
    name = ctx.attr.name
    path = ctx.attr.path
    root_cjs = ctx.attr.root[CjsInfo]
    runner = ctx.file._runner
    workspace = ctx.workspace_name

    executable = actions.declare_file(name)
    actions.expand_template(
        substitutions = {
            "%{bin}": shell.quote("%s/%s" % (runfile_path(workspace, root_cjs.package), path)),
            "%{name}": shell.quote(bin_name),
        },
        is_executable = True,
        output = executable,
        template = runner,
    )

    bin_info = BinInfo(
        name = bin_name,
        transitive_files = depset([file]),
        path = path,
    )

    cjs_info = root_cjs

    runfiles = ctx.runfiles(files = [file])
    default_info = DefaultInfo(executable = executable, runfiles = runfiles)

    return [bin_info, cjs_info, default_info]

binary = rule(
    implementation = _binary_impl,
    attrs = {
        "bin_name": attr.string(
            doc = "Binary name",
            mandatory = True,
        ),
        "file": attr.label(
            allow_single_file = True,
            mandatory = True,
        ),
        "path": attr.string(
            doc = "Path",
            mandatory = True,
        ),
        "root": attr.label(
            providers = [CjsInfo],
            mandatory = True,
        ),
        "_runner": attr.label(
            allow_single_file = True,
            default = "binary-runner.sh.tpl",
        ),
    },
    executable = True,
    provides = [BinInfo, CjsInfo],
)
