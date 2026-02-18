def ts_node_modules(repo, roots):
    return ["@@%s//%s:lib_js" % (repo, root.name) for root in roots]
