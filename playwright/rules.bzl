load("@bazel_skylib//lib:shell.bzl", "shell")
load("//commonjs:providers.bzl", "CjsInfo", "CjsPath", "create_globals", "gen_manifest")
load("//javascript:providers.bzl", "JsInfo")
load("//nodejs:nodejs.bzl", "NodejsInfo")
load("//util:path.bzl", "output", "runfile_path")
load(":providers.bzl", "PlaywrightToolInfo")

def _playwright_browsers_resolve_impl(ctx):
    actions = ctx.actions
    bash_runfiles_default = ctx.attr._bash_runfiles[DefaultInfo]
    lib = ctx.file.lib
    name = ctx.attr.name
    path = ctx.attr.path

    if path.startswith("/"):
        path = path[len("/"):]
    else:
        path = "/".join([part for part in [ctx.label.package, path] if part])
    resolve = ctx.executable._resolve
    resolve_default = ctx.attr._resolve[DefaultInfo]
    runner = ctx.file._runner
    tools = ctx.attr.tools
    workspace = ctx.workspace_name

    bin = actions.declare_file(name)
    actions.expand_template(
        is_executable = True,
        output = bin,
        substitutions = {
            "%{lib}": shell.quote(runfile_path(workspace, lib)),
            "%{output}": shell.quote(path),
            "%{resolve}": shell.quote(runfile_path(workspace, resolve)),
            "%{tools}": " ".join([shell.quote(tool) for tool in tools]),
        },
        template = runner,
    )

    runfiles = ctx.runfiles(files = [lib])
    runfiles = runfiles.merge(bash_runfiles_default.default_runfiles)
    runfiles = runfiles.merge(resolve_default.default_runfiles)
    default_info = DefaultInfo(executable = bin, runfiles = runfiles)

    return [default_info]

playwright_browsers_resolve = rule(
    doc = "Resolve playwright browsers.",
    implementation = _playwright_browsers_resolve_impl,
    attrs = {
        "lib": attr.label(allow_single_file = True, mandatory = True),
        "path": attr.string(mandatory = True),
        "tools": attr.string_list(mandatory = True),
        "_bash_runfiles": attr.label(default = "@bazel_tools//tools/bash/runfiles"),
        "_resolve": attr.label(
            cfg = "target",
            default = "//playwright/resolve:bin",
            executable = True,
        ),
        "_runner": attr.label(
            allow_single_file = True,
            default = "resolve.sh.tpl",
        ),
    },
    executable = True,
)

def _playwright_transition_impl(settings, attrs):
    return {"//javascript:module": "node"}

_playwright_transition = transition(
    implementation = _playwright_transition_impl,
    inputs = [],
    outputs = ["//javascript:module"],
)

def _playwright_test_impl(ctx):
    actions = ctx.actions
    bash_preamble = ctx.attr.bash_preamble
    data = ctx.files.data
    data_default = [target[DefaultInfo] for target in ctx.attr.data]
    env = ctx.attr.env
    manifest_bin = ctx.attr._manifest[DefaultInfo]
    config_js = ctx.attr.config_dep[0][JsInfo]
    config_cjs = ctx.attr.config_dep[0][CjsInfo]
    config = ctx.attr.config
    esm_linker_cjs = ctx.attr._esm_linker[CjsInfo]
    esm_linker_js = ctx.attr._esm_linker[JsInfo]
    label = ctx.label
    module_linker_cjs = ctx.attr._module_linker[CjsInfo]
    module_linker_js = ctx.attr._module_linker[JsInfo]
    name = ctx.attr.name
    node = ctx.attr.node[NodejsInfo]
    node_options = node.options + ctx.attr.node_options
    runtime = ctx.file._runtime
    preload_cjs = [target[CjsInfo] for target in ctx.attr.preload]
    preload_js = [target[JsInfo] for target in ctx.attr.preload]
    playwright_cjs = ctx.attr.playwright[0][CjsInfo]
    playwright_js = ctx.attr.playwright[0][JsInfo]
    extra_deps_cjs = [target[CjsInfo] for target in ctx.attr.extra_deps]
    extra_deps_js = [target[JsInfo] for target in ctx.attr.extra_deps]
    cjs_dep = ctx.attr.dep[0][CjsInfo]
    cjs_deps = [config_cjs, playwright_cjs, esm_linker_cjs, module_linker_cjs] + [ctx.attr.dep[0][CjsInfo]] + preload_cjs + extra_deps_cjs
    js_deps = [config_js, playwright_js, esm_linker_js, module_linker_js] + [ctx.attr.dep[0][JsInfo]] + preload_js + extra_deps_js
    output_ = output(label = ctx.label, actions = actions)
    playwright_tools = [target[PlaywrightToolInfo] for target in ctx.attr.tools]
    workspace = ctx.workspace_name

    preload_modules = [
        "%s/%s" % (runfile_path(workspace, target[CjsInfo].package), target[CjsPath].path)
        for target in ctx.attr.preload
    ]

    def package_path(package):
        return runfile_path(workspace, package)

    package_manifest = actions.declare_file("%s.packages.json" % name)
    gen_manifest(
        actions = actions,
        deps = depset(
            create_globals(label, [playwright_cjs]),
            transitive = [cjs_info.transitive_links for cjs_info in cjs_deps],
        ),
        manifest = package_manifest,
        manifest_bin = manifest_bin,
        packages = depset(
            transitive = [cjs_info.transitive_packages for cjs_info in cjs_deps],
        ),
        package_path = package_path,
    )

    main_module = "%s/cli.js" % runfile_path(workspace, playwright_cjs.package)

    bin = actions.declare_file(name)
    actions.expand_template(
        output = bin,
        is_executable = True,
        substitutions = {
            "%{bin}": shell.quote(runfile_path(workspace, bin)),
            "%{config}": shell.quote("%s/%s" % (runfile_path(workspace, config_cjs.package), config)),
            "%{env}": " ".join(["%s=%s" % (name, shell.quote(value)) for name, value in env.items()]),
            "%{esm_loader}": shell.quote("%s/dist/bundle.js" % runfile_path(workspace, esm_linker_cjs.package)),
            "%{main_module}": shell.quote(main_module),
            "%{module_linker}": shell.quote("%s/dist/bundle.js" % runfile_path(workspace, module_linker_cjs.package)),
            "%{node_options}": " ".join(
                [shell.quote(option) for option in node_options] +
                [option for module in preload_modules for option in ["-r", '"$(abspath "$RUNFILES_DIR"/%s)"' % module]],
            ),
            "%{node}": shell.quote(runfile_path(workspace, node.bin)),
            "%{package_manifest}": shell.quote(runfile_path(workspace, package_manifest)),
            "%{preamble}": bash_preamble,
            "%{root}": shell.quote(runfile_path(workspace, cjs_dep.package)),
            "%{runtime}": shell.quote(runfile_path(workspace, runtime)),
            "%{workspace}": shell.quote(workspace),
        },
        template = ctx.file._runner,
    )

    runfiles = ctx.runfiles(
        files = [node.bin, package_manifest, runtime] + data,
        transitive_files = depset(
            transitive = [js_info.transitive_files for js_info in js_deps],
        ),
        root_symlinks = {
            "%s.browsers/%s" % (runfile_path(workspace, bin), playwright_tool.name): playwright_tool.file
            for playwright_tool in playwright_tools
        },
    )
    runfiles = runfiles.merge_all([default_info.default_runfiles for default_info in data_default if default_info.default_runfiles != None])

    default_info = DefaultInfo(
        executable = bin,
        runfiles = runfiles,
    )

    return [default_info]

