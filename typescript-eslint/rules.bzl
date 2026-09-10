load("@bazel_lib//lib:paths.bzl", "to_rlocation_path")
load("@bazel_skylib//lib:paths.bzl", "paths")
load("@bazel_util//generate:runner.bzl", "create_runner")
load("//commonjs:providers.bzl", "CjsInfo")
load("//javascript:providers.bzl", "JsInfo")
load("//javascript:rules.bzl", "js_export")
load("//nodejs:nodejs.bzl", "NodejsInfo")
load("//nodejs:rules.bzl", "nodejs_binary")
load("//typescript:providers.bzl", "TsCompileInfo")
load(":providers.bzl", "TsEslintInfo")

def configure_ts_eslint(name, config, config_dep, dep = Label("//eslint:eslint_lib"), native = False, node_options = [], options = None, visibility = None):
    """Configure typescript-eslint.

    Args:
        name: Target name.
        config: ESLint config file path within config_dep's package.
        config_dep: Library providing the config file.
        dep: ESLint library.
        native: Take type information from the native TypeScript compiler
            (tsgo) instead of a Strada `ts.Program`. The lint action then
            materializes `node_modules/` like the native compile action and
            sets `TSGO_BRIDGE=1` and `TS_CONFIG` for the config, which is
            expected to build its parser with
            `@rules-javascript/typescript-eslint-tsgo-bridge`.
        node_options: Extra Node.js options for the linter.
        options: ESLint CLI options.
        visibility: Visibility.
    """
    js_export(
        name = "%s.main" % name,
        dep = Label("//typescript-eslint/linter:lib"),
        deps = [dep],
        extra_deps = [config_dep],
        visibility = ["//visibility:private"],
    )

    nodejs_binary(
        name = "%s.bin" % name,
        dep = ":%s.main" % name,
        main = "src/main.js",
        node = Label("//nodejs"),
        node_options = ["--experimental-import-meta-resolve", "--title=eslint"] + node_options,
        visibility = ["//visibility:private"],
    )

    ts_eslint(
        name = name,
        config = config,
        config_dep = config_dep,
        bin = ":%s.bin" % name,
        native = native,
        options = options,
        visibility = visibility,
    )

def _ts_eslint_impl(ctx):
    bin_default = ctx.attr.bin[DefaultInfo]
    config = ctx.attr.config
    config_js = ctx.attr.config_dep[JsInfo]
    config_cjs = ctx.attr.config_dep[CjsInfo]
    options = ctx.attr.options

    config_path = "%s/%s" % (to_rlocation_path(ctx, config_cjs.package), config)
    config = "./%s.runfiles/%s" % (bin_default.files_to_run.executable.path, config_path)

    ts_eslint_info = TsEslintInfo(
        bin = bin_default.files_to_run,
        config_path = config,
        native = ctx.attr.native,
        options = options,
    )

    return [ts_eslint_info]

ts_eslint = rule(
    attrs = {
        "bin": attr.label(
            doc = "eslint",
            mandatory = True,
            executable = True,
            cfg = "exec",
        ),
        "config": attr.string(
            mandatory = True,
        ),
        "config_dep": attr.label(
            doc = "Configuration file",
            mandatory = True,
            providers = [CjsInfo, JsInfo],
        ),
        "native": attr.bool(
            default = False,
            doc = "Type information from the native TypeScript compiler (tsgo) via the tsgo-bridge parser",
        ),
        "options": attr.string_list(
            doc = "ESLint options",
        ),
    },
    implementation = _ts_eslint_impl,
    provides = [TsEslintInfo],
)

def _ts_eslint_format(ctx, name, src, out, outputs):
    if src.path not in outputs:
        fail("%s not formatted" % src.path)
    return outputs[src.path]

