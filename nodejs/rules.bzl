load("@bazel_lib//lib:paths.bzl", "relative_file", "to_rlocation_path")
load("@bazel_skylib//lib:paths.bzl", "paths")
load("@bazel_skylib//lib:shell.bzl", "shell")
load("@bazel_util//file:rules.bzl", "untar")
load("@rules_pkg//pkg:providers.bzl", "PackageFilegroupInfo", "PackageFilesInfo", "PackageSymlinkInfo")
load("@rules_pkg//pkg:tar.bzl", "pkg_tar")
load("//bin:bin.bzl", "BinInfo")
load("//commonjs:providers.bzl", "CjsInfo", "CjsPath", "create_globals", "create_links", "create_package", "package_path")
load("//javascript:providers.bzl", "JsInfo")
load("//pkg:rules.bzl", "pkg_install")
load("//pnp:providers.bzl", "pnp_gen")
load("//util:path.bzl", "nearest", "relativize")
load(":nodejs.bzl", "NodejsInfo", "NodejsRuntimeInfo", "nodejs_runtime_rule")

def nodejs_toolchains(name, repo_name, toolchain_type, visibility = None):
    native.toolchain(
        name = "%s.darwin_aarch64" % name,
        target_compatible_with = [
            "@platforms//cpu:aarch64",
            "@platforms//os:osx",
        ],
        toolchain = "@%s_darwin_arm64//:nodejs" % repo_name,
        toolchain_type = toolchain_type,
        visibility = visibility,
    )

    native.toolchain(
        name = "%s.darwin_x86_64" % name,
        target_compatible_with = [
            "@platforms//cpu:x86_64",
            "@platforms//os:osx",
        ],
        toolchain = "@%s_darwin_x64//:nodejs" % repo_name,
        toolchain_type = toolchain_type,
        visibility = visibility,
    )

    native.toolchain(
        name = "%s.linux_aarch64" % name,
        target_compatible_with = [
            "@platforms//cpu:aarch64",
            "@platforms//os:linux",
        ],
        toolchain = "@%s_linux_arm64//:nodejs" % repo_name,
        toolchain_type = toolchain_type,
        visibility = visibility,
    )

    native.toolchain(
        name = "%s.linux_x86_64" % name,
        target_compatible_with = [
            "@platforms//cpu:x86_64",
            "@platforms//os:linux",
        ],
        toolchain = "@%s_linux_x64//:nodejs" % repo_name,
        toolchain_type = toolchain_type,
        visibility = visibility,
    )

    native.toolchain(
        name = "%s.windows_aarch64" % name,
        target_compatible_with = [
            "@platforms//cpu:aarch64",
            "@platforms//os:windows",
        ],
        toolchain = "@%s_win_arm64//:nodejs" % repo_name,
        toolchain_type = toolchain_type,
        visibility = visibility,
    )

    native.toolchain(
        name = "%s.windows_x86_64" % name,
        target_compatible_with = [
            "@platforms//cpu:x86_64",
            "@platforms//os:windows",
        ],
        toolchain = "@%s_win_x64//:nodejs" % repo_name,
        toolchain_type = toolchain_type,
        visibility = visibility,
    )

def _nodejs_impl(ctx):
    nodejs_runtime = ctx.attr.runtime[NodejsRuntimeInfo]
    options = ctx.attr.options

    nodejs_info = NodejsInfo(
        bin = nodejs_runtime.bin,
        options = options,
    )

    return [nodejs_info]

nodejs = rule(
    attrs = {
        "runtime": attr.label(
            mandatory = True,
            providers = [NodejsRuntimeInfo],
        ),
        "options": attr.string_list(),
    },
    implementation = _nodejs_impl,
    provides = [NodejsInfo],
)

def _nodejs_toolchain_impl(ctx):
    bin = ctx.file.bin

    toolchain_info = platform_common.ToolchainInfo(
        bin = bin,
    )
    return [toolchain_info]

