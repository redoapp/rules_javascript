export type CanonicalRepo = string;
export type ApparentRepo = string;

export interface RepoMapping {
  canonical(source: CanonicalRepo, dep: ApparentRepo): string | undefined;
}

const WILDCARD = "*";

export function repoMappingParse(content: string): RepoMapping {
  type Prefix = string;

  const prefixes = new Map<Prefix, Map<ApparentRepo, CanonicalRepo>>(); // --incompatible_compact_repo_mapping_manifest
  const repos = new Map<CanonicalRepo, Map<ApparentRepo, CanonicalRepo>>();

  for (const line of content.trim().split("\n")) {
    const [repo, dep, canonical] = line.trim().split(",");
    let deps: Map<string, string> | undefined;
    if (repo.endsWith(WILDCARD)) {
      deps = prefixes.get(repo);
      if (!deps) {
        deps = new Map();
        prefixes.set(repo.slice(0, -WILDCARD.length), deps);
      }
    } else {
      deps = repos.get(repo);
      if (!deps) {
        deps = new Map();
        repos.set(repo, deps);
      }
    }
    deps.set(dep, canonical);
  }

  const prefixList = [...prefixes.keys()];
  prefixList.sort();

  return {
    canonical(source, dep) {
      const result = repos.get(source === "_main" ? "" : source)?.get(dep);
      if (result !== undefined) {
        return result;
      }
      for (let start = 0, end = prefixList.length; start < end; ) {
        const index = Math.floor((start + end) / 2);
        const prefix = prefixList[index];
        if (source.startsWith(prefix)) {
          return prefixes.get(prefix)?.get(dep);
        }
        if (source < prefix) {
          end = index;
        } else {
          start = index + 1;
        }
      }
    },
  };
}

export interface RunfilesManifest {
  path(runfile: string): string | undefined;
}

export function runfilesManifestParse(content: string): RunfilesManifest {
  const runfiles = new Map<string, string>();

  for (const line of content.trim().split("\n")) {
    const [runfile, path] = line.trim().split(" ");
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
