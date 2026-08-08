export type BoundedCache<Key, Value> = {
  clear(): void;
  get(key: Key): Value | undefined;
  has(key: Key): boolean;
  set(key: Key, value: Value): void;
  size(): number;
};

export function createBoundedCache<Key, Value>(
  maxEntries = 32
): BoundedCache<Key, Value> {
  const limit = Math.max(1, Math.floor(maxEntries));
  const entries = new Map<Key, Value>();

  return {
    clear() {
      entries.clear();
    },
    get(key) {
      if (!entries.has(key)) {
        return undefined;
      }
      const value = entries.get(key);
      entries.delete(key);
      if (value !== undefined) {
        entries.set(key, value);
      }
      return value;
    },
    has(key) {
      return entries.has(key);
    },
    set(key, value) {
      if (entries.has(key)) {
        entries.delete(key);
      }
      entries.set(key, value);
      while (entries.size > limit) {
        const oldestKey = entries.keys().next().value;
        if (oldestKey === undefined) {
          break;
        }
        entries.delete(oldestKey);
      }
    },
    size() {
      return entries.size;
    },
  };
}
