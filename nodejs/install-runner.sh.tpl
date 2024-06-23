#!/usr/bin/env bash

if [ -z "${RUNFILES_DIR-}" ]; then
  if [ ! -z "${RUNFILES_MANIFEST_FILE-}" ]; then
    export RUNFILES_DIR="${RUNFILES_MANIFEST_FILE%.runfiles_manifest}.runfiles"
  else
    export RUNFILES_DIR="$0.runfiles"
  fi
fi

node_modules="${BUILD_WORKSPACE_DIRECTORY-.}"/%{path}

echo "Write to $node_modules" >&2

exec "$RUNFILES_DIR"/%{pkg_sync} --manifest="$RUNFILES_DIR"/%{manifest} "$RUNFILES_DIR" "$node_modules"
