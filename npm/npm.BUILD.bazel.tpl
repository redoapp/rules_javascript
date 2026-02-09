load(%{rules}, "yarn_resolve")

yarn_resolve(
    name = "resolve",
    output = %{output},
    path = %{path},
    visibility = ["//visibility:public"],
)
