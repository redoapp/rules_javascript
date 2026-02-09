#!/usr/bin/env bash
set -euo pipefail

cd "$BUILD_WORKSPACE_DIRECTORY"
find . -path '*/test/bazel/*' \( -name BUILD -o -name BUILD.bazel \) \
  | sed -e 's:/[^/]*$::' -e 's:^\./://:' \
  | sort
