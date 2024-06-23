export interface Diff<T> extends Diff2<T, T> {}

export interface Diff2<A, B> {
  first: A[];
  second: B[];
  common: [A, B][];
}

export function diff<T>(
  first: Iterable<T>,
  second: Iterable<T>,
  keyFn: (value: T) => unknown,
): Diff<T> {
  return diff2(first, second, keyFn, keyFn);
}

export function diff2<A, B>(
  first: Iterable<A>,
  second: Iterable<B>,
  firstKeyFn: (value: A) => unknown,
  secondKeyFn: (value: B) => unknown,
): Diff2<A, B> {
  const firstKeyed = new Map();
  for (const item of first) {
    firstKeyed.set(firstKeyFn(item), item);
  }
  const secondDiff: B[] = [];
  const commonDiff: [A, B][] = [];
  for (const item of second) {
    const key = secondKeyFn(item);
    if (firstKeyed.has(key)) {
      commonDiff.push([firstKeyed.get(key), item]);
      firstKeyed.delete(key);
    } else {
      secondDiff.push(item);
    }
  }
  const firstDiff = [...firstKeyed.values()];
  return { first: firstDiff, second: secondDiff, common: commonDiff };
}
