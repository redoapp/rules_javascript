// @ts-check
// Preload shim that materializes a real node_modules/ tree at process cwd
// (= Bazel execroot) before tsc starts. Replaces the fs-linker runtime
// patching for native (tsgo) compiler paths, which can't run a Node -r
// preload.
//
// Reads the package manifest from NODE_FS_PACKAGE_MANIFEST, walks the
// reachable dep closure from STAGE_NM_CURRENT_PKG, and creates symlinks
// for each visible dep name (first-seen wins on name collisions, same
// as Node's flat-install model).
"use strict";

const fs = require("node:fs");
const path = require("node:path");

/**
 * @typedef {{ deps: Record<string, string> }} ManifestPackage
 * @typedef {{
 *   packages: Record<string, ManifestPackage>,
 *   globals?: Record<string, string>,
 * }} Manifest
 */

const manifestPath = process.env.NODE_FS_PACKAGE_MANIFEST;
const currentPkgPath = process.env.STAGE_NM_CURRENT_PKG;
if (manifestPath && currentPkgPath) {
  stage(manifestPath, currentPkgPath);
}

/**
 * @param {string} manifestPath
 * @param {string} currentPkgPath
 */
function stage(manifestPath, currentPkgPath) {
  /** @type {Manifest} */
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  // Stage node_modules at the sandbox root (= execroot). tsc walks up
  // from any source file or extended tsconfig and finds it. Single
  // location prevents duplicate nominal types from preserveSymlinks=true.
  const nmRoot = path.join(process.cwd(), "node_modules");

  /** @param {string} p */
  const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
  /**
   * @param {string} target
   * @param {string} link
   */
  const ensureSymlink = (target, link) => {
    ensureDir(path.dirname(link));
    try {
      fs.symlinkSync(target, link);
    } catch (e) {
      if (/** @type {NodeJS.ErrnoException} */ (e).code !== "EEXIST") throw e;
    }
  };
  /**
   * @param {string} name
   * @param {string} pkgPath
   */
  const stagePkg = (name, pkgPath) => {
    if (!name) return;
    const link = path.join(nmRoot, name);
    if (fs.existsSync(link)) return;
    ensureSymlink(path.resolve(pkgPath), link);
  };

  /** @type {Set<string>} */
  const seenName = new Set();
  /** @type {string[]} */
  const queue = [];
  /** @type {Set<string>} */
  const visited = new Set();

  const drainQueue = () => {
    while (queue.length) {
      const p = /** @type {string} */ (queue.shift());
      if (visited.has(p)) continue;
      visited.add(p);
      const pkg = manifest.packages[p];
      if (!pkg) continue;
      for (const [depName, depPath] of Object.entries(pkg.deps)) {
        if (!seenName.has(depName)) {
          seenName.add(depName);
          stagePkg(depName, depPath);
        }
        queue.push(depPath);
      }
    }
  };

  // BFS closure from current pkg, deduping by name (first-seen wins).
  queue.push(currentPkgPath);
  drainQueue();

  // Globals win over regular deps (they match fs-linker's precedence
  // model). Also seed each global's path into the BFS queue on a
  // second pass so packages the globals themselves depend on get
  // staged.
  for (const [name, p] of Object.entries(manifest.globals || {})) {
    const link = path.join(nmRoot, name);
    try {
      fs.unlinkSync(link);
    } catch {
      // best-effort — link may not exist yet
    }
    ensureSymlink(path.resolve(p), link);
  }
  for (const gp of Object.values(manifest.globals || {})) {
    if (visited.has(gp)) continue;
    queue.push(gp);
  }
  drainQueue();

  if (process.env.STAGE_NM_DEBUG === "1") {
    /**
     * @param {string} dir
     * @param {string} prefix
     */
    const dump = (dir, prefix = "") => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isSymbolicLink()) {
          process.stderr.write(`${prefix}${e.name} -> ${fs.readlinkSync(p)}\n`);
        } else if (e.isDirectory()) {
          dump(p, prefix + e.name + "/");
        }
      }
    };
    process.stderr.write("[stage-nm] node_modules contents:\n");
    dump(nmRoot);
  }
}
