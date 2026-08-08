import { describe, expect, it } from 'vitest';
import { createBoundedCache } from './index.ts';

describe('cache support', () => {
  it('stores and retrieves values while tracking presence separately from null values', () => {
    const cache = createBoundedCache<string, string | null>(2);

    cache.set('alpha', null);

    expect(cache.has('alpha')).toBe(true);
    expect(cache.get('alpha')).toBeNull();
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
});
