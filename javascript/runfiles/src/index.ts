import { sortedMap } from "@rules-javascript/util/sorted-map";

export type ApparentRepo = string & { __brand: "ApparentRepo" };
export type CanonicalRepo = string & { __brand: "CanonicalRepo" };
export type Location = string & { __brand: "Location" };
export type Repo = ApparentRepo | CanonicalRepo;
export type RepoPath = string & { __brand: "RepoPath" };
export type Runfile = string & { __brand: "Runfile" };

export const MAIN_REPO = "_main" as CanonicalRepo;

const REPO_MAPPING_RUNFILE = "_repo_mapping" as Runfile;

const WILDCARD = "*";

/**
 * Get the runfiles directory location from the root executable
 */
export function executableRunfilesDir(executable: Location): Location {
  return `${executable}.runfiles` as Location;
}

/**
 * Get the runfiles manifest location from the root executable
 */
export function executableRunfilesManifest(executable: Location): Location {
  return `${executable}.runfiles_manifest` as Location;
}

/**
 * Repo mapping
 */
export interface RepoMapping {
  canonical(source: CanonicalRepo, dep: ApparentRepo): CanonicalRepo | undefined;
}

export function repoMappingLocation(runfiles: Runfiles): Location | undefined {
  return runfiles.path(REPO_MAPPING_RUNFILE);
}

export function repoMappingParse(content: string): RepoMapping {
  type Prefix = string;

  const prefixes = new Map<Prefix, Map<ApparentRepo, CanonicalRepo>>(); // --incompatible_compact_repo_mapping_manifest
  const repos = new Map<CanonicalRepo, Map<ApparentRepo, CanonicalRepo>>();

  for (const line of content.trim().split("\n")) {
    let [repo, dep, canonical] = line.trim().split(",") as [CanonicalRepo | "", ApparentRepo, CanonicalRepo];
    let deps: Map<ApparentRepo, CanonicalRepo> | undefined;
    if (repo.endsWith(WILDCARD)) {
      deps = prefixes.get(repo);
      if (!deps) {
        deps = new Map();
        prefixes.set(repo.slice(0, -WILDCARD.length), deps);
      }
    } else {
      repo ||= MAIN_REPO;
      deps = repos.get(repo as CanonicalRepo);
      if (!deps) {
        deps = new Map();
        repos.set(repo as CanonicalRepo, deps);
      }
    }
    deps.set(dep, canonical);
  }

  const sortedPrefixes = sortedMap(prefixes.entries());

  return {
    canonical(source, dep) {
      return (repos.get(source) ?? sortedPrefixes.get(source))?.get(dep);
    },
  };
}

export function runfileParse(runfile: Runfile): { repo: Repo, path: RepoPath } {
const [repo, ...path] = runfile.split("/");
  if (!repo) {
    throw new Error(`Invalid runfile: ${runfile}`);
  }

  return { repo: repo  as Repo, path: path.join("/") as RepoPath };
}

export function runfileSerialize(runfile: { repo: Repo, path: RepoPath }): Runfile {
  return `${runfile.repo}/${runfile.path}` as Runfile;
}

export interface Runfiles {
  path(runfile: Runfile): Location | undefined;
}

export function runfilesDirRunfiles(dir: string): Runfiles {
  return {
    path(runfile) {
      return `${dir}/${runfile}` as Location;
    },
  };
}

export function runfilesManifestParse(content: string): Runfiles {
  const runfiles = new Map<Runfile, Location>();

  for (const line of content.trim().split("\n")) {
    const [runfile, path] = line.trim().split(" ") as [Runfile, Location];
    runfiles.set(runfile, path);
  }

  return {
    path(runfile) {
      const path = runfiles.get(runfile);
      if (!path) {
        throw new Error(`Runfile ${runfile} not found`);
      }
      return path;
    },
  };
}
