import { describe, expect, it } from 'vitest';
import { createBoundedCache } from '@bworlds/cache-support';
import {
  createHostMaterialResolver,
  createHostVariantMaterialResolver,
  createCoordinateValueResolver,
  createRegionalMaterialResolver,
  createRegionalValueResolver,
  createRegionKey,
  getOrCreateRegionalValue,
  pickThresholdColor,
  tintHexColor,
} from './index.ts';

describe('procedural style helpers', () => {
  it('creates deterministic region keys from tile coordinates', () => {
    expect(createRegionKey(37, -5, 18)).toEqual({
      regionX: 2,
      regionY: -1,
      key: '2:-1',
    });
  });

  it('picks colors from thresholds', () => {
    expect(pickThresholdColor(0.6, 0.5, '#fff', '#000')).toBe('#fff');
    expect(pickThresholdColor(0.4, 0.5, '#fff', '#000')).toBe('#000');
  });

  it('memoizes values by regional key', () => {
    const cache = new Map<string, { label: string }>();
    const first = getOrCreateRegionalValue(cache, 10, 15, 8, ({ key }) => ({
      label: key,
    }));
    const second = getOrCreateRegionalValue(cache, 11, 14, 8, ({ key }) => ({
      label: `other-${key}`,
    }));

    expect(first).toBe(second);
    expect(cache.size).toBe(1);
  });

  it('creates reusable regional value resolvers for package-local style caches', () => {
    const cache = new Map<string, { label: string; tileX: number; tileY: number }>();
    const resolveValue = createRegionalValueResolver(
      cache,
      8,
      ({ key, tileX, tileY }) => ({
        label: key,
        tileX,
        tileY,
      })
    );

    const first = resolveValue(10, 15);
    const second = resolveValue(11, 14);

    expect(first).toBe(second);
    expect(first).toEqual({
      label: '1:1',
      tileX: 10,
      tileY: 15,
    });
  });

  it('creates reusable coordinate value resolvers for per-tile caches', () => {
    const cache = new Map<string, { key: string; tileX: number; tileY: number }>();
    const resolveValue = createCoordinateValueResolver(
      cache,
      ({ key, tileX, tileY }) => ({
        key,
        tileX,
        tileY,
      })
    );

    const first = resolveValue(4, -2);
    const second = resolveValue(4, -2);

    expect(first).toBe(second);
    expect(first).toEqual({
      key: '4:-2',
      tileX: 4,
      tileY: -2,
    });
    expect(cache.size).toBe(1);
  });

  it('supports bounded cache-like resolvers and recreates values after eviction', () => {
    const cache = createBoundedCache<
      string,
      { key: string; tileX: number; tileY: number; stamp: number }
    >(2);
    let stamp = 0;
    const resolveValue = createCoordinateValueResolver(
      cache,
      ({ key, tileX, tileY }) => ({
        key,
        tileX,
        tileY,
        stamp: stamp += 1,
      })
    );

    const first = resolveValue(0, 0);
    resolveValue(1, 0);
    resolveValue(2, 0);
    const second = resolveValue(0, 0);

    expect(first.key).toBe('0:0');
    expect(second.key).toBe('0:0');
    expect(second.stamp).toBeGreaterThan(first.stamp);
    expect(cache.size()).toBe(2);
  });

  it('creates reusable regional material resolvers for tile package style helpers', () => {
    const cache = new Map<
      string,
      {
        createMaterials(three: { label: string }): { cacheKey: string; host: string };
      }
    >();
    const resolveMaterial = createRegionalMaterialResolver(
      cache,
      10,
      ({ key }) => ({
        createMaterials(three) {
          return {
            cacheKey: key,
            host: three.label,
          };
        },
      })
    );

    expect(resolveMaterial({ label: 'three-a' }, 21, 6)).toEqual({
      cacheKey: '2:0',
      host: 'three-a',
    });
    expect(resolveMaterial({ label: 'three-b' }, 24, 9)).toEqual({
      cacheKey: '2:0',
      host: 'three-b',
    });
    expect(cache.size).toBe(1);
  });

  it('memoizes host-specific material factories through a shared helper', () => {
    let buildCount = 0;
    const resolver = createHostMaterialResolver((three: { label: string }) => ({
      host: three.label,
      build: ++buildCount,
    }));
    const hostA = { label: 'three-a' };
    const hostB = { label: 'three-b' };

    const first = resolver.createMaterials(hostA);
    const second = resolver.createMaterials(hostA);
    const third = resolver.createMaterials(hostB);

    expect(first).toBe(second);
    expect(first).toEqual({ host: 'three-a', build: 1 });
    expect(third).toEqual({ host: 'three-b', build: 2 });
  });

  it('memoizes host-specific material variants through a shared helper', () => {
    let buildCount = 0;
    const resolver = createHostVariantMaterialResolver(
      (three: { label: string }, variant: string) => ({
        host: three.label,
        variant,
        build: ++buildCount,
      })
    );
    const hostA = { label: 'three-a' };
    const hostB = { label: 'three-b' };

    const first = resolver.getMaterial(hostA, '#ff0000');
    const second = resolver.getMaterial(hostA, '#ff0000');
    const third = resolver.getMaterial(hostA, '#00ff00');
    const fourth = resolver.getMaterial(hostB, '#ff0000');

    expect(first).toBe(second);
    expect(first).toEqual({
      host: 'three-a',
      variant: '#ff0000',
      build: 1,
    });
    expect(third).toEqual({
      host: 'three-a',
      variant: '#00ff00',
      build: 2,
    });
    expect(fourth).toEqual({
      host: 'three-b',
      variant: '#ff0000',
      build: 3,
    });
  });

  it('tints hex colors by a multiplier', () => {
    expect(tintHexColor('#808080', 0.5)).toBe('#404040');
  });
});
