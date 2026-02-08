def _nodejs_http_archive_impl(ctx):
    sha256 = ctx.attr.sha256
    strip_prefix = ctx.attr.strip_prefix
    url = ctx.attr.url

    ctx.template(
        "BUILD.bazel",
        Label("nodejs.BUILD.bazel.tpl"),
        substitutions = {
            "%{rules}": repr(str(Label("rules.bzl"))),
        },
    )

    ctx.download_and_extract(
        sha256 = sha256,
        strip_prefix = strip_prefix,
        url = url,
    )

nodejs_http_archive = repository_rule(
    implementation = _nodejs_http_archive_impl,
    attrs = {
        "sha256": attr.string(mandatory = True),
        "strip_prefix": attr.string(),
        "url": attr.string(mandatory = True),
    },
)
