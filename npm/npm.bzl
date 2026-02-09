def package_repo_name(repo, name):
    """Repository name for npm package.

    Replaces characters not permitted in Bazel repository names.

    Args:
        repo: Namespace
        name: ID
    """
    if name.startswith("@"):
        name = name[len("@"):]
    name = name.replace("@", "_")
    name = name.replace("/", "_")
    return "%s_%s" % (repo, name)
