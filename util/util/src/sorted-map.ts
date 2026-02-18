export function defaultCompare<K>(a: K, b: K): number {
  return +(b < a) - +(a < b);
}

export interface SortedMap<K, V> {
  get(key: K): V | undefined;
}

export function sortedMap<K, V>(entries: Iterable<[K, V]>, compare: (a: K, b: K) => number = defaultCompare): SortedMap<K, V> {
  const values = [...entries];
  values.sort(([a], [b]) => compare(a, b));

  return {
    get(key) {
      for (let start = 0, end = values.length; start < end; ) {
        const index = Math.floor((start + end) / 2);
        const [k, v] = values[index];
        const cmp = compare(k, key);
        if (!cmp) {
          return v;
        }
        if (cmp < 0) {
          start = index + 1;
        } else {
          end = index;
        }
      }
    },
  };
}
