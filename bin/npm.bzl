load("//npm:npm.bzl", "package_repo_name")

def bin_npm_label(repo, name):
    return "@%s//:bin/%s" % (repo, name)

def bin_npm_binaries(packages):
    return [
        Label("@@%s//:bin/%s" % (package.repository, bin))
        for package in packages.values()
        for bin in package.bins
    ]
