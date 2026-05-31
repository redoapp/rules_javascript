load(%{rules}, "yarn_resolve")

yarn_resolve(
    name = "resolve",
    output = %{output},
    patches = %{patches},
    path = %{path},
    visibility = ["//visibility:public"],
)
