load("@bazel_skylib//lib:versions.bzl", "versions")
load("//util:sha256sums.bzl", "sha256sums_parse")
load(":repositories.bzl", "nodejs_http_archive")

_toolchain_tag = tag_class(
    attrs = {
        "version": attr.string(mandatory = True),
    },
)

def _nodejs_impl(ctx):
    facts = ctx.facts.get(_FACTS_KEY)
    if facts and facts["_version"] != _FACTS_VERSION:
        facts = None

    version = None
    for module in ctx.modules:
        for toolchain in module.tags.toolchain:
            if version == None or versions.is_at_least(version, toolchain.version):
                version = toolchain.version
    version = version or "24.4.1"

    if facts != None:
        sha256s = facts["sha256s"]
    else:
        sha256s = {}
        ctx.download(
            output = "SHASUMS256.txt",
            url = "https://nodejs.org/dist/v%s/SHASUMS256.txt" % version,
        )
        for path, sha256 in sha256sums_parse(ctx.read("SHASUMS256.txt")).items():
            if not path.startswith("node-v%s-" % version):
                continue
            if not path.endswith(".tar.xz") and not path.endswith(".zip"):
                continue
            sha256s[path] = sha256

    for path, sha256 in sha256s.items():
        platform = path.removeprefix("node-v%s-" % version).removesuffix(".tar.xz").removesuffix(".zip")
        nodejs_http_archive(
            name = "nodejs_%s" % platform.replace("-", "_"),
            sha256 = sha256,
            strip_prefix = path.removesuffix(".tar.xz").removesuffix(".zip"),
            url = "https://nodejs.org/dist/v%s/%s" % (version, path),
        )

    return ctx.extension_metadata(
        reproducible = True,
        facts = {_FACTS_KEY: {"sha256s": sha256s, "_version": _FACTS_VERSION}},
    )

nodejs = module_extension(
    implementation = _nodejs_impl,
    tag_classes = {"toolchain": _toolchain_tag},
)

_FACTS_KEY = "_"

_FACTS_VERSION = "1"
