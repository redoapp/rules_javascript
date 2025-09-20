def playwright_tool_toolchains(tools, types, **kwargs):
    for tool_name, tool_platforms in tools.items():
        toolchain_type = "%s%s.toolchain_type" % (types, tool_name)
        tool_platforms = {tool_platform(platform): tool for platform, tool in tool_platforms.items()}
        for platform, tool in tool_platforms.items():
            native.toolchain(
                name = "%s.%s_%s" % (tool_name, str(platform.os).replace("@platforms//os:", ""), str(platform.arch).replace("@platforms//cpu:", "")) if platform else tool_name,
                target_compatible_with = [platform.arch, platform.os] if platform else None,
                toolchain = "@playwright_%s//:tool" % tool,
                toolchain_type = toolchain_type,
                **kwargs
            )

def tool_platform(id):
    if id == "<unknown>":
        return None

    parts = id.split("-")
    os = parts[0]
    arch = parts[1] if 1 < len(parts) else "x64"

    if arch == "x64":
        arch = Label("@platforms//cpu:x86_64")
    elif arch == "arm64":
        arch = Label("@platforms//cpu:arm64")
    else:
        fail("Unknown arch: %s" % arch)

    if os.startswith("debian"):
        os = Label("@platforms//os:linux")
    elif os.startswith("mac"):
        os = Label("@platforms//os:osx")
    elif os.startswith("ubuntu"):
        os = Label("@platforms//os:linux")
    elif os.startswith("win"):
        os = Label("@platforms//os:windows")
    else:
        fail("Unknown OS: %s" % os)

    return struct(
        arch = arch,
        os = os,
    )
