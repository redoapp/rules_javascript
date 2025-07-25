#!/usr/bin/env bash
set -euo pipefail

# For additional options to the Node.js runtime, use the
# NODE_OPTIONS environment variable.

if [ -z "${RUNFILES_DIR-}" ]; then
  if [ ! -z "${RUNFILES_MANIFEST_FILE-}" ]; then
    export RUNFILES_DIR="${RUNFILES_MANIFEST_FILE%.runfiles_manifest}.runfiles"
  else
    export RUNFILES_DIR="$0.runfiles"
  fi
fi

export PLAYWRIGHT_CONFIG="$RUNFILES_DIR"/%{config}
export PLAYWRIGHT_ROOT="$RUNFILES_DIR"/%{root}
export NODE_PACKAGE_MANIFEST="$RUNFILES_DIR"/%{package_manifest}

args=()

# sharding
if [ ! -z "${TEST_SHARD_INDEX-}" ] && [ ! -z "${TEST_TOTAL_SHARDS-}" ]; then
  args+=(--shard="$(("$TEST_SHARD_INDEX"+1))"/"$TEST_TOTAL_SHARDS")
fi

%{preamble}

# exta arguments
args+=("$@")

# test filter
if [ ! -z "${TESTBRIDGE_TEST_ONLY-}" ]; then
  args+=("$TESTBRIDGE_TEST_ONLY")
fi

function abspath () {
  if [[ "$1" == /* ]]; then
    echo "$1"
  else
    echo "$PWD"/"$1"
  fi
}

export NODE_OPTIONS="${NODE_OPTIONS-} --experimental-specifier-resolution=node"

%{env} \
  exec -a "$0" "$RUNFILES_DIR"/%{node} \
  -r "$(abspath "$RUNFILES_DIR"/%{module_linker})" \
  -r "$(abspath "$RUNFILES_DIR"/%{runtime})" \
  --experimental-loader "$(abspath "$RUNFILES_DIR"/%{esm_loader})" \
  --experimental-specifier-resolution=node \
  --preserve-symlinks \
  --preserve-symlinks-main \
  %{node_options} \
  "$(abspath "$RUNFILES_DIR"/%{main_module})" \
  test \
  --config="$RUNFILES_DIR"/%{config} \
  "${arr[@]+"${arr[@]}"}"
