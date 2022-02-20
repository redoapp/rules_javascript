import { JsonFormat } from "@better-rules-javascript/util-json";
import { BzlDeps, BzlExtraDeps, BzlPackage, BzlPackages } from "./bzl";
import { NpmRegistryClient, NpmSpecifier } from "./npm";
import {
  YarnDependencyInfo,
  YarnLocator,
  YarnPackageInfo,
  YarnVersion,
} from "./yarn";
import { getIntegrity } from "./sri";
import { getOrSet } from "./collection";

export interface ResolvedNpmPackage {
  contentIntegrity: string;
  contentUrl: string;
}

export namespace ResolvedNpmPackage {
  export function json(): JsonFormat<ResolvedNpmPackage> {
    return JsonFormat.object({
      contentIntegrity: JsonFormat.string(),
      contentUrl: JsonFormat.string(),
    });
  }
}

export async function getPackage(
  client: NpmRegistryClient,
  specifier: NpmSpecifier,
): Promise<ResolvedNpmPackage> {
  const package_ = await client.getPackage(specifier);
  let integrity: string;
  if (package_.dist.integrity) {
    integrity = package_.dist.integrity;
  } else {
    const content = await client.getPackageContent(package_.dist.tarball);
    integrity = getIntegrity(content);
  }

  return {
    contentIntegrity: integrity,
    contentUrl: package_.dist.tarball,
  };
}

export async function resolvePackages(
  packageInfos: YarnPackageInfo[],
  getPackage: (specifier: NpmSpecifier) => Promise<ResolvedNpmPackage>,
  progress: (message: string) => void,
): Promise<{ packages: BzlPackages; roots: BzlDeps }> {
  const bzlPackages: BzlPackages = new Map();
  let bzlRoots: BzlDeps | undefined;

  let finished = 0;
  let lastReported = 0;
  const report = () => {
    if (lastReported !== finished) {
      lastReported = finished;
      progress(`Resolved ${finished} packages`);
    }
  };

  let reported = process.hrtime.bigint();
  await Promise.all(
    packageInfos.map(async (packageInfo) => {
      const deps = bzlDeps(packageInfo.children.Dependencies || []);
      const id = bzlId(packageInfo.value);
      const specifier = npmSpecifier(packageInfo.value);
      if (id && specifier) {
        const npmPackage = await getPackage(specifier);
        bzlPackages.set(id, {
          deps,
          extraDeps: new Map(),
          integrity: npmPackage.contentIntegrity,
          name: packageInfo.value.name,
          url: npmPackage.contentUrl,
        });
        finished++;
      } else if (
        packageInfo.value.version.type === YarnVersion.WORKSPACE &&
        packageInfo.value.version.path === "."
      ) {
        bzlRoots = deps;
      }
      const now = process.hrtime.bigint();
      if (reported + BigInt(2 * 1e9) < now) {
        reported = now;
        report();
      }
    }),
  );
  report();

  if (!bzlRoots) {
    throw new Error("Could not find root workspace");
  }

  removeNames(bzlPackages);
  fixCycles(bzlPackages);

  return { roots: bzlRoots, packages: bzlPackages };
}

function npmSpecifier(locator: YarnLocator): NpmSpecifier | undefined {
  switch (locator.version.type) {
    case YarnVersion.PATCH:
      return npmSpecifier(locator.version.locator);
    case YarnVersion.VIRTUAL:
      if (locator.version.version.type !== YarnVersion.NPM) {
        return;
      }
      return {
        name: locator.name,
        version: locator.version.version.version,
      };
    case YarnVersion.NPM:
      return { name: locator.name, version: locator.version.version };
  }
}

function bzlId(locator: YarnLocator): string | undefined {
  switch (locator.version.type) {
    case YarnVersion.PATCH:
      return bzlId(locator.version.locator);
    case YarnVersion.VIRTUAL:
      if (locator.version.version.type !== YarnVersion.NPM) {
        return;
      }
      return `${locator.name}@${
        locator.version.version.version
      }-${locator.version.digest.slice(0, 8)}`;
    case YarnVersion.NPM:
      return `${locator.name}@${locator.version.version}`;
  }
}

function bzlDeps(yarnDependencies: YarnDependencyInfo[]): BzlDeps {
  const result: BzlDeps = [];
  for (const yarnDependency of yarnDependencies) {
    if (!yarnDependency.locator) {
      continue;
    }
    const id = bzlId(yarnDependency.locator);
    if (id) {
      result.push({ name: yarnDependency.descriptor.name, id });
    }
  }
  return result;
}

function removeNames(bzlPackages: BzlPackages) {
  for (const package_ of bzlPackages.values()) {
    for (const dep of package_.deps) {
      const depPackage = bzlPackages.get(dep.id);
      if (dep.name === depPackage.name) {
        dep.name = null;
      }
    }
  }
}

function fixCycles(bzlPackages: BzlPackages) {
  const visited = new Set<string>();
  const visit = (id: string) => {
    const package_ = bzlPackages.get(id);
    if (visited.has(id)) {
      for (const id of visited) {
        const package_ = bzlPackages.get(id);
        package_.deps = package_.deps.filter((dep) => {
          if (!visited.has(dep.id)) {
            return true;
          }
          for (const packageId of visited) {
            const package_ = bzlPackages.get(packageId);
            getOrSet(package_.extraDeps, id, Array).push(dep);
          }
        });
      }
      return;
    }
    visited.add(id);
    for (const dep of package_.deps) {
      visit(dep.id);
    }
    visited.delete(id);
  };
  for (const id of bzlPackages.keys()) {
    visit(id);
  }
}
