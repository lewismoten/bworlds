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

export type CoordinateCache<Value> = {
  clear(): void;
  get(x: number, y: number): Value | undefined;
  has(x: number, y: number): boolean;
  set(x: number, y: number, value: Value): void;
  getOrCreate(x: number, y: number, create: () => Value): Value;
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

export function createCoordinateCache<Value>(): CoordinateCache<Value> {
  const rows = new Map<number, Map<number, Value>>();
  let entryCount = 0;

  const lookupRow = (x: number): Map<number, Value> | undefined => rows.get(x);

  return {
    clear() {
      rows.clear();
      entryCount = 0;
    },
    get(x, y) {
      return lookupRow(x)?.get(y);
    },
    has(x, y) {
      return lookupRow(x)?.has(y) ?? false;
    },
    set(x, y, value) {
      let row = lookupRow(x);
      if (!row) {
        row = new Map<number, Value>();
        rows.set(x, row);
      }
      if (!row.has(y)) {
        entryCount += 1;
      }
      row.set(y, value);
    },
    getOrCreate(x, y, create) {
      const cached = lookupRow(x)?.get(y);
      if (cached !== undefined || this.has(x, y)) {
        return cached as Value;
      }
      const value = create();
      this.set(x, y, value);
      return value;
    },
    size() {
      return entryCount;
    },
  };
}
