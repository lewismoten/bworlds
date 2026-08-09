import { describe, expect, it } from 'vitest';
import {
  createBoundedCache,
  createCoordinateCache,
  getOrCreateCacheValue,
  getOrCreateMapValue,
  getOrCreateWeakMapValue,
} from './index.ts';

describe('cache support', () => {
  it('stores and retrieves values while tracking presence separately from null values', () => {
    const cache = createBoundedCache<string, string | null>(2);

    cache.set('alpha', null);

    expect(cache.has('alpha')).toBe(true);
    expect(cache.get('alpha')).toBeNull();
  });

  it('stores explicit undefined values without treating them as missing', () => {
    const cache = createBoundedCache<string, string | undefined>(2);

    cache.set('alpha', undefined);

    expect(cache.has('alpha')).toBe(true);
    expect(cache.peek('alpha')).toBeUndefined();
    expect(cache.get('alpha')).toBeUndefined();
  });

  it('evicts the least recently used key when over capacity', () => {
    const cache = createBoundedCache<string, number>(2);

    cache.set('alpha', 1);
    cache.set('beta', 2);
    expect(cache.get('alpha')).toBe(1);
    cache.set('gamma', 3);

    expect(cache.has('alpha')).toBe(true);
    expect(cache.has('gamma')).toBe(true);
    expect(cache.has('beta')).toBe(false);
  });

  it('clears all entries', () => {
    const cache = createBoundedCache<string, number>(2);

    cache.set('alpha', 1);
    cache.set('beta', 2);
    cache.clear();

    expect(cache.size()).toBe(0);
    expect(cache.has('alpha')).toBe(false);
    expect(cache.get('beta')).toBeUndefined();
  });

  it('peeks without updating recency', () => {
    const cache = createBoundedCache<string, number>(2);

    cache.set('alpha', 1);
    cache.set('beta', 2);
    expect(cache.peek('alpha')).toBe(1);
    cache.set('gamma', 3);

    expect(cache.has('alpha')).toBe(false);
    expect(cache.has('beta')).toBe(true);
    expect(cache.has('gamma')).toBe(true);
  });

  it('creates values only once through getOrCreate and preserves null entries', () => {
    const cache = createBoundedCache<string, string | null>(2);
    let calls = 0;

    const first = cache.getOrCreate('alpha', () => {
      calls += 1;
      return null;
    });
    const second = cache.getOrCreate('alpha', () => {
      calls += 1;
      return 'unexpected';
    });

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(cache.has('alpha')).toBe(true);
    expect(calls).toBe(1);
  });

  it('does not recreate explicit undefined entries through getOrCreate', () => {
    const cache = createBoundedCache<string, string | undefined>(2);
    let calls = 0;

    const first = cache.getOrCreate('alpha', () => {
      calls += 1;
      return undefined;
    });
    const second = cache.getOrCreate('alpha', () => {
      calls += 1;
      return 'unexpected';
    });

    expect(first).toBeUndefined();
    expect(second).toBeUndefined();
    expect(cache.has('alpha')).toBe(true);
    expect(calls).toBe(1);
  });

  it('reuses defined cache-like values without a separate presence check', () => {
    const cache = createBoundedCache<string, string>(2);
    let calls = 0;

    const first = getOrCreateCacheValue(cache, 'alpha', () => {
      calls += 1;
      return 'value';
    });
    const second = getOrCreateCacheValue(cache, 'alpha', () => {
      calls += 1;
      return 'other';
    });

    expect(first).toBe('value');
    expect(second).toBe('value');
    expect(calls).toBe(1);
  });

  it('reuses defined map values without a separate has lookup', () => {
    const cache = new Map<string, number>();
    let calls = 0;

    const first = getOrCreateMapValue(cache, 'alpha', () => {
      calls += 1;
      return 42;
    });
    const second = getOrCreateMapValue(cache, 'alpha', () => {
      calls += 1;
      return 7;
    });

    expect(first).toBe(42);
    expect(second).toBe(42);
    expect(calls).toBe(1);
  });

  it('reuses defined weak map values without a separate presence check', () => {
    const cache = new WeakMap<object, { value: number }>();
    const key = {};
    let calls = 0;

    const first = getOrCreateWeakMapValue(cache, key, () => {
      calls += 1;
      return { value: 42 };
    });
    const second = getOrCreateWeakMapValue(cache, key, () => {
      calls += 1;
      return { value: 7 };
    });

    expect(first).toEqual({ value: 42 });
    expect(second).toBe(first);
    expect(calls).toBe(1);
  });

  it('stores 2d coordinate values without allocating composite string keys', () => {
    const cache = createCoordinateCache<string | undefined>();

    cache.set(4, -2, 'value');
    cache.set(4, 0, undefined);

    expect(cache.get(4, -2)).toBe('value');
    expect(cache.has(4, -2)).toBe(true);
    expect(cache.has(4, 0)).toBe(true);
    expect(cache.get(4, 0)).toBeUndefined();
    expect(cache.size()).toBe(2);
  });

  it('creates 2d coordinate values only once and clears nested rows', () => {
    const cache = createCoordinateCache<string | null>();
    let calls = 0;

    const first = cache.getOrCreate(7, 3, () => {
      calls += 1;
      return null;
    });
    const second = cache.getOrCreate(7, 3, () => {
      calls += 1;
      return 'unexpected';
    });

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(calls).toBe(1);
    expect(cache.size()).toBe(1);

    cache.clear();

    expect(cache.size()).toBe(0);
    expect(cache.has(7, 3)).toBe(false);
  });

  it('preserves explicit undefined coordinate entries without recreating them', () => {
    const cache = createCoordinateCache<string | undefined>();
    let calls = 0;

    const first = cache.getOrCreate(2, 5, () => {
      calls += 1;
      return undefined;
    });
    const second = cache.getOrCreate(2, 5, () => {
      calls += 1;
      return 'unexpected';
    });

    expect(first).toBeUndefined();
    expect(second).toBeUndefined();
    expect(cache.has(2, 5)).toBe(true);
    expect(calls).toBe(1);
  });
});