nodejs_toolchain = rule(
    implementation = _nodejs_toolchain_impl,
    attrs = {
        "bin": attr.label(
            doc = "Node.js executable",
            allow_single_file = True,
            mandatory = True,
        ),
    },
    provides = [platform_common.ToolchainInfo],
)

def _nodejs_simple_binary_implementation(ctx):
    actions = ctx.actions
    bash_runfiles_default = ctx.attr._bash_runfiles[DefaultInfo]
    node = ctx.attr.node[NodejsInfo]
    node_options = node.options + ctx.attr.node_options
    path = ctx.attr.path
    src = ctx.file.src

    module = to_rlocation_path(ctx, src)
    if path:
        module = "%s/%s" % (module, path)

    bin = actions.declare_file("%s/bin" % ctx.label.name)
    actions.expand_template(
        template = ctx.file._runner,
        output = bin,
        substitutions = {
            "%{example}": ctx.file.src.short_path,
            "%{module}": shell.quote(module),
            "%{node}": shell.quote(to_rlocation_path(ctx, node.bin)),
            "%{node_options}": " ".join([shell.quote(option) for option in node_options]),
        },
        is_executable = True,
    )

    runfiles = ctx.runfiles(files = [ctx.file.src, node.bin])
    runfiles = runfiles.merge(bash_runfiles_default.default_runfiles)
    default_info = DefaultInfo(executable = bin, runfiles = runfiles)

    return default_info

nodejs_simple_binary = rule(
    attrs = {
        "src": attr.label(mandatory = True, allow_single_file = True, doc = "Source file"),
        "node": attr.label(
            mandatory = True,
            providers = [NodejsInfo],
        ),
        "node_options": attr.string_list(),
        "path": attr.label(
            doc = "Path to file, if src is directory",
        ),
        "_bash_runfiles": attr.label(
            allow_files = True,
            default = "@bazel_tools//tools/bash/runfiles",
        ),
        "_runner": attr.label(
            allow_single_file = True,
            default = "simple-runner.sh.tpl",
        ),
    },
    doc = "Node.js executable, from a single file.",
    executable = True,
    implementation = _nodejs_simple_binary_implementation,
)

