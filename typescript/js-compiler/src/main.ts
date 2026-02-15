import { patchFs } from "@rules-javascript/nodejs-fs-linker/fs";
import { patchFsPromises } from "@rules-javascript/nodejs-fs-linker/fs-promises";
import { WrapperVfs } from "@rules-javascript/nodejs-fs-linker/vfs";
import { workerMain } from "@rules-javascript/nodejs-worker";

workerMain(async () => {
  const vfs = new WrapperVfs();
  patchFs(vfs, require("node:fs"));
  patchFsPromises(vfs, require("node:fs").promises);

  const { JsWorker, JsWorkerError } = await import("./worker");
  const worker = new JsWorker(vfs);
  return async (a) => {
    try {
      await worker.run(a);
    } catch (error) {
      if (error instanceof JsWorkerError) {
        return { exitCode: 2, output: error.message };
      }
      return {
        exitCode: 1,
        output: error instanceof Error ? error.stack || "" : String(error),
      };
    }
    return { exitCode: 0, output: "" };
  };
});
