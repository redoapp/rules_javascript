import { spawnOptions } from "@rules-javascript/test";
import * as childProcess from "node:child_process";

test("Compiles JavaScript sources to declarations", () => {
  const result = childProcess.spawnSync("bazel", ["build", "allowjs:lib"], {
    cwd: "typescript/test/bazel",
    stdio: "inherit",
    ...spawnOptions(),
  });
  expect(result.status).toBe(0);
});
