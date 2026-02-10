def js_npm_label(repo):
    return "@%s//:lib" % repo

def js_npm_inner_label(repo):
    return "@%s//:lib.inner" % repo

def js_node_modules(repo, roots):
    return ["@%s//%s:lib" % (repo, root.name) for root in roots]
