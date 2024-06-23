import { manifestParse } from "@better-rules-javascript/pkg-manifest";
import { ArgumentParser } from "argparse";
import { readFile, writeFile } from "node:fs/promises";

interface Args {
  input: string;
  output: string;
  workspace: string;
}

async function main() {
  const parser = new ArgumentParser({ prog: "pkg-runfiles-manifest" });
  parser.add_argument("--workspace", { required: true });
  parser.add_argument("input");
  parser.add_argument("output");
  const args: Args = parser.parse_args();

  let input: Buffer[] = [];
  for await (const chunk of process.stdin) {
    input.push(chunk);
  }
  const manifest = manifestParse(await readFile(args.input));
  for (const entry of manifest) {
    if (entry.type !== "file" && entry.type !== "tree") {
      continue;
    }
    const parts = entry.src.split("/").slice(3);
    if (parts[0] === "external") {
      parts.shift();
    } else {
      parts.unshift(args.workspace);
    }
    entry.src = parts.join("/");
  }
  await writeFile(args.output, JSON.stringify(manifest));
}

main().catch((error) => {
  console.error(error.stack);
  process.exit(1);
});
