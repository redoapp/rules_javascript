ARCHES = [
    "arm",
    "arm64",
    "ia32",
    "loong64",
    "mips",
    "mipsel",
    "ppc",
    "ppc64",
    "riscv64",
    "s390",
    "s390x",
    "x64",
]

PLATFORMS = [
    "aix",
    "darwin",
    "freebsd",
    "linux",
    "openbsd",
    "sunos",
    "win32",
]

DEFAULT_PLUGINS = [
    Label("//commonjs:npm_plugin.bzl"),
    Label("//javascript:npm_plugin.bzl"),
]

def _npm_package_impl(ctx):
    deps = [json.decode(dep) for dep in ctx.attr.deps]
    extra_deps = {id: [json.decode(d) for d in deps] for id, deps in ctx.attr.extra_deps.items()}
    plugins = ctx.attr.plugins
    package_name = ctx.attr.package_name
    integrity = ctx.attr.integrity
    url = ctx.attr.url

    ctx.download(
        integrity = integrity,
        output = "package.tar.gz",
        url = url,
    )

    result = ctx.execute(["tar", "tzf", "package.tar.gz"])
    if result.return_code:
        fail("Failed to list package:\n%s" % result.stderr)
    files = [
        path.removeprefix("./")
        for path in result.stdout.strip().split("\n")
    ]

    build = ""

    package = struct(
        arch = [arch for arch in ctx.attr.arch if arch in ARCHES],
        deps = deps,
        extra_deps = extra_deps,
        libc = ctx.attr.libc,
        name = package_name,
        os = [os for os in ctx.attr.os if os in PLATFORMS],
    )

    content = ""
    for index, plugin in enumerate(plugins):
        content += """
load({label}, {var} = "npm_plugin")
{var}.spoke(package, FILES)
        """.strip().format(
            label = repr(str(plugin)),
            var = "plugin%s" % (index + 1),
        )
        content += "\n"
        content += "\n"

    ctx.template(
        "BUILD.bazel",
        Label("package.BUILD.bazel.tpl"),
        substitutions = {
            "%{files}": repr(files),
            "%{npm}": repr(str(Label("npm.bzl"))),
            "%{package_name}": repr(ctx.attr.package_name),
            "%{arch}": repr([arch for arch in ctx.attr.arch if arch in ARCHES]),
            "%{deps}": repr(deps),
            "%{extra_deps}": repr(extra_deps),
            "%{libc}": repr(ctx.attr.libc),
            "%{os}": repr([os for os in ctx.attr.os if os in PLATFORMS]),
            "%{content}": content,
        },
    )

npm_package = repository_rule(
    implementation = _npm_package_impl,
    attrs = {
        "arch": attr.string_list(
            doc = "Architecture",
        ),
        "deps": attr.string_list(
            doc = "Dependencies.",
        ),
        "extra_deps": attr.string_list_dict(
            doc = "Extra dependencies.",
        ),
        "libc": attr.string_list(
            doc = "Libc",
        ),
        "os": attr.string_list(
            doc = "OS",
        ),
        "package_name": attr.string(
            doc = "Package name.",
            mandatory = True,
        ),
        "plugins": attr.label_list(
            default = DEFAULT_PLUGINS,
        ),
        "integrity": attr.string(
            doc = "Integrity.",
            mandatory = True,
        ),
        "url": attr.string(
            doc = "URL",
            mandatory = True,
        ),
    },
)

def _npm_impl(ctx):
    data = ctx.attr.data
    packages = [json.decode(package) for package in ctx.attr.packages]
    path = ctx.attr.path
    plugins = ctx.attr.plugins

    ctx.template(
        "BUILD.bazel",
        Label("npm.BUILD.bazel.tpl"),
        substitutions = {
            "%{output}": repr("/%s" % "/".join([part for part in [data.package, data.name] if part])),
            "%{path}": repr(path),
            "%{rules}": repr(str(Label("rules.bzl"))),
        },
    )

    if ctx.path(data).exists:
        data = json.decode(ctx.read(data))
    else:
        data = {"packages": {}, "roots": []}

    ctx.template(
        "data.bzl",
        Label("data.bzl.tpl"),
        substitutions = {
            "%{packages}": json.encode_indent(data["packages"]),
            "%{roots}": json.encode_indent(data["roots"]),
        },
    )

    for package in packages:
        content = ""
        for index, plugin in enumerate(plugins):
            content += """
load({label}, {var} = "npm_plugin")
{var}.hub(
  id = {id},
  package_name = {package_name}
)
            """.strip().format(
                label = repr(str(plugin)),
                var = "plugin%s" % (index + 1),
                id = repr(package["id"]),
                package_name = repr(package["name"]),
            )
            content += "\n"
            content += "\n"
        ctx.file("%s/BUILD.bazel" % package["name"], content)

npm = repository_rule(
    implementation = _npm_impl,
    attrs = {
        "data": attr.label(allow_single_file = [".json"], mandatory = True),
        "path": attr.string(mandatory = True),
        "packages": attr.string_list(
            doc = "Packages.",
        ),
        "plugins": attr.label_list(
            default = DEFAULT_PLUGINS,
        ),
    },
)
