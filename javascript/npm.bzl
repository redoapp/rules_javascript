def js_npm_label(repo):
    return "@%s//:lib" % repo

def js_npm_inner_label(repo):
    return "@%s//:lib.inner" % repo

def js_npm_roots(repo, roots):
    return ["@%s//%s:lib" % (repo, root.name) for root in roots]
