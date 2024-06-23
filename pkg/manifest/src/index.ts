export interface ManifestEntry {
  dest: string;
  gid: number | null;
  group: string | null;
  mode: string;
  origin: string;
  src: string;
  type: "file" | "symlink" | "tree";
  uid: number | null;
  user: string | null;
}

export interface Manifest extends Array<ManifestEntry> {}

export function manifestParse(bytes: ArrayBuffer): Manifest {
  return JSON.parse(Buffer.from(bytes).toString());
}
