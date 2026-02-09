load(%{rules}, "playwright_browsers_resolve")

playwright_browsers_resolve(
    name = "resolve",
    lib = %{playwright},
    path = %{data},
    tools = %{tools},
)

%{content}
