import {
  repoMappingParse,
  runfilesManifestParse,
} from "@rules-javascript/runfiles";
import { lazy } from "@rules-javascript/util/cache";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const repoMapping = lazy(() => {
  let path: string;
  if (process.env.RUNFILES_DIR !== undefined) {
    path = join(process.env.RUNFILES_DIR, "_repo_mapping");
  } else if (process.env.RUNFILES_MANIFEST_FILE === undefined) {
    throw new Error("RUNFILES_DIR AND RUNFILES_MANIFEST_FILE are not set");
  } else {
    path = join(dirname(process.env.RUNFILES_MANIFEST_FILE), "_repo_mapping");
  }
  return repoMappingParse(readFileSync(path, "utf8"));
});

const runfilesManifest = lazy(() => {
  if (process.env.RUNFILES_MANIFEST_FILE === undefined) {
    throw new Error("RUNFILES_MANIFEST_FILE is not set");
  }
  return runfilesManifestParse(
    readFileSync(process.env.RUNFILES_MANIFEST_FILE, "utf8"),
  );
});

/**
 * Runfile location
 *
 * @param runfile Runfile name
 * @param source Canonical repository name, or path
 * @returns Path to the runfile
 */
export function rlocation(runfile: string, source?: string) {
  if (source !== undefined) {
    const parts = runfile.split("/");
    const repo = parts[0];
    const path = parts.slice(1).join("/");

    let sourceRepo: string;
    if (source.includes("/")) {
      const requesterRunfile =
        process.env.RUNFILES_DIR === undefined
          ? source
          : removePrefix(
              resolve(source),
              `${resolve(process.env.RUNFILES_DIR)}/`,
            );

      [sourceRepo] = requesterRunfile.split("/", 1);
      if (!sourceRepo) {
        throw new Error(`Invalid requester: ${source}`);
      }
    } else {
      sourceRepo = source;
    }

    const canonicalRepo = repoMapping().canonical(sourceRepo, repo);
    if (canonicalRepo !== undefined) {
      runfile = `${canonicalRepo}/${path}`;
    }
  }

  if (process.env.RUNFILES_DIR) {
    return join(process.env.RUNFILES_DIR, runfile);
  }
  return runfilesManifest().path(runfile);
}

function removePrefix(string: string, prefix: string) {
  return string.startsWith(prefix) ? string.slice(prefix.length) : string;
}