def _nodejs_binary_impl(ctx):
    actions = ctx.actions
    env = ctx.attr.env
    compiler = ctx.attr._compiler[DefaultInfo]
    js_dep = ctx.attr.dep[0][JsInfo]
    cjs_dep = ctx.attr.dep[0][CjsInfo] if CjsInfo in ctx.attr.dep[0] else None
    main = ctx.attr.main
    preload_cjs = [target[CjsInfo] for target in ctx.attr.preload if CjsInfo in target]
    preload_js = [target[JsInfo] for target in ctx.attr.preload]
    name = ctx.attr.name
    node = ctx.attr.node[NodejsInfo]
    node_options = ctx.attr.node_options + node.options
    runner = ctx.file._runner
    runtime_cjs = ctx.attr._runtime[CjsInfo]
    runtime_js = ctx.attr._runtime[JsInfo]

    preload_modules = [
        "%s/%s" % (to_rlocation_path(ctx, target[CjsInfo].package), target[CjsPath].path)
        for target in ctx.attr.preload
    ]

    if cjs_dep or preload_cjs:
        pnp_cjs = actions.declare_file("%s.pnp.cjs" % name)
        pnp_loader = actions.declare_file("%s.pnp.loader.mjs" % name)

        def package_path(package):
            # relative_file assumes file, and so always appends the basename.
            # Use a fake file for package, and then undo it.
            return paths.dirname(relative_file(package.short_path + "/_", pnp_cjs.short_path))

        pnp_gen(
            actions = actions,
            manifest_bin = compiler,
            cjs = pnp_cjs,
            loader = pnp_loader,
            package_path = package_path,
            roots = ([cjs_dep] if cjs_dep else []) + preload_cjs,
        )
    else:
        pnp_cjs = None
        pnp_loader = None

    main_module = "%s/%s" % (to_rlocation_path(ctx, cjs_dep.package), main) if cjs_dep else main

    bin = actions.declare_file(name)
    actions.expand_template(
        template = runner,
        output = bin,
        substitutions = {
            "%{env}": " ".join(["%s=%s" % (name, shell.quote(value)) for name, value in env.items()]),
            "%{main_module}": shell.quote(main_module),
            "%{node}": shell.quote(node.bin) if type(node.bin) == "string" else '"$RUNFILES_DIR"/%s' % shell.quote(to_rlocation_path(ctx, node.bin)),
            "%{node_options}": " ".join(
                [shell.quote(option) for option in node_options] +
                [option for module in preload_modules for option in ["-r", '"$(abspath "$RUNFILES_DIR"/%s)"' % module]],
            ),
            "%{pnp_cjs}": shell.quote(to_rlocation_path(ctx, pnp_cjs)) if pnp_cjs else "",
            "%{pnp_loader}": shell.quote(to_rlocation_path(ctx, pnp_loader)) if pnp_loader else "",
            "%{runtime}": shell.quote("%s/dist/bundle.js" % to_rlocation_path(ctx, runtime_cjs.package)),
        },
        is_executable = True,
    )

    runfiles = ctx.runfiles(
        files = ([pnp_cjs] if pnp_cjs else []) +
                ([pnp_loader] if pnp_loader else []) +
                ([] if type(node.bin) == "string" else [node.bin]) + ctx.files.data,
        transitive_files = depset(
            transitive = [js_dep.transitive_files] +
                         [runtime_js.transitive_files] +
                         [js_dep.transitive_files for js_dep in preload_js],
        ),
    )
    runfiles = runfiles.merge_all(
        [dep[DefaultInfo].default_runfiles for dep in ctx.attr.data],
    )

    default_info = DefaultInfo(
        executable = bin,
        runfiles = runfiles,
    )

    return [default_info]

def _nodejs_transition_impl(settings, attrs):
    return {"//javascript:module": "node"}

nodejs_transition = transition(
    implementation = _nodejs_transition_impl,
    inputs = [],
    outputs = ["//javascript:module"],
)

nodejs_binary = rule(
    attrs = {
        "data": attr.label_list(
            doc = "Runtime data",
            allow_files = True,
        ),
        "dep": attr.label(
            cfg = nodejs_transition,
            doc = "JavaScript library.",
            mandatory = True,
            providers = [JsInfo],
        ),
        "env": attr.string_dict(
            doc = "Environment variables",
        ),
        "main": attr.string(
            mandatory = True,
        ),
        "node": attr.label(
            default = ":nodejs",
            providers = [NodejsInfo],
        ),
        "node_options": attr.string_list(
            doc = "Node.js options",
        ),
        "preload": attr.label_list(
            cfg = nodejs_transition,
            doc = "Preloaded modules",
            providers = [CjsInfo, CjsPath, JsInfo],
        ),
        "_allowlist_function_transition": attr.label(
            default = "@bazel_tools//tools/allowlists/function_transition_allowlist",
        ),
        "_compiler": attr.label(
            cfg = "exec",
            executable = True,
            default = "//pnp/compiler:bin",
        ),
        "_runner": attr.label(
            allow_single_file = True,
            default = "runner.sh.tpl",
        ),
        "_runtime": attr.label(
            default = "//nodejs/runtime:dist_lib",
            providers = [CjsInfo, JsInfo],
        ),
    },
    doc = "Node.js binary",
    executable = True,
    implementation = _nodejs_binary_impl,
)

