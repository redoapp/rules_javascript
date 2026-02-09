load(%{rules}, "playwright_toolchain")

playwright_toolchain(
    name = "tool",
    file = "files",
    path = %{path},
    visibility = ["//visibility:public"],
)
