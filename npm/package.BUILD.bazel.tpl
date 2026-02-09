load(%{npm}, "create_package")

package = create_package(
    arch = %{arch},
    deps = %{deps},
    extra_deps = %{extra_deps},
    libc = %{libc},
    name = %{package_name},
    os = %{os},
)

FILES = %{files}

%{content}
