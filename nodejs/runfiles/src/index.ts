import { removePrefix } from "@rules-javascript/util/string";
import { sep } from "node:path";
import {
  RepoMapping,
  repoMappingParse,
  runfilesDirRunfiles,
  runfilesManifestParse,
  executableRunfilesDir,
  executableRunfilesManifest,
  Runfiles,
  repoMappingLocation,
  Runfile,
  runfileParse,
  runfileSerialize,
  CanonicalRepo,
  MAIN_REPO,
  ApparentRepo,
  Location,
} from "@rules-javascript/runfiles";
import { lazy } from "@rules-javascript/util/cache";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { callSitePath } from "./stack";

const repoMapping = lazy((): RepoMapping | undefined => {
  let path: string | undefined;
  if (process.env.RUNFILES_REPO_MAPPING_MANIFEST === undefined) {
    const runfiles_ = runfiles();
    path = runfiles_ && repoMappingLocation(runfiles_);
    if (path === undefined) {
      return;
    }
  } else {
    path = process.env.RUNFILES_REPO_MAPPING_MANIFEST;
  }

  return repoMappingParse(readFileSync(path, "utf8"));
});

const runfiles = lazy((): Runfiles | undefined => {
  if (process.env.RUNFILES_DIR !== undefined) {
    return runfilesDirRunfiles(process.env.RUNFILES_DIR);
  }

  if (process.env.RUNFILES_MANIFEST_FILE !== undefined) {
    return runfilesManifestParse(
      readFileSync(process.env.RUNFILES_MANIFEST_FILE, "utf8"),
    );
  }

  const runfilesDir = executableRunfilesDir(process.argv0 as Location);
  if (existsSync(runfilesDir)) {
    return runfilesDirRunfiles(runfilesDir);
  }

  const runfilesManifest = executableRunfilesManifest(process.argv0 as Location);
  if (existsSync(runfilesManifest)) {
    return runfilesManifestParse(readFileSync(runfilesManifest, "utf8"));
  }
});

/**
 * Runfile location
 *
 * @param path Runfile path
 * @param source Canonical repository, or resolved path, or runfile path, or caller function.
 * @returns Resolved location, if found
 */
export function rlocation(path: Runfile, source?: Function | string) {
  const repoMapping_ = repoMapping();

  if (repoMapping_) {
    let sourceRepo: CanonicalRepo;
    if (typeof source !== "string") {
      // caller
      const path = callSitePath(source ?? rlocation);
      sourceRepo = path === undefined ? MAIN_REPO : pathToRepo(path) as CanonicalRepo;
    } else if (source.includes(sep)) {
      // resolved path
      sourceRepo = pathToRepo(source) as CanonicalRepo;
    } else {
      // canonical repository
      sourceRepo = source as CanonicalRepo;
    }

    const { repo, path: workspacePath } = runfileParse(path);
    const canonicalRepo = repoMapping_.canonical(sourceRepo, repo as ApparentRepo);
    if (canonicalRepo !== undefined) {
      path = runfileSerialize({ repo: canonicalRepo, path: workspacePath });
    }
  }

  return runfiles()?.path(path);
}

const sepRegex = sep === "/" ? null : new RegExp(`\\${sep}`, "g");

function pathToRepo(path: string) {
  if (process.env.RUNFILES_DIR !== undefined) {
    path = removePrefix(
      resolve(path),
      `${resolve(process.env.RUNFILES_DIR)}${sep}`,
    );
    if (sepRegex) {
      path = path.replace(sepRegex, "/");
    }
  }

  return runfileParse(path as Runfile).repo;
}
