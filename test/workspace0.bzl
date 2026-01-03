load("@bazel_tools//tools/build_defs/repo:http.bzl", "http_archive")

def test_repositories0():
    # Skylib

    SKYLIB_VERSION = "1.9.0"

    http_archive(
        name = "bazel_skylib",
        sha256 = "3b5b49006181f5f8ff626ef8ddceaa95e9bb8ad294f7b5d7b11ea9f7ddaf8c59",
        url = "https://github.com/bazelbuild/bazel-skylib/releases/download/%s/bazel-skylib-%s.tar.gz" % (SKYLIB_VERSION, SKYLIB_VERSION),
    )

    # Bazel features

    BAZEL_FEATURES_VERSION = "1.39.0"

    http_archive(
        name = "bazel_features",
        sha256 = "5ab1a90d09fd74555e0df22809ad589627ddff263cff82535815aa80ca3e3562",
        strip_prefix = "bazel_features-%s" % BAZEL_FEATURES_VERSION,
        url = "https://github.com/bazel-contrib/bazel_features/releases/download/v%s/bazel_features-v%s.tar.gz" % (BAZEL_FEATURES_VERSION, BAZEL_FEATURES_VERSION),
    )

    # Rules Pkg

    PKG_VERSION = "1.2.0"

    http_archive(
        name = "rules_pkg",
        sha256 = "b5c9184a23bb0bcff241981fd9d9e2a97638a1374c9953bb1808836ce711f990",
        url = "https://github.com/bazelbuild/rules_pkg/releases/download/%s/rules_pkg-%s.tar.gz" % (PKG_VERSION, PKG_VERSION),
    )

    # Protobuf

    PROTO_VERSION = "7.1.0"

    http_archive(
        name = "rules_proto",
        sha256 = "14a225870ab4e91869652cfd69ef2028277fc1dc4910d65d353b62d6e0ae21f4",
        strip_prefix = "rules_proto-%s" % PROTO_VERSION,
        url = "https://github.com/bazelbuild/rules_proto/releases/download/%s/rules_proto-%s.tar.gz" % (PROTO_VERSION, PROTO_VERSION),
    )

    # Python

    RULES_PYTHON_VERSION = "1.4.1"

    http_archive(
        name = "rules_python",
        sha256 = "9f9f3b300a9264e4c77999312ce663be5dee9a56e361a1f6fe7ec60e1beef9a3",
        strip_prefix = "rules_python-%s" % RULES_PYTHON_VERSION,
        url = "https://github.com/bazelbuild/rules_python/archive/%s.tar.gz" % RULES_PYTHON_VERSION,
    )

    # Bazel Util

    BAZEL_UTIL_VERSION = "08d283ec526b11e0b2c646a85b98ea6b573b2043"

    http_archive(
        name = "bazel_util",
        sha256 = "0d5b71f88020eee52158b448d3532561f70b9084860f9a243e91d14d8ba9b9e7",
        strip_prefix = "bazel-util-%s" % BAZEL_UTIL_VERSION,
        url = "https://github.com/redoapp/bazel-util/archive/%s.tar.gz" % BAZEL_UTIL_VERSION,
    )
