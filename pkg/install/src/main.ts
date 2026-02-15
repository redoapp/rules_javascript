import { rlocation } from "@rules-javascript/nodejs-runfiles";
import {
  InstallEntry,
  InstallManifest,
  installManifestFormat,
} from "@rules-javascript/pkg-install-manifest";
import { JsonFormat } from "@rules-javascript/util-json";
import { ArgumentParser } from "argparse";
import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";

(async () => {
  const parser = new ArgumentParser();
  parser.add_argument("manifest");
  parser.add_argument("output");
  const args = parser.parse_args();

  const manifestContent = await readFile(args.manifest, "utf8");
  const manifest = JsonFormat.parse(
    installManifestFormat(false),
    manifestContent,
  );

  const existingPath = join(args.output, ".install-manifest.json");
  let existing: InstallManifest | undefined;
  try {
    const existingContent = await readFile(existingPath, "utf8");
    if (manifestContent === existingContent) {
      return;
    }
    existing = JsonFormat.parse(installManifestFormat(false), existingContent);
    await rm(existingPath); // don't allow partial progress
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      await rm(args.output, { force: true, recursive: true });
    } else {
      throw error;
    }
  }

  await install(manifest, existing, args.output);
  await writeFile(existingPath, manifestContent);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function install(
  manifest: InstallEntry,
  existing: InstallEntry | undefined,
  path: string,
) {
  switch (manifest.type) {
    case InstallEntry.DIR: {
      if (existing && existing.type !== InstallEntry.DIR) {
        await rm(path, { recursive: existing.type !== InstallEntry.FILE });
        existing = undefined;
      }
      await (existing
        ? Promise.all(
            [...existing.entries.entries()].map(async ([name, entry]) => {
              if (!manifest.entries.has(name)) {
                const childPath = join(path, name);
                await rm(childPath, {
                  recursive: entry.type !== InstallEntry.FILE,
                });
              }
            }),
          )
        : mkdir(path));
      await Promise.all(
        [...manifest.entries.entries()].map(async ([name, entry]) => {
          const childPath = join(path, name);
          await install(
            entry,
            (existing as InstallEntry.Dir | undefined)?.entries.get(name),
            childPath,
          );
        }),
      );
      break;
    }
    case InstallEntry.FILE: {
      if (
        existing &&
        !(
          existing.type == InstallEntry.FILE &&
          manifest.digest.equals(existing.digest)
        )
      ) {
        await rm(path, { recursive: existing.type !== InstallEntry.FILE });
        existing = undefined;
      }
      if (!existing) {
        await copyFile(rlocation(manifest.src)!, path);
        await chmod(path, manifest.executable ? 0o755 : 0o644);
      }
      break;
    }
    case InstallEntry.SYMLINK: {
      if (
        existing &&
        !(
          existing.type === InstallEntry.SYMLINK &&
          existing.target === manifest.target
        )
      ) {
        await rm(path, { recursive: existing.type !== InstallEntry.FILE });
        existing = undefined;
      }
      if (!existing) {
        await symlink(manifest.target, path);
      }
      break;
    }
  }
}
