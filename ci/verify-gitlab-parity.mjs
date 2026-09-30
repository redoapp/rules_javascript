import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const manifestPath = "ci/gitlab-parity.json";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const github = readFileSync(manifest.sourceWorkflow, "utf8");
const gitlab = readFileSync(manifest.targetWorkflow, "utf8");
const runnerContractPath = "ci/assert-runner-contract.sh";
const runnerContractScript = readFileSync(runnerContractPath, "utf8");

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
  "merge-request jobs cannot require secrets",
);
assert.equal(
  runnerContract.proofMode,
  "functional-existing-spot-runner",
  "the candidate must use the accepted existing spot runner lane",
);
assert(
  gitlab.includes(". ci/assert-runner-contract.sh"),
  "every GitLab job must verify the runner contract first",
);
assert(
  gitlab.indexOf(". ci/assert-runner-contract.sh") <
    gitlab.indexOf(".github/configure-bazel"),
  "the runner assertion must run before repository setup",
);
assert(
  runnerContractScript.includes("CI_RUNNER_DESCRIPTION") &&
    runnerContractScript.includes("CI_RUNNER_TAGS"),
  "runner identity and tags must be verified",
);
assert(
  runnerContractScript.includes("GITLAB_TOKEN") &&
    runnerContractScript.includes("REDONT_GITLAB_TOKEN"),
  "protected GitLab variables must be rejected on merge-request refs",
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
  HOME: "/tmp/rules-javascript-runner-contract-test",
  CI_PIPELINE_SOURCE: "merge_request_event",
  CI_RUNNER_DESCRIPTION: "redo-build-size-2",
  CI_RUNNER_TAGS: "redo-build-size-2",
};

function runnerContractStatus(extraEnvironment = {}) {
  return spawnSync("bash", [runnerContractPath], {
    env: { ...cleanEnvironment, ...extraEnvironment },
    encoding: "utf8",
  });
}

const cleanContractResult = runnerContractStatus();
assert.equal(
  cleanContractResult.status,
  0,
  `the accepted spot runner contract must pass: ${cleanContractResult.stderr}`,
);
assert.notEqual(
  runnerContractStatus({ CI_RUNNER_DESCRIPTION: "unexpected-runner" }).status,
  0,
  "an unexpected runner must be denied",
);
assert.notEqual(
  runnerContractStatus({ GITLAB_TOKEN: "configured-admin-token" }).status,
  0,
  "a configured GitLab token must be denied on merge-request refs",
);
assert.notEqual(
  runnerContractStatus({ REDONT_GITLAB_TOKEN: "configured-redont-token" })
    .status,
  0,
  "the protected ReDONT token must be denied on merge-request refs",
);

console.log(
  `GitLab parity verified: ${manifest.jobs.length} GitHub jobs, ${manifest.requiredGitLabJobs.length} required GitLab jobs; existing spot runner lane accepted.`,
);
