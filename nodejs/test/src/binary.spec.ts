import { spawnOptions } from "@better-rules-javascript/test";
import * as childProcess from "node:child_process";

test("Binary archive", () => {
  const result = childProcess.spawnSync("bazel", ["run", "binary:bin"], {
    cwd: "nodejs/test/bazel",
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "inherit"],
    ...spawnOptions(),
  });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("Hello world");
});