def _nodejs_modules_binary_impl(ctx):
    actions = ctx.actions
    env = ctx.attr.env
    modules = ctx.file.modules
    main = ctx.attr.main
    main_package = ctx.attr.main_package
    name = ctx.attr.name
    node = ctx.attr.node[NodejsInfo]
    node_options = ctx.attr.node_options
    runner = ctx.file._runner

    main_module = "/".join([part for part in [to_rlocation_path(ctx, modules), main_package, main] if part])

    executable = actions.declare_file(name)
    actions.expand_template(
        is_executable = True,
        output = executable,
        substitutions = {
            "%{env}": " ".join(["%s=%s" % (name, shell.quote(value)) for name, value in env.items()]),
            "%{main_module}": shell.quote(main_module),
            "%{node}": shell.quote(to_rlocation_path(ctx, node.bin)),
            "%{node_options}": " ".join([shell.quote(option) for option in node_options]),
        },
        template = runner,
    )

    runfiles = ctx.runfiles(files = [modules, node.bin])
    default_info = DefaultInfo(executable = executable, runfiles = runfiles)

    return [default_info]

nodejs_modules_binary = rule(
    attrs = {
        "env": attr.string_dict(),
        "main": attr.string(),
        "main_package": attr.string(mandatory = True),
        "modules": attr.label(allow_single_file = True, mandatory = True),
        "node": attr.label(default = ":nodejs", providers = [NodejsInfo]),
        "node_options": attr.string_list(),
        "path": attr.string(),
        "_runner": attr.label(
            allow_single_file = True,
            default = "modules-binary-runner.sh.tpl",
        ),
    },
    executable = True,
    implementation = _nodejs_modules_binary_impl,
)

def nodejs_modules(name, deps, **kwargs):
    untar(
        name = name,
        src = ":%s.archive" % name,
        **kwargs
    )

    pkg_tar(
        name = "%s.archive" % name,
        srcs = [":%s.package" % name],
        **kwargs
    )

    nodejs_modules_package(
        name = "%s.package" % name,
        deps = deps,
        **kwargs
    )

def _nodejs_modules_package_impl(ctx):
    deps_cjs = [target[CjsInfo] for target in ctx.attr.deps]
    deps_js = [target[JsInfo] for target in ctx.attr.deps]
    label = ctx.label
    links_cjs = [target[CjsInfo] for target in ctx.attr.links]

    transitive_packages = depset(
        [cjs.package for cjs in links_cjs],
        transitive = [cjs_info.transitive_packages for cjs_info in deps_cjs],
    )
    package_paths = {
        package.path: ".content/%s" % to_rlocation_path(ctx, package)
        for package in transitive_packages.to_list()
    } | {
        cjs.package.path: "../%s" % cjs.package.short_path
        for cjs in links_cjs
    }
    package_paths_nonempty = {}

    transitive_files = depset(
        transitive = [js_info.transitive_files for js_info in deps_js],
    )
    files_map = {}
    for file in transitive_files.to_list():
        package_path = nearest(package_paths, file.path)
        if package_path:
            if package_paths[package_path].startswith("../"):
                continue
            package_paths_nonempty[package_path] = None
        files_map[".content/%s" % to_rlocation_path(ctx, file)] = file
    files = PackageFilesInfo(attributes = {}, dest_src_map = files_map)

    package_bins = {}
    for target in ctx.attr.bins:
        if target[CjsInfo].package.path not in package_bins:
            package_bins[target[CjsInfo].package.path] = []
        package_bins[target[CjsInfo].package.path].append(target[BinInfo])

    symlinks = []
    transitive_links = depset(
        create_globals(label, deps_cjs + links_cjs),
        transitive = [cjs_info.transitive_links for cjs_info in deps_cjs],
    )
    for link in transitive_links.to_list():
        if link.path == None:
            destination = link.name
        elif link.path not in package_paths_nonempty:
            continue
        elif not package_paths[link.dep].startswith("../") and link.dep not in package_paths_nonempty:
            continue
        else:
            destination = "%s/node_modules/%s" % (package_paths[link.path], link.name)
        symlink = PackageSymlinkInfo(
            destination = destination,
            target = relativize(package_paths[link.dep], paths.dirname(destination)),
        )
        symlinks.append(symlink)

        for bin in package_bins.get(link.dep, []):
            if link.path == None:
                destination = ".bin/%s" % bin.name
            else:
                destination = "%s/node_modules/.bin/%s" % (package_paths[link.path], bin.name)
            symlinks.append(PackageSymlinkInfo(
                destination = destination,
                target = "%s/%s" % (relativize(package_paths[link.dep], paths.dirname(destination)), bin.path),
            ))

    default_info = DefaultInfo(files = transitive_files)

    filegroup_info = PackageFilegroupInfo(
        pkg_dirs = [],
        pkg_files = [(files, label)],
        pkg_symlinks = [(symlink, label) for symlink in symlinks],
    )

    return [default_info, filegroup_info]

