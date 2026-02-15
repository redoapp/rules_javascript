import {
  repoMappingParse,
  runfilesManifestParse,
} from "@rules-javascript/runfiles";
import { lazy } from "@rules-javascript/util/cache";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

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
 * @param requester Canonical repository name, or path
 * @returns Path to the runfile
 */
export function rlocation(runfile: string, requester?: string) {
  if (requester !== undefined) {
    const parts = runfile.split("/");
    const repo = parts[0];
    const path = parts.slice(1).join("/");

    const requesterRunfile =
      process.env.RUNFILES_DIR !== undefined &&
      requester.startsWith(`${process.env.RUNFILES_DIR}/`)
        ? requester.slice(`${process.env.RUNFILES_DIR}/`.length)
        : requester;

    const requesterRepo = requesterRunfile.split("/", 1)[0];
    if (!requesterRepo) {
      throw new Error(`Invalid requester: ${requester}`);
    }

    const canonicalRepo = repoMapping().canonical(requesterRepo, repo);
    if (canonicalRepo !== undefined) {
      runfile = `${canonicalRepo}/${path}`;
    }
  }

  if (process.env.RUNFILES_DIR) {
    return join(process.env.RUNFILES_DIR, runfile);
  }
  return runfilesManifest().path(runfile);
}