playwright_test = rule(
    attrs = {
        "config": attr.string(
            doc = "Path to config file, relative to config_dep root.",
            mandatory = True,
        ),
        "config_dep": attr.label(
            cfg = _playwright_transition,
            doc = "Playwright config dependency.",
            mandatory = True,
            providers = [CjsInfo, JsInfo],
        ),
        "bash_preamble": attr.string(),
        "data": attr.label_list(
            allow_files = True,
            doc = "Runtime data.",
        ),
        "dep": attr.label(
            cfg = _playwright_transition,
            doc = "Test dependency.",
            mandatory = True,
            providers = [JsInfo],
        ),
        "env": attr.string_dict(
            doc = "Environment variables.",
        ),
        "extra_deps": attr.label_list(
            doc = "Additional runtime dependencies.",
            providers = [CjsInfo, JsInfo],
            cfg = _playwright_transition,
        ),
        "playwright": attr.label(
            cfg = _playwright_transition,
            doc = "Playwright dependency.",
            mandatory = True,
            providers = [CjsInfo, JsInfo],
        ),
        "node": attr.label(
            default = "//nodejs",
            providers = [NodejsInfo],
        ),
        "node_options": attr.string_list(
            doc = "Node.js options.",
        ),
        "preload": attr.label_list(
            doc = "Preloaded modules",
            providers = [CjsInfo, CjsPath, JsInfo],
            cfg = _playwright_transition,
        ),
        "tools": attr.label_list(
            doc = "Tools",
            providers = [PlaywrightToolInfo],
        ),
        "_allowlist_function_transition": attr.label(
            default = "@bazel_tools//tools/allowlists/function_transition_allowlist",
        ),
        "_esm_linker": attr.label(
            default = "//nodejs/esm-linker:dist_lib",
            providers = [CjsInfo, JsInfo],
        ),
        "_runner": attr.label(
            allow_single_file = True,
            default = "//playwright:runner.sh.tpl",
        ),
        "_manifest": attr.label(
            cfg = "exec",
            executable = True,
            default = "//commonjs/manifest:bin",
        ),
        "_module_linker": attr.label(
            default = "//nodejs/module-linker:dist_lib",
            providers = [CjsInfo, JsInfo],
        ),
        "_runtime": attr.label(
            allow_single_file = True,
            default = "runtime.js",
        ),
    },
    implementation = _playwright_test_impl,
    test = True,
)

def _playwright_toolchain_impl(ctx):
    file = ctx.file.file
    path = ctx.attr.path

    toolchain_info = platform_common.ToolchainInfo(
        file = file,
        path = path,
    )

    return [toolchain_info]

playwright_toolchain = rule(
    implementation = _playwright_toolchain_impl,
    attrs = {
        "file": attr.label(allow_single_file = True, mandatory = True),
        "path": attr.string(mandatory = True),
    },
)

def playwright_tool_rule(toolchain):
    def _impl(ctx):
        toolchain_ = ctx.toolchains[toolchain]

        playwright_tool_info = PlaywrightToolInfo(
            name = toolchain_.path,
            file = toolchain_.file,
        )

        return [playwright_tool_info]

    return rule(
        implementation = _impl,
        toolchains = [toolchain],
    )