nodejs_modules_package = rule(
    attrs = {
        "bins": attr.label_list(cfg = nodejs_transition, providers = [BinInfo]),
        "deps": attr.label_list(cfg = nodejs_transition, providers = [CjsInfo]),
        "links": attr.label_list(cfg = nodejs_transition, providers = [CjsInfo]),
        "_allowlist_function_transition": attr.label(
            default = "@bazel_tools//tools/allowlists/function_transition_allowlist",
        ),
    },
    provides = [PackageFilegroupInfo],
    implementation = _nodejs_modules_package_impl,
)

def _nodejs_repl_impl(ctx):
    actions = ctx.actions
    env = ctx.attr.env
    compiler = ctx.attr._compiler[DefaultInfo]
    js_deps = [dep[JsInfo] for dep in ctx.attr.deps]
    cjs_deps = [dep[CjsInfo] for dep in ctx.attr.deps if CjsInfo in dep]
    label = ctx.label
    preload_cjs = [target[CjsInfo] for target in ctx.attr.preload]
    preload_js = [target[JsInfo] for target in ctx.attr.preload]
    name = ctx.attr.name
    node = ctx.attr.node[NodejsInfo]
    node_options = ctx.attr.node_options + node.options
    runner = ctx.file._runner
    runtime_cjs = ctx.attr._runtime[CjsInfo]
    runtime_js = ctx.attr._runtime[JsInfo]

    preload_modules = [
        "%s/%s" % (to_rlocation_path(ctx, target[CjsInfo].package), target[CjsPath].path)
        for target in ctx.attr.preload
    ]

    package = create_package(
        name = "_repl",
        path = "",
        # The REPL's cwd is the main repo's runfiles root (e.g. RUNFILES_DIR/_main),
        # one level above the .pnp.cjs package dir. Locate _repl there so the
        # `[eval]`/REPL issuer resolves to it. (short_path "" => that root.)
        short_path = "",
        label = str(label),
    )
    links = create_links(package = package, label = str(label), cjs_infos = cjs_deps)

    cjs_info = CjsInfo(
        package = package,
        transitive_files = depset(),
        transitive_packages = depset(
            [package],
            transitive =
                [cjs_info.transitive_packages for cjs_info in cjs_deps],
        ),
        transitive_links = depset(
            links,
            transitive =
                [cjs_info.transitive_links for cjs_info in cjs_deps],
        ),
    )

    pnp_cjs = actions.declare_file("%s.pnp.cjs" % name)
    pnp_loader = actions.declare_file("%s.pnp.loader.mjs" % name)

    def package_path(package):
        # relative_file assumes file, and so always appends the basename.
        # Use a fake file for package, and then undo it.
        return paths.dirname(relative_file(package.short_path + "/_", pnp_cjs.short_path))

    pnp_gen(
        actions = actions,
        manifest_bin = compiler,
        cjs = pnp_cjs,
        loader = pnp_loader,
        package_path = package_path,
        roots = [cjs_info] + preload_cjs,
    )

    bin = actions.declare_file(name)
    actions.expand_template(
        template = runner,
        output = bin,
        substitutions = {
            "%{env}": " ".join(["%s=%s" % (name, shell.quote(value)) for name, value in env.items()]),
            "%{node}": shell.quote(node.bin) if type(node.bin) == "string" else '"$RUNFILES_DIR"/%s' % shell.quote(to_rlocation_path(ctx, node.bin)),
            "%{node_options}": " ".join(
                [shell.quote(option) for option in node_options] +
                [option for module in preload_modules for option in ["-r", '"$(abspath "$RUNFILES_DIR"/%s)"' % module]],
            ),
            "%{pnp_cjs}": shell.quote(to_rlocation_path(ctx, pnp_cjs)),
            "%{pnp_loader}": shell.quote(to_rlocation_path(ctx, pnp_loader)),
            "%{runtime}": shell.quote("%s/dist/bundle.js" % to_rlocation_path(ctx, runtime_cjs.package)),
        },
        is_executable = True,
    )

    runfiles = ctx.runfiles(
        files = [pnp_cjs, pnp_loader] + ([] if type(node.bin) == "string" else [node.bin]) + ctx.files.data,
        transitive_files = depset(
            transitive = [runtime_js.transitive_files] +
                         [js_dep.transitive_files for js_dep in js_deps + preload_js],
        ),
    )
    runfiles = runfiles.merge_all(
        [dep[DefaultInfo].default_runfiles for dep in ctx.attr.data],
    )

    default_info = DefaultInfo(
        executable = bin,
        runfiles = runfiles,
    )

    return [default_info]

