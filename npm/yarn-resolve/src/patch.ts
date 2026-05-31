import { FetchOptions, Locator, semverUtils } from "@yarnpkg/core";
import { patchUtils } from "@yarnpkg/plugin-patch";

type Effect = ReturnType<typeof patchUtils.parsePatchFile>[number];
type Hunk = Extract<Effect, { type: "patch" }>["hunks"][number];

export interface EffectivePatch {
  /**
   * Patch file name: the builtin patch identifier plus Yarn's short patch
   * hash (e.g. `compat-fsevents-df0bf1.patch`). The hash makes it a content
   * key; the identifier makes it legible.
   */
  file: string;
  /** Plain unified diff with the version-matching sections only. */
  content: string;
}

/**
 * Resolves the effective patch for a `patch:` locator.
 *
 * Yarn's builtin compat patches bundle hunks for every package version in a
 * single file, guarded by `semver exclusivity` directives. We let Yarn parse
 * the patch sources (including the builtin ones), keep only the effects whose
 * guard matches the resolved version, and re-emit them as a plain unified diff.
 * The repo rule reanchors the `---`/`+++` paths under the tarball's extraction
 * directory before applying.
 *
 * The hash is Yarn's own patch hash: identical across versions that resolve to
 * the same set of effects, so it doubles as a content key for the patch file.
 *
 * Returns undefined for non-patch locators, or when no section applies.
 */
export async function getEffectivePatch(
  locator: Locator,
  fetchOptions: FetchOptions,
): Promise<EffectivePatch | undefined> {
  if (!patchUtils.isPatchLocator(locator)) {
    return undefined;
  }

  const { parentLocator, patchPaths, sourceLocator, sourceVersion } =
    patchUtils.parseLocator(locator);
  const version = sourceVersion ?? versionFromLocator(sourceLocator);

  const patchFiles = await patchUtils.loadPatchFiles(
    parentLocator,
    patchPaths,
    fetchOptions,
  );

  const out: string[] = [];
  for (const { source } of patchFiles) {
    if (source === null) {
      continue;
    }
    for (const effect of patchUtils.parsePatchFile(source)) {
      if (!applies(effect.semverExclusivity, version)) {
        continue;
      }
      const serialized = serializeEffect(effect);
      if (serialized !== undefined) {
        out.push(serialized);
      }
    }
  }

  if (out.length === 0) {
    return undefined;
  }
  const hash = patchUtils.makePatchHash(patchFiles, version);
  return {
    file: `${patchName(patchPaths)}-${hash}.patch`,
    content: out.join(""),
  };
}

const BUILTIN_PATCH = /^builtin<(.+)>$/;

/**
 * Derives a flat, legible file stem from a locator's patch paths.
 *
 * Builtin compat patches (`...!builtin<compat/fsevents>`) contribute their
 * inner name; other paths contribute the path as-is. Patch flags (the `!`
 * prefix) are dropped and path separators flattened so the result is a single
 * filename component.
 */
function patchName(patchPaths: readonly string[]): string {
  return patchPaths
    .map((patchPath) => {
      const afterFlags = patchPath.slice(patchPath.lastIndexOf("!") + 1);
      const builtin = afterFlags.match(BUILTIN_PATCH);
      const name = builtin !== null ? builtin[1] : afterFlags;
      return name.replace(/[/\\]/g, "-");
    })
    .join("-");
}

function versionFromLocator(locator: Locator): string | null {
  return locator.reference.startsWith("npm:")
    ? locator.reference.slice("npm:".length)
    : null;
}

function applies(
  semverExclusivity: string | null,
  version: string | null,
): boolean {
  return (
    semverExclusivity === null ||
    version === null ||
    semverUtils.satisfiesWithPrereleases(version, semverExclusivity)
  );
}

/**
 * Emits one effect as a git-style unified diff, or undefined if it has no body.
 *
 * The `diff --git` line delimits files unambiguously -- without it a hunk
 * immediately followed by the next file's `--- ` header is misread as a
 * deletion line. The repo rule's reanchoring ignores it and rewrites only the
 * `---`/`+++` paths.
 */
function serializeEffect(effect: Effect): string | undefined {
  switch (effect.type) {
    case "patch":
      return (
        `diff --git a/${effect.path} b/${effect.path}\n` +
        `--- a/${effect.path}\n+++ b/${effect.path}\n` +
        effect.hunks.map(serializeHunk).join("")
      );
    case "file creation":
      return (
        `diff --git a/${effect.path} b/${effect.path}\n` +
        `--- /dev/null\n+++ b/${effect.path}\n` +
        (effect.hunk ? serializeHunk(effect.hunk) : "")
      );
    case "file deletion":
      return (
        `diff --git a/${effect.path} b/${effect.path}\n` +
        `--- a/${effect.path}\n+++ /dev/null\n` +
        (effect.hunk ? serializeHunk(effect.hunk) : "")
      );
    case "rename":
      throw new Error(
        `Patch renames are not supported (${effect.fromPath} -> ${effect.toPath})`,
      );
    case "mode change":
      // Not representable in a plain unified diff; the repo rule ignores modes.
      return undefined;
  }
}

function serializeHunk(hunk: Hunk): string {
  const { original, patched } = hunk.header;
  // An empty side uses start 0 (Yarn's parser clamps it to >=1).
  const originalStart = original.length === 0 ? 0 : original.start;
  const patchedStart = patched.length === 0 ? 0 : patched.start;
  let out = `@@ -${originalStart},${original.length} +${patchedStart},${patched.length} @@\n`;
  for (const part of hunk.parts) {
    const type = part.type as string;
    const prefix = type === "insertion" ? "+" : type === "deletion" ? "-" : " ";
    for (const line of part.lines) {
      out += `${prefix}${line}\n`;
    }
    if (part.noNewlineAtEndOfFile) {
      out += "\\ No newline at end of file\n";
    }
  }
  return out;
}
