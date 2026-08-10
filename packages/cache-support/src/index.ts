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

export function getOrCreateCacheValue<Key, Value>(
  cache: CacheLike<Key, Value>,
  key: Key,
  create: () => Value
): Value {
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const value = create();
  cache.set(key, value);
  return value;
}

export function getOrCreateMapValue<Key, Value>(
  cache: Map<Key, Value>,
  key: Key,
  create: () => Value
): Value {
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const value = create();
  cache.set(key, value);
  return value;
}

export function getOrCreateWeakMapValue<Key extends WeakKey, Value>(
  cache: WeakMap<Key, Value>,
  key: Key,
  create: () => Value
): Value {
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const value = create();
  cache.set(key, value);
  return value;
}

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
  const rows = new Map<number, Map<number, CacheEntry<Value>>>();
  let entryCount = 0;

  const lookupRow = (x: number): Map<number, CacheEntry<Value>> | undefined =>
    rows.get(x);
  const lookupEntry = (x: number, y: number): CacheEntry<Value> | undefined =>
    lookupRow(x)?.get(y);

  return {
    clear() {
      rows.clear();
      entryCount = 0;
    },
    get(x, y) {
      return lookupEntry(x, y)?.value;
    },
    has(x, y) {
      return lookupEntry(x, y) !== undefined;
    },
    set(x, y, value) {
      let row = lookupRow(x);
      if (!row) {
        row = new Map<number, CacheEntry<Value>>();
        rows.set(x, row);
      }
      const entry = row.get(y);
      if (entry === undefined) {
        entryCount += 1;
        row.set(y, { value });
        return;
      }
      entry.value = value;
    },
    getOrCreate(x, y, create) {
      const cached = lookupEntry(x, y);
      if (cached !== undefined) {
        return cached.value;
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
