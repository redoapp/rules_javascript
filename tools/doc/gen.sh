cd "$BUILD_WORKSPACE_DIRECTORY"

tar x -m -f "$(rlocation rules_javascript/tools/doc/docs.tar)" -C docs

find docs -name '*.md' -not -name index.md -not -name default.md | \
    xargs "$(rlocation rules_javascript/tools/doc/doctoc)" --maxlevel 2 --notitle README.md