nodejs_repl = rule(
    attrs = {
        "data": attr.label_list(
            doc = "Runtime data",
            allow_files = True,
        ),
        "deps": attr.label_list(
            cfg = nodejs_transition,
            doc = "JavaScript libraries.",
            providers = [JsInfo],
        ),
        "env": attr.string_dict(
            doc = "Environment variables",
        ),
        "node": attr.label(
            default = ":nodejs",
            providers = [NodejsInfo],
        ),
        "node_options": attr.string_list(
            doc = "Node.js options",
        ),
        "preload": attr.label_list(
            cfg = nodejs_transition,
            doc = "Preloaded modules",
            providers = [CjsInfo, CjsPath, JsInfo],
        ),
        "_allowlist_function_transition": attr.label(
            default = "@bazel_tools//tools/allowlists/function_transition_allowlist",
        ),
        "_compiler": attr.label(
            cfg = "exec",
            executable = True,
            default = "//pnp/compiler:bin",
        ),
        "_runner": attr.label(
            allow_single_file = True,
            default = "repl-runner.sh.tpl",
        ),
        "_runtime": attr.label(
            default = "//nodejs/runtime:dist_lib",
            providers = [CjsInfo, JsInfo],
        ),
    },
    doc = "Node.js REPL",
    executable = True,
    implementation = _nodejs_repl_impl,
)

def nodejs_install(name, src, path = None, **kwargs):
    pkg_install(
        name = name,
        pkg = src,
        path = "%s/node_modules" % path if path else "node_modules",
        **kwargs
    )

