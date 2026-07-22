#!/usr/bin/env bash
set -euo pipefail

for name in \
    AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN \
    AWS_CONTAINER_CREDENTIALS_FULL_URI AWS_CONTAINER_CREDENTIALS_RELATIVE_URI \
    AWS_WEB_IDENTITY_TOKEN_FILE AWS_ROLE_ARN AWS_PROFILE AWS_DEFAULT_PROFILE \
    AWS_SHARED_CREDENTIALS_FILE AWS_CONFIG_FILE; do
    if printenv "$name" >/dev/null 2>&1; then
        echo "$name exposed an ambient AWS credential source" >&2
        exit 1
    fi
done

if printenv GITLAB_TOKEN >/dev/null 2>&1; then
    echo "Configured GITLAB_TOKEN is forbidden in ordinary jobs" >&2
    exit 1
fi

[[ ! -e /var/run/secrets/kubernetes.io/serviceaccount/token ]] || {
    echo "Kubernetes service-account token is reachable from the job" >&2
    exit 1
}
[[ ! -S /var/run/docker.sock ]] || {
    echo "Container runtime socket is reachable from the job" >&2
    exit 1
}

if curl --fail --silent --max-time 2 \
    http://169.254.169.254/latest/meta-data/iam/security-credentials/ \
    >/dev/null 2>&1; then
    echo "IMDSv1 is reachable from the job" >&2
    exit 1
fi
imds_token=$(curl --fail --silent --max-time 2 --request PUT \
    --header 'X-aws-ec2-metadata-token-ttl-seconds: 60' \
    http://169.254.169.254/latest/api/token 2>/dev/null || true)
[[ -z $imds_token ]] || {
    echo "IMDSv2 is reachable from the job" >&2
    exit 1
}
if AWS_EC2_METADATA_DISABLED=true aws sts get-caller-identity >/dev/null 2>&1; then
    echo "Ambient AWS identity is available to the job" >&2
    exit 1
fi

[[ ${REDO_CI_TRUST_BOUNDARY:-} == untrusted ]] || {
    echo "Runner does not advertise the hardened untrusted boundary" >&2
    exit 1
}
[[ ${REDO_CI_CONTAINER_RUNTIME:-} == none ]] || {
    echo "Runner does not advertise the no-runtime boundary" >&2
    exit 1
}

export AWS_EC2_METADATA_DISABLED=true
echo "Hardened secretless runner boundary verified"
