import { spawnOptions } from "@better-rules-javascript/test";
import * as childProcess from "node:child_process";

test("Development", () => {
  const result = childProcess.spawnSync("bazel", ["build", "material:bundle"], {
    cwd: "angular/test/bazel",
    stdio: "inherit",
    ...spawnOptions(),
  });
  expect(result.status).toBe(0);
});

test("Optimizied", () => {
  const result = childProcess.spawnSync(
    "bazel",
    ["build", "--compilation_mode=opt", "material:bundle"],
    {
      cwd: "angular/test/bazel",
      stdio: "inherit",
      ...spawnOptions(),
    },
  );
  expect(result.status).toBe(0);
});