def _nodejs_binary_package_impl(ctx):
    actions = ctx.actions
    package_runner = ctx.file._package_runner
    dep_cjs = ctx.attr.dep[0][CjsInfo]
    env = ctx.attr.env
    main = ctx.attr.main
    name = ctx.attr.name
    node = ctx.attr.node[NodejsInfo]
    label = ctx.label
    node_options = ctx.attr.node_options
    dep_js = ctx.attr.dep[0][JsInfo]
    preload_cjs = [target[CjsInfo] for target in ctx.attr.preload]
    preload_js = [target[JsInfo] for target in ctx.attr.preload]

    transitive_files = depset(
        transitive =
            [dep_js.transitive_files] +
            [js_info.transitive_files for js_info in preload_js],
    )

    transitive_packages = depset(
        transitive =
            ([dep_cjs.transitive_packages] if dep_cjs else []) +
            [cjs_info.transitive_packages for cjs_info in preload_cjs],
    )

    transitive_links = depset(
        transitive =
            ([dep_cjs.transitive_links] if dep_cjs else []) +
            [cjs_info.transitive_links for cjs_info in preload_cjs],
    )

    package_paths = {
        package.path: to_rlocation_path(ctx, package)
        for package in transitive_packages.to_list()
    }

    preload_modules = [
        "%s/%s" % (package_paths[target[CjsInfo].package.path], target[CjsPath].path)
        for target in ctx.attr.preload
    ]

    bin = actions.declare_file(name)
    actions.expand_template(
        template = package_runner,
        output = bin,
        substitutions = {
            "%{env}": " ".join(["%s=%s" % (name, shell.quote(value)) for name, value in env.items()]),
            "%{main_module}": shell.quote("%s/%s" % (package_paths[dep_cjs.package.path], main)),
            "%{node}": shell.quote(node.bin) if type(node.bin) == "string" else '"$(dirname "$0")"/node',
            "%{node_options}": " ".join(
                [shell.quote(option) for option in node_options] +
                [option for module in preload_modules for option in ["-r", '"$(dirname "$0")"/%s' % shell.quote(module)]],
            ),
        },
        is_executable = True,
    )

    files_map = {to_rlocation_path(ctx, file): file for file in transitive_files.to_list()}
    files_map["bin"] = bin
    if type(node.bin) != "string":
        files_map["node"] = node.bin
    files = PackageFilesInfo(dest_src_map = files_map)

    symlinks = []
    for link in transitive_links.to_list():
        if link.path == None:
            destination = "node_modules/%s" % link.name
        else:
            destination = "%s/node_modules/%s" % (package_paths[link.path], link.name)
        symlink = PackageSymlinkInfo(
            destination = destination,
            target = relativize(package_paths[link.dep], paths.dirname(destination)),
        )
        symlinks.append(symlink)

    default_info = DefaultInfo(files = depset(files_map.values()))

    filegroup_info = PackageFilegroupInfo(
        pkg_dirs = [],
        pkg_files = [(files, label)],
        pkg_symlinks = [(symlink, label) for symlink in symlinks],
    )

    return [default_info, filegroup_info]

nodejs_binary_package = rule(
    attrs = {
        "dep": attr.label(
            cfg = nodejs_transition,
            mandatory = True,
            providers = [CjsInfo, JsInfo],
        ),
        "env": attr.string_dict(
            doc = "Environment variables",
        ),
        "main": attr.string(
            mandatory = True,
        ),
        "node": attr.label(
            default = ":nodejs",
            providers = [NodejsInfo],
        ),
        "node_options": attr.string_list(
            doc = "Node.js options",
        ),
        "preload": attr.label_list(
            cfg = nodejs_transition,
            doc = "Preloaded modules",
            providers = [CjsInfo, CjsPath, JsInfo],
        ),
        "_allowlist_function_transition": attr.label(
            default = "@bazel_tools//tools/allowlists/function_transition_allowlist",
        ),
        "_package_runner": attr.label(
            allow_single_file = True,
            default = "package-runner.sh.tpl",
        ),
    },
    doc = "Create executable tar",
    implementation = _nodejs_binary_package_impl,
    provides = [PackageFilegroupInfo],
)

def _nodejs_system_runtime_impl(ctx):
    node = ctx.attr.node

    nodejs_runtime_info = NodejsRuntimeInfo(bin = node)

    return [nodejs_runtime_info]

nodejs_system_runtime = rule(
    attrs = {
        "node": attr.string(mandatory = True),
    },
    implementation = _nodejs_system_runtime_impl,
    provides = [NodejsRuntimeInfo],
)

nodejs_runtime = nodejs_runtime_rule(toolchain_type = Label(":nodejs_type"))
