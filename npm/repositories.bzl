load("@bazel_skylib//lib:paths.bzl", "paths")

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
    Label("//bin:npm_plugin.bzl"),
    Label("//commonjs:npm_plugin.bzl"),
    Label("//javascript:npm_plugin.bzl"),
    Label("//nodejs:npm_plugin.bzl"),
]

def _hunk_size(header):
    """Body-line budget for a `@@ -a,b +c,d @@` header: the old + new line counts.

    A context line spans both sides and so costs 2; an added or deleted line
    costs 1. The budget is exhausted exactly at the end of the hunk body.
    """

    fields = header[len("@@ "):].split(" ")
    return _hunk_length(fields[0]) + _hunk_length(fields[1])

def _hunk_length(field):
    counts = field[1:].split(",")  # drop leading -/+
    return int(counts[1]) if len(counts) > 1 else 1

def _reanchor(field, dir):
    """Reanchors a `--- `/`+++ ` path under `dir` (exact, repo-root relative).

    Splits off a trailing tab-separated timestamp, drops a leading `a/`/`b/`
    strip segment if present, and prepends the package directory. `/dev/null`
    is left untouched so file creations and deletions keep working.
    """

    tab = field.find("\t")
    path = field if tab == -1 else field[:tab]
    rest = "" if tab == -1 else field[tab:]
    if path == "/dev/null":
        return field
    if path.startswith("a/") or path.startswith("b/"):
        path = path[len("a/"):]
    return dir + "/" + path + rest

def _reanchor_patch(patch, dir):
    """Reanchors a unified diff's file paths under the package's extraction dir.

    `ctx.patch` applies relative to the repository root, where the package is
    extracted under `dir`. Only the `--- `/`+++ ` headers are rewritten -- to
    exact paths applied with strip=0 -- so no git-specific headers (`diff --git`,
    `rename`, mode lines) or `a/`/`b/` conventions are assumed. Hunk bodies are
    tracked by line count so header-looking content is left untouched.
    """

    out = []
    remaining = 0
    for line in patch.split("\n"):
        if remaining > 0:
            marker = line[:1]
            if marker == "\\":
                pass
            elif marker == "+" or marker == "-":
                remaining -= 1
            else:
                remaining -= 2
        elif line.startswith("@@ "):
            remaining = _hunk_size(line)
        elif line.startswith("--- "):
            line = "--- " + _reanchor(line[len("--- "):], dir)
        elif line.startswith("+++ "):
            line = "+++ " + _reanchor(line[len("+++ "):], dir)
        out.append(line)
    return "\n".join(out)

