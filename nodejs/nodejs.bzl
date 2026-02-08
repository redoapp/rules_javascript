load("//util:path.bzl", "runfile_path")

NodejsRuntimeInfo = provider(
    doc = "Node.js runtime.",
    fields = {
        "bin": "Node.js executable",
    },
)

NodejsInfo = provider(
    doc = "Node.js executable information.",
    fields = {
        "bin": "Node.js executable",
        "options": "Node.js options",
    },
)

def nodejs_runtime_rule(toolchain_type):
    def nodejs_runtime_impl(ctx):
        nodejs_toolchain = ctx.toolchains[toolchain_type]

        nodejs_runtime_info = NodejsRuntimeInfo(bin = nodejs_toolchain.bin)

        return [nodejs_runtime_info]

    nodejs_runtime = rule(
        implementation = nodejs_runtime_impl,
        provides = [NodejsRuntimeInfo],
        toolchains = [toolchain_type],
    )

    return nodejs_runtime

nodejs_runtime = nodejs_runtime_rule(toolchain_type = Label(":nodejs_runtime"))
