def _dep_arg(dep):
    data = struct(
        dep = dep.dep,
        id = dep.path,
        label = str(dep.label),
        name = dep.name,
    )
    return json.encode(data)

def _package_arg(package, package_path):
    data = struct(
        id = package.path,
        label = str(package.label),
        name = package.name,
        path = package_path(package),
    )
    return json.encode(data)

def pnp_gen(actions, manifest_bin, cjs, roots, package_path, loader = None):
    """Create Yarn Plug'n'Play files.

    Generates a `.pnp.cjs` loader and a `.pnp.loader.mjs` ESM loader from the
    same package and dependency data as `//commonjs:providers.bzl%gen_manifest`,
    using the Yarn PnP template. The two files must remain siblings; package
    paths are resolved relative to the `.pnp.cjs` directory.

    Args:
        actions: Actions struct
        manifest_bin: Manifest generation executable
        cjs: `.pnp.cjs` output
        loader: `.pnp.loader.mjs` output
        roots: List of CjsInfo
        package_path: Function for package path, relative to the `.pnp.cjs` directory
    """

    if not roots:
        fail("At least one root is required")

    def package_arg(cjs_info):
        return _package_arg(cjs_info, package_path)

    args = actions.args()
    args.add_all(depset([], transitive = [root.transitive_links for root in roots]), before_each = "--dep", map_each = _dep_arg)
    args.add_all(depset([], transitive = [root.transitive_packages for root in roots]), before_each = "--package", map_each = package_arg, allow_closure = True)
    for root in roots:
        args.add("--root", package_path(root.package))
    if loader:
        args.add("--loader", loader)
    args.add("--pnp", cjs)

    args.set_param_file_format("multiline")
    args.use_param_file("@%s", use_always = True)
    actions.run(
        arguments = [args],
        executable = manifest_bin.files_to_run.executable,
        execution_requirements = {
            "requires-worker-protocol": "json",
            "supports-workers": "1",
        },
        outputs = [cjs] + ([loader] if loader else []),
        mnemonic = "GenPnpManifest",
        progress_message = "Generating PNP loader %{output}",
        tools = [manifest_bin.files_to_run],
    )