def _npm_package_impl(ctx):
    id = ctx.attr.id
    integrity = ctx.attr.integrity
    patch = ctx.attr.patch and ctx.read(ctx.attr.patch)
    plugins = ctx.attr.plugins
    repo = ctx.attr.repo
    url = ctx.attr.url

    ctx.download_and_extract(
        integrity = integrity,
        output = "tmp",
        url = url,
    )
    # strip top-level directory
    # TODO: Use download_and_extract(strip_components = 1) once supported
    result = ctx.execute(["sh", "-c", "mv tmp/* src"])
    if result.return_code:
        fail("Failed to move package:\n%s" % result.stderr)

    # patch
    if patch:
        ctx.file("package.patch", _reanchor_patch(patch, "src"))
        ctx.patch("package.patch")
        ctx.delete("package.patch")

    # strip bundleDependencies (challenging, unnecessary, and Yarn doesn't support either)
    result = ctx.execute(["find", "src", "-name", "node_modules", "-type", "d", "-prune", "-exec", "rm", "-rf", "{}", "+"])
    if result.return_code:
        fail("Failed to strip node_modules:\n%s" % result.stderr)

    content = ""
    for index, plugin in enumerate(plugins):
        content += """
load({label}, {var} = "npm_plugin")
{var}.spoke(repo = REPO, package = PACKAGE)
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
            doc = "Plugins.",
        ),
        "integrity": attr.string(
            doc = "Integrity.",
            mandatory = True,
        ),
        "patch": attr.label(
            doc = "Patch to apply after extraction.",
        ),
        "url": attr.string(
            doc = "URL.",
            mandatory = True,
        ),
    },
)

def _npm_impl(ctx):
    data = ctx.attr.data
    data_output = ctx.attr.data_output or ctx.attr.data
    patches_output = ctx.attr.patches_output
    path = ctx.attr.path
    plugins = ctx.attr.plugins

    ctx.template(
        "BUILD.bazel",
        Label("npm.BUILD.bazel.tpl"),
        substitutions = {
            "%{output}": repr("/%s" % "/".join([part for part in [data_output.package, data_output.name] if part])),
            "%{patches}": repr("/%s" % "/".join([part for part in [patches_output.package, patches_output.name] if part])),
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
                'load(%s, PACKAGE%s = "PACKAGE")' % (repr("//_packages:%s" % _package_path(package_id)), index)
                for index, package_id in enumerate(data["packages"])
            ]),
            "%{packages}": "{\n%s}" % ",\n".join(["    %s: PACKAGE%s" % (repr(id), index) for index, id in enumerate(data["packages"])]),
            "%{repos}": repr([repo for repo in data["packages"]]),
        },
    )

    ctx.file("_packages/BUILD.bazel", "")
    for package_id, package in data["packages"].items():
        ctx.template(
            "_packages/%s" % _package_path(package_id),
            Label("package.bzl.tpl"),
            substitutions = {
                "%{id}": repr(package_id),
                "%{name}": repr(ctx.original_name),
                "%{npm}": repr(str(Label("//npm:npm.bzl"))),
                "%{package_name}": repr(package["name"]),
                "%{arch}": repr([arch for arch in package.get("arch", []) if arch in ARCHES]),
                "%{bins}": repr(package.get("bins", {})),
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
                'load(%s, ROOT%s = "ROOT")' % (repr("//_roots:%s" % _root_path(root["name"])), index)
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
        package = data["packages"][root["id"]]
        root_load = 'load(%s, "ROOT")' % repr("//_roots:%s" % _root_path(root["name"])) if root != None else ""
        for bin, path in package.get("bins", {}).items():
            content = ""
            for index, plugin in enumerate(plugins):
                content += """
    load({label}, {var} = "npm_plugin")
                """.strip().format(
                    label = repr(str(plugin)),
                    var = "plugin%s" % (index + 1),
                )
                content += "\n"
                content += """
    {var}.bin(
    repo = repository_name(),
    package_id = {package_id},
    bin = {bin},
    )
                """.strip().format(
                    bin = repr(bin),
                    package_id = repr(root["id"]),
                    var = "plugin%s" % (index + 1),
                )
                content += "\n"
            ctx.template(
                ".bin/%s/BUILD.bazel" % bin,
                Label("hub.BUILD.bazel.tpl"),
                substitutions = {
                    "%{content}": content,
                    "%{root_load}": root_load,
                },
            )

    for root in data["roots"]:
        root_load = 'load(%s, "ROOT")' % repr("//_roots:%s" % _root_path(root["name"])) if root != None else ""
        content = ""
        for index, plugin in enumerate(plugins):
            content += """
load({label}, {var} = "npm_plugin")
            """.strip().format(
                label = repr(str(plugin)),
                var = "plugin%s" % (index + 1),
            )
            content += "\n"
            content += """
{var}.hub(
repo = repository_name(),
root = ROOT,
)
            """.strip().format(
                label = repr(str(plugin)),
                var = "plugin%s" % (index + 1),
            )
            content += "\n"
        ctx.template(
            "%s/BUILD.bazel" % root["name"],
            Label("hub.BUILD.bazel.tpl"),
            substitutions = {
                "%{content}": content,
                "%{root_load}": root_load,
            },
        )

    return ctx.repo_metadata(
        reproducible = True,
    )

npm = repository_rule(
    implementation = _npm_impl,
    attrs = {
        "data": attr.label(allow_single_file = [".json"], mandatory = True),
        "data_output": attr.label(allow_single_file = [".json"]),
        "path": attr.string(mandatory = True),
        "patches_output": attr.label(mandatory = True),
        "plugins": attr.label_list(
            default = DEFAULT_PLUGINS,
            doc = "Plugins."
        ),
    },
)

def _package_path(id):
    return "%s.bzl" % id.replace("/", "_")

def _root_path(name):
    return "%s.bzl" % name.replace("/", "_")
