export function collectMapEntriesInto<K, V>(
  entries: IterableIterator<[K, V]>,
  target: Array<[K, V]>
): Array<[K, V]> {
  target.length = 0;

  for (const entry of entries) {
    target.push(entry);
  }

  return target;
}

export function fillWrappedBatchWindow<T>(
  items: readonly T[],
  startIndex: number,
  maxItems: number,
  target: T[]
): { items: T[]; nextIndex: number } {
  target.length = 0;

  if (items.length === 0 || maxItems <= 0) {
    return { items: target, nextIndex: 0 };
  }

  const normalizedStart =
    ((Math.floor(startIndex) % items.length) + items.length) % items.length;
  const count = Math.min(items.length, Math.floor(maxItems));

  for (let index = 0; index < count; index += 1) {
    target.push(items[(normalizedStart + index) % items.length] as T);
  }

  return {
    items: target,
    nextIndex: (normalizedStart + count) % items.length,
  };
}

export function getWrappedBatchWindow<T>(
  items: readonly T[],
  startIndex: number,
  maxItems: number
): { items: T[]; nextIndex: number } {
  return fillWrappedBatchWindow(items, startIndex, maxItems, []);
}
