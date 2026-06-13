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

function abspath () {
  if [[ "$1" == /* ]]; then
    echo "$1"
  else
    echo "$PWD"/"$1"
  fi
}

pnp_cjs=%{pnp_cjs}
pnp_loader=%{pnp_loader}

%{env} \
  exec -a "$0" %{node} \
  -r "$(abspath "$RUNFILES_DIR"/%{runtime})" \
  $([ -z "$pnp_cjs" ] || echo -r "$(abspath "$RUNFILES_DIR"/"$pnp_cjs")") \
  $([ -z "$pnp_loader" ] || echo --experimental-loader "$(abspath "$RUNFILES_DIR"/"$pnp_loader")") \
  --preserve-symlinks \
  --preserve-symlinks-main \
  %{node_options} \
  ${NODE_OPTIONS_APPEND:-} \
  "$(abspath "$RUNFILES_DIR"/%{main_module})" \
  "$@"
