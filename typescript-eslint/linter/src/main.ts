import { PackageTree } from "@rules-javascript/commonjs-package";
import { patchFs } from "@rules-javascript/nodejs-fs-linker/fs";
import { patchFsPromises } from "@rules-javascript/nodejs-fs-linker/fs-promises";
import { createVfs } from "@rules-javascript/nodejs-fs-linker/package";
import { AppendAction } from "@rules-javascript/util-argparse/actions";
import { JsonFormat } from "@rules-javascript/util-json";
import { ArgumentParser } from "argparse";
import { ESLint, Linter } from "eslint";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const eslintRequire = createRequire(require.resolve("eslint"));
const createCLIOptions = eslintRequire("./options");
const translateOptions = eslintRequire("./shared/translate-cli-options");

async function main() {
  const parser = new ArgumentParser();
  parser.add_argument("--arg", {
    action: AppendAction,
    default: [],
    dest: "args",
  });
  parser.add_argument("--config", { required: true });
  parser.add_argument("--manifest", { required: true });
  parser.add_argument("srcs", { nargs: "*" });

  const args = parser.parse_args();

  const packageTree = JsonFormat.parse(
    PackageTree.json(),
    await readFile(args.manifest, "utf8"),
  );
  const vfs = createVfs(packageTree);
  patchFs(vfs, require("node:fs"));
  patchFsPromises(vfs, require("node:fs").promises);

  const cliOptions = createCLIOptions();
  const options = await translateOptions(
    cliOptions.parseArgv([...process.argv.slice(0, 2), ...args.args]),
  );

  const eslint = new ESLint({
    ...options,
    fix: true,
    globInputPaths: false,
    overrideConfigFile: args.config,
  });

  for (const spec of args.srcs) {
    const [src, dest] = spec.split("=", 2);
    const input = await readFile(src, "utf8");
    const [report] = await eslint.lintText(input, {
      filePath: src,
    });
    await writeFile(dest, report?.output ?? input, "utf8");
    if (!report) {
      continue;
    }
    for (const message of report.messages) {
      console.log(messageString(src, message));
    }
    if (report.errorCount) {
      process.exit(2);
    }
  }
}

main().catch((error) => {
  console.error(error.stack);
  process.exit(1);
});

function messageString(file: string, message: Linter.LintMessage) {
  return `${file} ${message.line}:${message.column}: ${message.ruleId} ${message.message}`;
}
