import { workerMain } from "@rules-javascript/nodejs-worker";
import { ArgumentParser } from "argparse";
import { DigestWorker } from "./worker";

workerMain(async (a) => {
  const parser = new ArgumentParser();
  parser.parse_args(a);

  const worker = new DigestWorker();

  return async (a) => {
    try {
      await worker.run(a);
      return {
        exitCode: 0,
        output: "",
      };
    } catch (error) {
      return {
        exitCode: 1,
        output: error instanceof Error ? error.stack! : String(error),
      };
    }
  };
});
