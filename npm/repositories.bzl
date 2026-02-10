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
    id = ctx.attr.id
    repo = ctx.attr.repo
    plugins = ctx.attr.plugins
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

    content = ""
    for index, plugin in enumerate(plugins):
        content += """
load({label}, {var} = "npm_plugin")
{var}.spoke(repo = REPO, package = PACKAGE, files = FILES)
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
            "%{content}": content,
            "%{data}": repr("@%s//_packages:%s" % (repo, _package_path(id))),
            "%{files}": repr(files),
            "%{repo}": repr(repo),
        },
    )

    return ctx.repo_metadata(
        reproducible = True,
    )

npm_package = repository_rule(
    implementation = _npm_package_impl,
    attrs = {
        "id": attr.string(mandatory = True),
        "repo": attr.string(mandatory = True),
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
        print("Warning: %s does not exist, run @@%s//:resolve" % (data, ctx.name))
        data = {"packages": {}, "roots": []}

    ctx.template(
        "packages.bzl",
        Label("packages.bzl.tpl"),
        substitutions = {
            "%{loads}": "\n".join([
                'load(%s, PACKAGE%s = "PACKAGE")' % (repr("//packages:%s" % _package_path(package_id)), index)
                for index, package_id in enumerate(data["packages"])
            ]),
            "%{packages}": "[%s]" % ", ".join(["PACKAGE%s" % index for index, _ in enumerate(data["packages"])]),
        },
    )

    ctx.file("_packages/BUILD.bazel", "")
    for package_id, package in data["packages"].items():
        ctx.template(
            "_packages/%s" % _package_path(package_id),
            Label("package.bzl.tpl"),
            substitutions = {
                "%{package_name}": repr(package["name"]),
                "%{arch}": repr([arch for arch in package.get("arch", []) if arch in ARCHES]),
                "%{deps}": "[%s]" % ", ".join([
                    "struct(id = %s, name = %s)" % (repr(dep["id"]), repr(dep.get("name")))
                    for dep in package.get("deps", [])
                ]),
                "%{extra_deps}": "{%s}" % ", ".join([
                    "%s: [%s]" % (repr(id), ", ".join([
                        "struct(id = %s, name = %s)" % (repr(dep["id"]), repr(dep.get("name")))
                        for dep in deps
                    ]))
                    for id, deps in package.get("extraDeps", {}).items()
                ]),
                "%{libc}": repr(package.get("libc", [])),
                "%{os}": repr([os for os in package.get("os", []) if os in PLATFORMS]),
            },
        )

    ctx.template(
        "roots.bzl",
        Label("roots.bzl.tpl"),
        substitutions = {
            "%{loads}": "\n".join([
                'load(%s, ROOT%s = "ROOT")' % (repr("//_roots:%s" % _package_path(root["name"])), index)
                for index, root in enumerate(data["roots"])
            ]),
            "%{roots}": "[%s]" % ", ".join(["ROOT%s" % index for index, _ in enumerate(data["roots"])]),
        },
    )
    ctx.file("_roots/BUILD.bazel", "")
    for root in data["roots"]:
        ctx.template(
            "_roots/%s" % _root_path(root["name"]),
            Label("root.bzl.tpl"),
            substitutions = {
                "%{id}": repr(root["id"]),
                "%{name}": repr(root["name"]),
            },
        )

    for root in data["roots"]:
        content = ""
        for index, plugin in enumerate(plugins):
            content += """
load({label}, {var} = "npm_plugin")
{var}.hub(
    repo = repository_name(),
    root = ROOT,
)
            """.strip().format(
                label = repr(str(plugin)),
                var = "plugin%s" % (index + 1),
            )
            content += "\n"
            content += "\n"
        ctx.template(
            "%s/BUILD.bazel" % root["name"],
            Label("hub.BUILD.bazel.tpl"),
            substitutions = {
                "%{content}": content,
                "%{data}": repr("//_roots:%s" % _root_path(root["name"])),
            },
        )

    return ctx.repo_metadata(
        reproducible = True,
    )

npm = repository_rule(
    implementation = _npm_impl,
    attrs = {
        "data": attr.label(allow_single_file = [".json"], mandatory = True),
        "path": attr.string(mandatory = True),
        "plugins": attr.label_list(
            default = DEFAULT_PLUGINS,
        ),
    },
)

def _package_path(id):
    return "%s.bzl" % id.replace("/", "_")

def _root_path(name):
    return "%s.bzl" % name.replace("/", "_")
