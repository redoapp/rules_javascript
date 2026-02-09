import { spawnOptions } from "@rules-javascript/test";
import * as childProcess from "node:child_process";

test("Browser", () => {
  process.stdout.write(process.cwd() + "\n");
  const result = childProcess.spawnSync("bazel", ["test", "browser:test"], {
    cwd: "playwright/test/bazel",
    stdio: "inherit",
    ...spawnOptions(),
  });
  expect(result.status).toBe(0);
});
