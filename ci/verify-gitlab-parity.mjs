import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifestPath = "ci/gitlab-parity.json";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const github = readFileSync(manifest.sourceWorkflow, "utf8");
const gitlab = readFileSync(manifest.targetWorkflow, "utf8");

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
  gitlab.includes("hardened_state=current-spot-non-secret-only"),
  "current spot proof boundary is not explicit",
);
assert(
  gitlab.includes('test "$REDO_CI_TRUST_BOUNDARY" = "untrusted"'),
  "advertised runner trust boundary is not validated",
);
assert(
  gitlab.includes('test "${REDO_CI_CONTAINER_RUNTIME:-}" = "podman-rootless"'),
  "advertised rootless container runtime is not validated",
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

console.log(
  `GitLab parity verified: ${manifest.jobs.length} GitHub jobs, ${manifest.requiredGitLabJobs.length} required GitLab jobs, immutable non-secret spot proof.`,
);
