import { bazelBin, spawnOptions } from "@rules-javascript/test";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

// Cold nested Bazel startup took 88s in CI; Jest's 60s default is too short.
const BAZEL_BUILD_TIMEOUT_MS = 120_000;

test(
  "Dev mode",
  async () => {
    const bin = await bazelBin("webpack/test/bazel");
    const result = childProcess.spawnSync("bazel", ["build", "basic:bundle"], {
      cwd: "webpack/test/bazel",
      stdio: "inherit",
      ...spawnOptions(),
    });
    expect(result.status).toBe(0);
    const content = await fs.promises.readFile(
      path.join(bin, "basic/bundle/main.js"),
      { encoding: "utf8" },
    );
    expect(content).toContain("eval");
  },
  BAZEL_BUILD_TIMEOUT_MS,
);

test(
  "Optimized mode",
  async () => {
    const bin = await bazelBin("webpack/test/bazel", [
      "--compilation_mode=opt",
    ]);
    const result = childProcess.spawnSync(
      "bazel",
      ["build", "--compilation_mode=opt", "basic:bundle"],
      {
        cwd: "webpack/test/bazel",
        stdio: "inherit",
        ...spawnOptions(),
      },
    );
    expect(result.status).toBe(0);
    const content = await fs.promises.readFile(
      path.join(bin, "basic/bundle/main.js"),
      { encoding: "utf8" },
    );
    expect(content).not.toContain("eval");
  },
  BAZEL_BUILD_TIMEOUT_MS,
);
