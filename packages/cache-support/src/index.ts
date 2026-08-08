export type CacheLike<Key, Value> = {
  clear(): void;
  get(key: Key): Value | undefined;
  has(key: Key): boolean;
  set(key: Key, value: Value): void;
};

export type BoundedCache<Key, Value> = CacheLike<Key, Value> & {
  peek(key: Key): Value | undefined;
  getOrCreate(key: Key, create: () => Value): Value;
  size(): number;
};

type CacheEntry<Value> = {
  value: Value;
};

export function createBoundedCache<Key, Value>(
  maxEntries = 32
): BoundedCache<Key, Value> {
  const limit = Math.max(1, Math.floor(maxEntries));
  const entries = new Map<Key, CacheEntry<Value>>();

  const lookup = (key: Key): CacheEntry<Value> | undefined => entries.get(key);

  return {
    clear() {
      entries.clear();
    },
    get(key) {
      const entry = lookup(key);
      if (entry === undefined) {
        return undefined;
      }
      entries.delete(key);
      entries.set(key, entry);
      return entry.value;
    },
    peek(key) {
      return lookup(key)?.value;
    },
    has(key) {
      return entries.has(key);
    },
    set(key, value) {
      const entry = lookup(key);
      if (entry !== undefined) {
        entries.delete(key);
      }
      entries.set(key, entry ?? { value });
      if (entry !== undefined) {
        entry.value = value;
      }
      while (entries.size > limit) {
        const oldestKey = entries.keys().next().value;
        if (oldestKey === undefined) {
          break;
        }
        entries.delete(oldestKey);
      }
    },
    getOrCreate(key, create) {
      const entry = lookup(key);
      if (entry !== undefined) {
        entries.delete(key);
        entries.set(key, entry);
        return entry.value;
      }
      const value = create();
      this.set(key, value);
      return value;
    },
    size() {
      return entries.size;
    },
  };
}
