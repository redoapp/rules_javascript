load("@bazel_lib//lib:paths.bzl", "relative_file", "to_rlocation_path")
load("@bazel_skylib//lib:paths.bzl", "paths")
load("@bazel_skylib//lib:shell.bzl", "shell")
load("@bazel_skylib//rules:common_settings.bzl", "BuildSettingInfo")
load("//commonjs:providers.bzl", "CjsInfo", "gen_manifest", "package_path")
load("//file:file.bzl", "FileInfo")
load("//javascript:providers.bzl", "JsInfo")
load("//javascript:rules.bzl", "js_export")
load("//nodejs:nodejs.bzl", "NodejsInfo")
load("//nodejs:rules.bzl", "nodejs_binary")
load("//pnp:providers.bzl", "pnp_gen")
load("//util:path.bzl", "output_name")

def _rollup_config_transition_impl(settings, attrs):
    return {"//javascript:module": "commonjs"}

_rollup_config_transition = transition(
    implementation = _rollup_config_transition_impl,
    inputs = [],
    outputs = ["//javascript:module"],
)

def _rollup_transition_impl(settings, attrs):
    return {"//javascript:language": "es2020", "//javascript:module": "es2020"}

_rollup_transition = transition(
    implementation = _rollup_transition_impl,
    inputs = [],
    outputs = ["//javascript:language", "//javascript:module"],
)

def _rollup_impl(ctx):
    cjs_info = ctx.attr.dep[CjsInfo]
    js_info = ctx.attr.dep[JsInfo]
    nodejs_info = ctx.attr.node[NodejsInfo]

    return [cjs_info, js_info, nodejs_info]

rollup = rule(
    attrs = {
        "dep": attr.label(
            providers = [CjsInfo, JsInfo],
        ),
        "node": attr.label(
            default = "//nodejs",
            providers = [NodejsInfo],
        ),
    },
    doc = "Rollup.",
    implementation = _rollup_impl,
)

def _rollup_bundle_impl(ctx):
    actions = ctx.actions
    compilation_mode = ctx.var["COMPILATION_MODE"]
    config = ctx.file.config
    config_cjs = ctx.attr.config[0][CjsInfo] if CjsInfo in ctx.attr.config[0] else None
    config_file = ctx.attr.config[0][FileInfo]
    config_js = ctx.attr.config[0][JsInfo]
    config_wrapper_cjs = ctx.attr._config_wrapper[0][CjsInfo]
    config_wrapper_js = ctx.attr._config_wrapper[0][JsInfo]
    dep_cjs = ctx.attr.dep[0][CjsInfo] if CjsInfo in ctx.attr.dep[0] else None
    dep_js = ctx.attr.dep[0][JsInfo]
    js_module = ctx.attr._js_module[BuildSettingInfo].value
    js_source_map = ctx.attr._js_source_map[BuildSettingInfo].value
    name = ctx.attr.name
    pnp_compiler = ctx.attr._pnp_compiler[DefaultInfo]
    rollup_cjs = ctx.attr.rollup[CjsInfo]
    rollup_js = ctx.attr.rollup[JsInfo]
    rollup_nodejs = ctx.attr.rollup[NodejsInfo]

    output = ctx.actions.declare_directory(ctx.attr.output or name)

    pnp_cjs = actions.declare_file("%s.pnp.cjs" % name)
    node_loader = actions.declare_file("%s.pnp.loader.mjs" % name)

    def node_package_path(package):
        return paths.dirname(relative_file(package.path + "/_", pnp_cjs.path))

    pnp_gen(
        actions = actions,
        cjs = pnp_cjs,
        deps = depset(
            transitive = [
                config_cjs.transitive_links,
                config_wrapper_cjs.transitive_links,
                dep_cjs.transitive_links,
                rollup_cjs.transitive_links,
            ],
        ),
        loader = node_loader,
        manifest_bin = pnp_compiler,
        package_path = node_package_path,
        packages = depset(transitive = [
            config_cjs.transitive_packages,
            config_wrapper_cjs.transitive_packages,
            dep_cjs.transitive_packages,
            rollup_cjs.transitive_packages,
        ]),
        roots = [rollup_cjs.package, config_wrapper_cjs.package] +
                ([config_cjs.package] if config_cjs else []),
    )

    args = actions.args()

    # args.add_all("-r", [runtime_cjs.package], format_each = "./%s/dist/bundle.js")
    args.add_all("-r", [pnp_cjs], format_each = "./%s")
    args.add_all("--experimental-loader", [node_loader], format_each = "./%s")
    args.add("--preserve-symlinks")
    args.add("--preserve-symlinks-main")
    args.add("--title", "rollup")
    args.add("%s/dist/bin/rollup" % rollup_cjs.package.path)
    args.add("--config", "./%s/src/index.cjs" % config_wrapper_cjs.package.path)

    actions.run(
        env = {
            "COMPILATION_MODE": compilation_mode,
            "JS_MODULE": js_module,
            "JS_SOURCE_MAP": "true" if js_source_map else "false",
            "ROLLUP_CONFIG": "./%s/%s" % (config.path, config_file.path) if config_file.path else "./%s" % config.path,
            "ROLLUP_INPUT_ROOT": dep_cjs.package.path,
            "ROLLUP_OUTPUT_ROOT": output.path,
        },
        executable = rollup_nodejs.bin,
        arguments = [args],
        inputs = depset(
            [pnp_cjs, node_loader, pnp_cjs],
            transitive = [
                config_js.transitive_files,
                config_wrapper_js.transitive_files,
                dep_js.transitive_files,
                rollup_js.transitive_files,
            ],
        ),
        outputs = [output],
    )

    default_info = DefaultInfo(files = depset([output]))

    return [default_info]

rollup_bundle = rule(
    attrs = {
        "config": attr.label(
            cfg = _rollup_config_transition,
            allow_single_file = True,
            providers = [FileInfo, JsInfo],
        ),
        "dep": attr.label(
            cfg = _rollup_transition,
            doc = "JavaScript dependencies",
            providers = [JsInfo],
        ),
        "rollup": attr.label(
            cfg = "exec",
            default = "//rollup",
            doc = "Rollup tools",
            providers = [JsInfo],
        ),
        "output": attr.string(
            doc = "Output directory. Defaults to the name as the target.",
        ),
        "_allowlist_function_transition": attr.label(
            default = "@bazel_tools//tools/allowlists/function_transition_allowlist",
        ),
        "_manifest": attr.label(
            cfg = "exec",
            executable = True,
            default = "//commonjs/manifest:bin",
        ),
        "_js_module": attr.label(
            providers = [BuildSettingInfo],
            default = "//javascript:module",
        ),
        "_js_source_map": attr.label(
            providers = [BuildSettingInfo],
            default = "//javascript:source_map",
        ),
        "_config_wrapper": attr.label(
            cfg = _rollup_config_transition,
            default = "//rollup/config:lib",
        ),
        "_pnp_compiler": attr.label(
            cfg = "exec",
            executable = True,
            default = "//pnp/compiler:bin",
        ),
    },
    doc = "Rollup bundle",
    implementation = _rollup_bundle_impl,
)
