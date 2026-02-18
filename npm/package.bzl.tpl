load(%{npm}, "package_repo_name")

PACKAGE = struct(
    arch = %{arch},
    bins = %{bins},
    deps = %{deps},
    extra_deps = %{extra_deps},
    libc = %{libc},
    name = %{package_name},
    repository = Label("@%s//:_" % package_repo_name(%{name}, %{id})).repo_name,
    os = %{os},
)