def _ts_eslint_format_impl(ctx):
    all_srcs = ctx.attr.all_srcs
    actions = ctx.actions
    args_default = ctx.attr._args[DefaultInfo]
    bash_runfiles_default = ctx.attr._bash_runfiles[DefaultInfo]
    diff_default = ctx.attr._diff[DefaultInfo]
    label = ctx.label
    name = ctx.attr.name
    run_default = ctx.attr._run[DefaultInfo]
    runner = ctx.file._runner
    srcs = depset(ctx.files.srcs)
    ts_eslint = ctx.attr.ts_eslint[TsEslintInfo]
    ts_compile = ctx.attr.ts[TsCompileInfo]

    executable = actions.declare_file(name)

    if all_srcs:
        srcs = ts_compile.srcs

    file_defs = {
        src.short_path.replace("../", ""): struct(
            generated = actions.declare_file("%s.out/%x.%s" % (name, index, src.extension)),
            src = src,
        )
        for index, src in enumerate(srcs.to_list())
    }

    args = actions.args()
    args.add_all(ts_eslint.options, format_each = "--arg=%s")
    args.add("--config", ts_eslint.config_path)
    args.add("--manifest", ts_compile.manifest)
    for file_def in file_defs.values():
        args.add("%s=%s" % (file_def.src.path, file_def.generated.path))

    # Prefer the lint-only tsconfig (no preserveSymlinks=true) when the
    # compile rule emitted one. Falls back to the compile tsconfig for
    # legacy (non-native) consumers that don't set lint_config_path.
    ts_config_path = ts_compile.lint_config_path if hasattr(ts_compile, "lint_config_path") and ts_compile.lint_config_path else ts_compile.config_path
    lint_inputs = depset(
        [ts_compile.manifest],
        transitive = [srcs, ts_compile.declarations, ts_compile.configs, ts_compile.runtime_js, ts_compile.srcs],
    )
    outputs = [file_def.generated for file_def in file_defs.values()]
    if ts_eslint.native:
        # The tsgo child process reads the real filesystem, so materialize
        # node_modules/ with the same stager the native compile action uses,
        # against the compile tsconfig (preserveSymlinks keeps nominal type
        # identities stable through the staged symlinks).
        stager = ctx.file._stage_nm
        node_bin = ctx.attr._node[NodejsInfo].bin
        actions.run_shell(
            arguments = [args],
            command = '"{node}" "{stager}" && exec "{eslint}" "$@"'.format(
                eslint = ts_eslint.bin.executable.path,
                node = node_bin.path,
                stager = stager.path,
            ),
            env = {
                "NODE_FS_PACKAGE_MANIFEST": ts_compile.manifest.path,
                "STAGE_NM_CURRENT_PKG": paths.dirname(ts_compile.config_path),
                "TSESTREE_SINGLE_RUN": "true",
                "TSGO_BRIDGE": "1",
                "TS_CONFIG": ts_compile.config_path,
            },
            inputs = depset([stager, node_bin], transitive = [lint_inputs]),
            mnemonic = "TypeScriptLintNative",
            progress_message = "Linting TypeScript %{label} (tsgo)",
            outputs = outputs,
            tools = [ts_eslint.bin],
        )
    else:
        actions.run(
            arguments = [args],
            env = {"TSESTREE_SINGLE_RUN": "true", "TS_CONFIG": ts_config_path},
            executable = ts_eslint.bin.executable,
            inputs = lint_inputs,
            mnemonic = "TypeScriptCompile",
            progress_message = "Linting TypeScript %{label}",
            outputs = outputs,
            tools = [ts_eslint.bin],
        )

    default_info = create_runner(
        actions = actions,
        args_bin = args_default,
        bash_runfiles = bash_runfiles_default.default_runfiles,
        bin = executable,
        ctx = ctx,
        diff_bin = diff_default,
        dir_mode = "775",
        file_defs = file_defs,
        file_mode = "664",
        label = label,
        name = name,
        run_bin = run_default,
        runfiles_fn = ctx.runfiles,
        runner_template = runner,
    )

    return [default_info]

ts_eslint_format = rule(
    attrs = {
        "ts_eslint": attr.label(
            providers = [TsEslintInfo],
        ),
        "all_srcs": attr.bool(
            default = True,
            doc = "Use all compiled srcs",
        ),
        "srcs": attr.label(
            doc = "Sources",
            allow_files = True,
        ),
        "ts": attr.label(
            doc = "TypeScript compilation",
            mandatory = True,
            providers = [TsCompileInfo],
        ),
        "_args": attr.label(
            cfg = "exec",
            default = "@bazel_util//generate/args:bin",
            executable = True,
        ),
        "_bash_runfiles": attr.label(
            allow_files = True,
            default = "@bazel_tools//tools/bash/runfiles",
        ),
        "_diff": attr.label(
            cfg = "exec",
            default = "@bazel_util//generate/diff:bin",
            executable = True,
        ),
        "_node": attr.label(
            cfg = "exec",
            default = "//nodejs",
            doc = "Node binary used to run the stage-nm script in native (tsgo) mode.",
            providers = [NodejsInfo],
        ),
        "_stage_nm": attr.label(
            allow_single_file = True,
            default = "//typescript/stage-nm:stage-nm.js",
            doc = "Script that materializes node_modules/ from the package manifest for the native (tsgo) type backend.",
        ),
        "_run": attr.label(
            default = "@bazel_util//generate/run:bin",
            cfg = "target",
            executable = True,
        ),
        "_runner": attr.label(
            allow_single_file = True,
            default = "@bazel_util//generate:runner",
        ),
    },
    doc = "TypeScript ESLint",
    executable = True,
    implementation = _ts_eslint_format_impl,
)
