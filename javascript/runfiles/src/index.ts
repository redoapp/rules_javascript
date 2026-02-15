export interface RepoMapping {
  canonical(repo: string, dep: string): string | undefined;
}

export function repoMappingParse(content: string): RepoMapping {
  const repos = new Map<string, Map<string, string>>();

  for (const line of content.trim().split("\n")) {
    const [repo, dep, canonical] = line.trim().split(",");
    let deps = repos.get(repo);
    if (!deps) {
      deps = new Map();
      repos.set(repo, deps);
    }
    deps.set(dep, canonical);
  }

  return {
    canonical(repo: string, dep: string) {
      return repos.get(repo === "_main" ? "" : repo)?.get(dep);
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
