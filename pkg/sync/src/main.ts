import {
  Manifest,
  ManifestEntry,
  manifestParse,
} from "@better-rules-javascript/pkg-manifest";
import { ArgumentParser } from "argparse";
import {
  link,
  mkdir,
  readFile,
  readdir,
  readlink,
  rm,
  stat,
  symlink,
} from "node:fs/promises";
import { join } from "node:path";
import { diff, diff2 } from "./diff";
import { Tree, TreePath } from "./tree";

interface Args {
  dest: string;
  manifest: string;
  src: string;
}

async function main() {
  const parser = new ArgumentParser({ prog: "pkg-sync" });
  parser.add_argument("--manifest", { required: true });
  parser.add_argument("src");
  parser.add_argument("dest");
  const args: Args = parser.parse_args();

  const manifest = manifestParse(await readFile(args.manifest));
  const tree = createTree(manifest, args.src);
  await syncTree(tree, args.dest);
}

class CopyFile {
  constructor(readonly src: string) {}
}

class CopyTree {
  constructor(readonly src: string) {}
}

class Symlink {
  constructor(readonly target: string) {}
}

type GenNode = CopyFile | CopyTree | Symlink;

function createTree(manifest: Manifest, src: string): Tree<GenNode> {
  const tree = new Tree<ManifestEntry>();
  for (const item of manifest) {
    let node: GenNode;
    switch (item.type) {
      case 'file':
        node = new CopyFile(join(src, item.src));
        break;
      case 'symlink':
        node = new Symlink(item.src);
        break;
      case 'tree':
        node = new CopyTree(join(src, item.src));
        break;
    }
    tree.add(new TreePath(item.dest.split("/")), item);
  }
  return tree;
}

async function syncTree(tree: Tree<GenNode>, dest: string) {
  const d = diff(
    treeEntries(tree),
    await dirEntries(dest),
    entry => entry.name
  );
  for (const entry of d.second) {
    const entryDest = join(dest, entry.name);grgggg
    await delete_(entryDest);
  }
  for (const [first, second] of d.common) {
    const child = tree.entries.get(first.name);
    if (first.type === 'dir') {
      if (second.type === 'dir') {
        syncTree(child)
      }
    }
  }
}

async function copyFile(src: string, dest: string) {
  await link(src, dest);
}

async function copyDir(
  src: string | undefined,
  dest: string,
  tree: Tree<Manifest> | undefined,
) {
  await mkdir(dest);
  for (const entry of await dirEntries(src)) {
    const child = tree.entries.get(entry.name);
    const entrySrc = join(src, entry.name);
    const entryDest = join(dest, entry.name);
    if (entry.type === "dir") {
      await copyDir(entrySrc, entryDest, child);
    } else {
      await copyFile(entrySrc, entryDest);
    }
  }
}

async function createSymlink(path: string, target: string) {
  await symlink(target, path);
}

async function delete_(path: string) {
  await rm(path, { force: true, recursive: true });
}

async function updateSymlink(path: string, target: string) {
  const link = await readlink(path);
  if (link === target) {
    return;
  }
  await rm(path);
  await createSymlink(path, target);
}

export interface Entry {
  name: string;
  type: "file" | "symlink" | "dir";
  value: string | undefined;
}

async function dirEntries(path: string): Promise<Entry[]> {
  return (await readdir(path, { withFileType: true })).map((entry) => ({
    name: entry.name,
    sythentic: false,
    value: join(path, entry.name),
    type: entry.isFile()
      ? "file"
      : entry.isDirectory()
        ? "dir"
        : entry.isSymlink()
          ? "symlink"
          : (() => {
              throw new Error(
                `Unexpected file type at ${join(path, entry.name)}`,
              );
            })(),
  }));
}

function treeEntries(tree: Tree<ManifestEntry>) {
  return [...tree.entries()].map(([name, child]) => ({
    name,
    value: child.value?.src,
    type:
      child.value?.type === "file"
        ? "file"
        : child.value?.type === "symlink"
          ? "symlink"
          : "dir",
  }));
}

async function syncDir(
  src: string | undefined,
  dest: string,
  tree: Tree<ManifestEntry> | undefined,
) {
  const d = diff(
    [...(src ? await dirEntries(src) : []), ...treeEntries(tree)],
    await dirEntries(dest),
    (entry) => entry.name,
  );
  for (const entry of d.second) {
    const entryDest = join(dest, entry.name);
    const child = tree?.entries.get(entry.name);
    if (child) {
      if (entry.type === "dir") {
        await syncDir(entry.value, entryDest, child);
      } else {
        await delete_(entryDest);
        await copyDir(entry.value, entryDest, child);
      }
    } else {
      await delete_(entryDest);
    }
  }
  for (const [srcEntry, destEntry] of d.common) {
    const child = tree?.entries.get(srcEntry.name);
    const entryDest = join(dest, destEntry.name);
    if (srcEntry.type === "dir") {
      if (destEntry.type === "dir") {
        await syncDir(entry.value, entryDest, child);
      } else {
        await delete_(entryDest);
        await copyDir(entry.value, entryDest, child);
      }
    } else if (srcEntry.type === "file") {
      if (destEntry.type === "file") {
        await syncFile(entry.value, entryDest, child);
      } else {
        await delete_(entryDest);
        await copyFile(entry.value, entryDest, child);
      }
    } else if (srcEntry.type === "symlink") {
      if (destEntry.type === "symlink") {
        await syncFile(entry.value, entryDest, child);
      } else {
        await delete_(entryDest);
        await copyFile(entry.value, entryDest, child);
      }
    }
  }
  for (const entry of d.first) {
    const child = tree?.entries.get(entry.name);
    const entryDest = join(dest, entry.name);
    if (entry.type == "file" || entry.type === "symlink") {
      await copyFile(entry.value, entryDest);
    } else if (entry.type === "dir") {
      await copyDir(entry.value, entryDest, child);
    } else {
      throw new Error(`Unsupported file type at ${entrySrc}`);
    }
  }
}

async function syncFile(src: string, dest: string) {
  const srcStat = await stat(src);
  const destStat = await stat(dest);
  if (srcStat.ino === destStat.ino) {
    return;
  }
  await rm(dest);
  await copyFile(src, dest);
}

main().catch((error) => {
  console.log(error);
  process.exit(1);
});
