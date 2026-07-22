import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const manifestPath = "ci/gitlab-parity.json";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const github = readFileSync(manifest.sourceWorkflow, "utf8");
const gitlab = readFileSync(manifest.targetWorkflow, "utf8");
const runnerBoundaryPath = "ci/assert-secretless-runner.sh";
const runnerBoundary = readFileSync(runnerBoundaryPath, "utf8");

function jobBlock(workflow, jobId, indentation) {
  const escapedId = jobId.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const prefix = " ".repeat(indentation);
  const startPattern = new RegExp(String.raw`^${prefix}${escapedId}:\s*$`, "m");
  const match = startPattern.exec(workflow);
  assert(match, `missing job ${jobId}`);

  const start = match.index + match[0].length;
  const nextPattern = new RegExp(
    String.raw`^${prefix}[A-Za-z0-9_-]+:\s*$`,
    "gm",
  );
  nextPattern.lastIndex = start;
  const next = nextPattern.exec(workflow);
  return workflow.slice(start, next?.index ?? workflow.length);
}

function githubJobIds(workflow) {
  const lines = workflow.split("\n");
  const jobsLine = lines.indexOf("jobs:");
  assert.notEqual(jobsLine, -1, "GitHub workflow has no jobs mapping");

  const ids = [];
  for (const line of lines.slice(jobsLine + 1)) {
    const match = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (match) ids.push(match[1]);
    else if (/^\S/.test(line)) break;
  }
  return ids;
}

function retryFailures(workflow) {
  const match = /^ {2}retry:\s*\n((?: {4,}.*\n?)*)/m.exec(workflow);
  assert(match, "default.retry is missing");
  return [...match[1].matchAll(/^ {6}- ([A-Za-z0-9_]+)\s*$/gm)].map(
    (entry) => entry[1],
  );
}

assert.equal(manifest.version, 1, "unsupported parity manifest version");
assert.deepEqual(
  githubJobIds(github).sort(),
  manifest.jobs.map((mapping) => mapping.github.id).sort(),
  "every GitHub job must have an explicit parity mapping",
);

for (const mapping of manifest.jobs) {
  const githubBlock = jobBlock(github, mapping.github.id, 2);
  const gitlabBlock = jobBlock(gitlab, mapping.gitlab.id, 0);

  assert(
    githubBlock.includes(`name: ${mapping.github.name}`),
    `GitHub job ${mapping.github.id} changed its display name`,
  );
  assert.deepEqual(
    mapping.github.commands,
    mapping.gitlab.commands,
    `command parity differs for ${mapping.github.id}`,
  );
  for (const command of mapping.github.commands) {
    assert(
      githubBlock.includes(command),
      `GitHub job ${mapping.github.id} no longer runs: ${command}`,
    );
    assert(
      gitlabBlock.includes(command),
      `GitLab job ${mapping.gitlab.id} does not run: ${command}`,
    );
  }
}

const lintMapping = manifest.jobs.find(
  (mapping) => mapping.github.id === "lint",
);
assert.equal(
  lintMapping?.gitlab.scope,
  "all-files",
  "GitLab lint must cover all files",
);

for (const jobId of manifest.requiredGitLabJobs) {
  jobBlock(gitlab, jobId, 0);
}

const { runnerContract } = manifest;
assert.match(
  runnerContract.image,
  /@sha256:[0-9a-f]{64}$/,
  "runner image must use an immutable digest",
);
assert(
  gitlab.includes(`    name: ${runnerContract.image}`),
  "GitLab runner image differs from the parity contract",
);
assert(
  gitlab.includes(`    - ${runnerContract.tag}`),
  "GitLab runner tag differs from the parity contract",
);
assert.deepEqual(
  retryFailures(gitlab),
  runnerContract.retryFailures,
  "retry must cover only runner infrastructure failures",
);
assert.deepEqual(
  runnerContract.secretVariables,
  [],
  "untrusted merge-request jobs cannot require secrets",
);
assert(
  runnerContract.hardenedRunnerRequiredForSecrets,
  "secret-bearing jobs must remain blocked until the hardened runner is live",
);
assert(
  runnerContract.hardenedRunnerRequiredForAllJobs,
  "ordinary jobs must remain blocked until the hardened runner is live",
);
assert(
  runnerContract.proofMode === "blocked-pending-hardened-untrusted-runner",
  "the GitLab candidate must remain blocked pending runner hardening",
);
assert(
  gitlab.includes(". ci/assert-secretless-runner.sh"),
  "every GitLab job must run the secretless boundary assertion first",
);
assert(
  gitlab.indexOf(". ci/assert-secretless-runner.sh") <
    gitlab.indexOf(".github/configure-bazel"),
  "the trust assertion must run before repository setup",
);
assert(
  runnerBoundary.includes("AWS_WEB_IDENTITY_TOKEN_FILE") &&
    runnerBoundary.includes("AWS_ACCESS_KEY_ID"),
  "ambient AWS credential variables must be rejected",
);
assert(
  runnerBoundary.includes(
    "/var/run/secrets/kubernetes.io/serviceaccount/token",
  ) && runnerBoundary.includes("/var/run/docker.sock"),
  "Kubernetes and container-runtime access must be rejected",
);
assert(
  runnerBoundary.includes("169.254.169.254/latest/meta-data") &&
    runnerBoundary.includes("169.254.169.254/latest/api/token") &&
    runnerBoundary.includes("aws sts get-caller-identity"),
  "ambient metadata and AWS identity access must be rejected",
);
assert(
  runnerBoundary.includes("REDO_CI_TRUST_BOUNDARY") &&
    runnerBoundary.includes("REDO_CI_CONTAINER_RUNTIME"),
  "the hardened untrusted no-runtime profile must be required",
);
assert(
  gitlab.includes('test -z "${GITLAB_TOKEN+x}"'),
  "non-secret proof must fail if the configured GitLab token is injected",
);
assert(
  gitlab.includes("  HOME: /tmp"),
  "Bazel state must use writable pod-local storage",
);
assert(
  gitlab.includes("common:linux --disk_cache=/tmp/bazel-disk"),
  "Bazel disk cache must override the root-owned runner mount",
);
assert(
  gitlab.includes(
    "build --@bazel_util//generate:format_filter=@bazel_util//file:all_filter",
  ),
  "GitLab lint must not depend on a detached-ref changed-file filter",
);
assert(
  gitlab.includes("'build --config=ci'"),
  "GitLab Bazel commands must retain the repository CI configuration",
);
assert(
  gitlab.includes("build --noworker_sandboxing"),
  "persistent workers must not nest a mount sandbox inside the runner pod",
);
assert(
  gitlab.includes("build --noexperimental_use_hermetic_linux_sandbox"),
  "the runner pod cannot provide Bazel's nested hermetic mount namespace",
);
assert(
  gitlab.includes("on_new_commit: interruptible"),
  "new merge-request commits must auto-cancel interruptible work",
);
assert(
  gitlab.includes('$CI_PIPELINE_SOURCE == "merge_request_event"'),
  "merge-request pipeline rule is missing",
);
assert(
  gitlab.includes("$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH"),
  "default-branch pipeline rule is missing",
);
assert(!gitlab.includes("allow_failure"), "required jobs cannot allow failure");

