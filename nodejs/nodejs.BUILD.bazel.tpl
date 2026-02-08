load(%{rules}, "nodejs_toolchain")

nodejs_toolchain(
    name = "nodejs",
    bin = "bin/node",
    visibility = ["//visibility:public"],
)
