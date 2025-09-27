import { PackageTree } from "@better-rules-javascript/commonjs-package";
import { createVfs } from "@better-rules-javascript/nodejs-fs-linker/package";
import { WrapperVfs } from "@better-rules-javascript/nodejs-fs-linker/vfs";
import { JsonFormat } from "@better-rules-javascript/util-json";
import { ArgumentParser } from "argparse";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";
import {
  getOutputFileNames,
  getParsedCommandLineOfConfigFile,
  ParsedCommandLine,
  sys,
  transpileModule,
} from "typescript";
import { formatDiagnostics } from "./diagnostic";

interface JsArgs {
  config: string;
  manifest: string;
  output: string;
  srcDir: string;
  srcs: string[];
}

export class JsWorkerError extends Error {}

class JsArgumentParser extends ArgumentParser {
  exit(status: number, message: string) {
    throw new JsWorkerError(message);
  }
}

export class JsWorker {
  constructor(private readonly vfs: WrapperVfs) {
    this.parser.add_argument("--config", { required: true });
    this.parser.add_argument("--manifest", { required: true });
    this.parser.add_argument("--src-dir", { dest: "srcDir" });
    this.parser.add_argument("output");
    this.parser.add_argument("srcs", { nargs: "*" });
  }

  private readonly parser = new JsArgumentParser();

  private parseConfig(config: string) {
    const parsed = getParsedCommandLineOfConfigFile(
      config,
      {},
      {
        ...sys,
        onUnRecoverableConfigFileDiagnostic: (error) => {
          throw new JsWorkerError(formatDiagnostics([error]));
        },
      },
    )!;
    const errors = parsed.errors.filter(
      (diagnostic) => diagnostic.code !== 18_002,
    );
    if (errors.length > 0) {
      throw new JsWorkerError(formatDiagnostics(errors));
    }
    return parsed;
  }

  private async setupVfs(manifest: string) {
    const packageTree = JsonFormat.parse(
      PackageTree.json(),
      await readFile(manifest, "utf8"),
    );
    const vfs = createVfs(packageTree);
    this.vfs.delegate = vfs;
  }

  async run(a: string[]) {
    const args: JsArgs = this.parser.parse_args(a);

    await this.setupVfs(args.manifest);

    const parsed = this.parseConfig(args.config);
    await mkdir(parsed.options.outDir!, { recursive: true });

    for (const src of args.srcs) {
      let outputPath: string;
      if (args.srcDir === undefined) {
        outputPath = args.output;
      } else {
        const fileName = resolve(src);
        [outputPath] = getOutputFileNames(
          { ...parsed, fileNames: [fileName] },
          fileName,
          false,
        );
        outputPath = resolve(args.output, relative(args.srcDir, outputPath));
      }
      await transpileFile(src, outputPath, parsed);
    }
  }
}

async function transpileFile(
  src: string,
  outputPath: string,
  parsed: ParsedCommandLine,
) {
  const input = await readFile(src, "utf8");
  const result = transpileModule(input, {
    fileName: basename(src),
    compilerOptions: { ...parsed.options },
  });
  if (result.diagnostics!.length > 0) {
    throw new JsWorkerError(formatDiagnostics(result.diagnostics!));
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, result.outputText, "utf8");
  if (result.sourceMapText !== undefined) {
    await writeFile(`${outputPath}.map`, result.sourceMapText, "utf8");
  }
}