const cleanEnvironment = {
  PATH: process.env.PATH,
  HOME: "/tmp/rules-javascript-secretless-test",
  REDO_CI_TRUST_BOUNDARY: "untrusted",
  REDO_CI_CONTAINER_RUNTIME: "none",
};

// GitHub's hosted lint runner intentionally exposes facilities that the
// hardened GitLab runner must not expose (notably /var/run/docker.sock). Keep
// the checked-in policy strict, but isolate its variable/profile regression
// tests from whichever host happens to execute this verifier.
const hostDependentChecks = [
  `[[ ! -e /var/run/secrets/kubernetes.io/serviceaccount/token ]] || {
    echo "Kubernetes service-account token is reachable from the job" >&2
    exit 1
}`,
  `[[ ! -S /var/run/docker.sock ]] || {
    echo "Container runtime socket is reachable from the job" >&2
    exit 1
}`,
  String.raw`if curl --fail --silent --max-time 2 \
    http://169.254.169.254/latest/meta-data/iam/security-credentials/ \
    >/dev/null 2>&1; then
    echo "IMDSv1 is reachable from the job" >&2
    exit 1
fi`,
  String.raw`imds_token=$(curl --fail --silent --max-time 2 --request PUT \
    --header 'X-aws-ec2-metadata-token-ttl-seconds: 60' \
    http://169.254.169.254/latest/api/token 2>/dev/null || true)
[[ -z $imds_token ]] || {
    echo "IMDSv2 is reachable from the job" >&2
    exit 1
}`,
  `if AWS_EC2_METADATA_DISABLED=true aws sts get-caller-identity >/dev/null 2>&1; then
    echo "Ambient AWS identity is available to the job" >&2
    exit 1
fi`,
];
let runnerBoundaryForRegressionTests = runnerBoundary;
for (const check of hostDependentChecks) {
  assert(
    runnerBoundaryForRegressionTests.includes(check),
    "a required host-dependent runner denial changed unexpectedly",
  );
  runnerBoundaryForRegressionTests = runnerBoundaryForRegressionTests.replace(
    check,
    ": # Host-dependent denial verified statically above.",
  );
}

function runnerBoundaryStatus(extraEnvironment = {}) {
  return spawnSync("bash", ["-c", runnerBoundaryForRegressionTests], {
    env: { ...cleanEnvironment, ...extraEnvironment },
    encoding: "utf8",
  });
}

const cleanBoundaryResult = runnerBoundaryStatus();
assert.equal(
  cleanBoundaryResult.status,
  0,
  `a clean hardened-untrusted environment must pass: ${cleanBoundaryResult.stderr}`,
);
assert.notEqual(
  runnerBoundaryStatus({ AWS_ACCESS_KEY_ID: "ambient-access-key" }).status,
  0,
  "an ambient AWS access key must be denied",
);
assert.notEqual(
  runnerBoundaryStatus({ AWS_WEB_IDENTITY_TOKEN_FILE: "/tmp/web-token" })
    .status,
  0,
  "an ambient AWS web identity must be denied",
);
assert.notEqual(
  runnerBoundaryStatus({ GITLAB_TOKEN: "configured-admin-token" }).status,
  0,
  "a configured GitLab token must be denied",
);
assert.notEqual(
  runnerBoundaryStatus({ REDO_CI_TRUST_BOUNDARY: "trusted" }).status,
  0,
  "a trusted/credentialed runner profile must be denied",
);

console.log(
  `GitLab parity verified: ${manifest.jobs.length} GitHub jobs, ${manifest.requiredGitLabJobs.length} required GitLab jobs; cutover blocked pending hardened untrusted runner.`,
);
