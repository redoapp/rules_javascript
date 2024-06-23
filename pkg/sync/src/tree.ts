export class Tree<T> {
  readonly entries = new Map<string, TreeEntry<T>>();
  value: T | undefined;

  add(path: TreePath, value: T) {
    let tree: Tree<T> = this;
    for (const [index, part] of path.parts.entries()) {
      let entry = tree.entries.get(part);
      const last = index === path.parts.length - 1;
      if (!entry) {
        entry = new Tree();
        tree.entries.set(part, entry);
      }
      tree = entry;
    }
    if (tree.value !== undefined) {
      throw new Error(`Existing item at ${path}`);
    }
    tree.value = value;
  }
}

export class TreeElement<T> {
  constructor(readonly value: T) {}
}

export type TreeEntry<T> = Tree<T> | TreeElement<T>;

export class TreePath {
  constructor(private readonly _parts: string[]) {}

  get parts(): string[] {
    return this._parts;
  }

  toString() {
    return this._parts.join("/");
  }
}
