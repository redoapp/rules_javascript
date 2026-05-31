import { withFileCache } from "@rules-javascript/util-cache";
import { JsonFormat } from "@rules-javascript/util-json";
import { Cache, structUtils, ThrowReport } from "@yarnpkg/core";
import { ArgumentParser } from "argparse";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { toJsonFile } from "./json";
import { NpmRegistryClient } from "./npm";
import { getEffectivePatch } from "./patch";
import { getPackage, ResolvedNpmPackage, resolvePackages } from "./resolve";
import { getPackageInfos, yarnProject } from "./yarn";

(async () => {
  // parse args
  const parser = new ArgumentParser({
    description: "Generate JSON package tree from yarn resolutions.",
    prog: "yarn-resolve",
  });
  parser.add_argument("--dir", {
    help: "Directory for package.json and yarn.lock.",
    required: true,
  });
  parser.add_argument("output", { help: "Path to JSON output." });
  parser.add_argument("patches", { help: "Path to patches output." });

  const args = parser.parse_args();

  const { configuration, project } = await yarnProject(args.dir);

  // patch resolution context (lets Yarn load builtin compat patches)
  const fetchOptions = {
    cache: await Cache.find(configuration),
    checksums: project.storedChecksums,
    fetcher: configuration.makeFetcher(),
    project,
    report: new ThrowReport(),
  };

  // list packages
  console.error("Listing packages");
  const packageInfos = await getPackageInfos(project);

  // resolve
  const cachePath = join(args.dir, ".bazel-npm-cache.json");
  const { packages: bzlPackages, roots: bzlRoots } = await withFileCache(
    cachePath,
    "3",
    JsonFormat.string(),
    ResolvedNpmPackage.json,
  )(async (cache) => {
    const npmClient = new NpmRegistryClient(configuration);
    return await resolvePackages(
      packageInfos,
      async (npmSpecifier) => {
        const id = structUtils.stringifyLocator(npmSpecifier);
        return cache.asyncGet(
          id,
          async () => await getPackage(npmClient, npmSpecifier),
        );
      },
      (locator) => getEffectivePatch(locator, fetchOptions),
      (message) => console.error(message),
    );
  });

  // output
  const starlarkFile = toJsonFile(bzlPackages, bzlRoots);
  await writeFile(args.output, JSON.stringify(starlarkFile, undefined, 2));
  await rm(args.patches, { force: true, recursive: true });
  await mkdir(args.patches);
  const writtenPatches = new Map<string, string>();
  for (const bzlPackage of bzlPackages.values()) {
    const patch = bzlPackage.patch;
    if (patch === undefined) {
      continue;
    }
    const existing = writtenPatches.get(patch.file);
    if (existing === undefined) {
      writtenPatches.set(patch.file, patch.content);
      await writeFile(join(args.patches, patch.file), patch.content);
    } else if (existing !== patch.content) {
      throw new Error(`Patch file collision for ${patch.file}`);
    }
  }
  console.error(`Created ${bzlPackages.size} packages`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
