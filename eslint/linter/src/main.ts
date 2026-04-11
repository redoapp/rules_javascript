import { workerMain } from "@rules-javascript/nodejs-worker";
import { AppendAction } from "@rules-javascript/util-argparse/actions";
import { ArgumentParser } from "argparse";
import { ESLint } from "eslint";
import { createRequire } from "node:module";
import { EslintWorker } from "./worker";

const eslintRequire = createRequire(require.resolve("eslint"));
const createCLIOptions = eslintRequire("./options");
const translateOptions = eslintRequire("./shared/translate-cli-options");

function createEslint(file: string, args: string[]) {
  const cliOptions = createCLIOptions();
  cliOptions.parse(args);
  return new ESLint({
    ...translateOptions(cliOptions),
    fix: true,
    globInputPaths: false,
    overrideConfigFile: file,
  });
}

workerMain(async (a) => {
  const parser = new ArgumentParser();
  parser.add_argument("--arg", {
    action: AppendAction,
    default: [],
    dest: "args",
  });
  parser.add_argument("--config", { required: true });
  const args = parser.parse_args(a);

  const eslint = createEslint(args.config, args.args);
  const worker = new EslintWorker(eslint);

  return async (a) => {
    try {
      const messages = await worker.run(a);
      return {
        exitCode: messages.some(({ type }) => type === "error") ? 2 : 0,
        output: messages.map(({ content }) => content).join("\n"),
      };
    } catch (error) {
      return {
        exitCode: 1,
        output: error instanceof Error ? error.stack! : String(error),
      };
    }
  };
});
