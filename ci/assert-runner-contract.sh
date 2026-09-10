#!/usr/bin/env bash
set -euo pipefail

[[ ${CI_RUNNER_DESCRIPTION:-} == redo-build-size-2 ]] || {
    echo "unexpected runner description" >&2
    exit 1
}
case ${CI_RUNNER_TAGS:-} in
    *redo-build-size-2*) ;;
    *) echo "unexpected runner tags" >&2; exit 1 ;;
esac

# Protected group/project variables must never reach unprotected MR refs. Main
# is reviewed and protected; discard these unrelated variables before setup.
if [[ ${CI_PIPELINE_SOURCE:-} == merge_request_event ]]; then
    for name in GITLAB_TOKEN REDONT_GITLAB_TOKEN; do
        if printenv "$name" >/dev/null 2>&1; then
            echo "$name is forbidden in merge-request jobs" >&2
            exit 1
        fi
    done
fi
unset GITLAB_TOKEN REDONT_GITLAB_TOKEN

export AWS_EC2_METADATA_DISABLED=true
echo "Existing spot runner contract verified"
