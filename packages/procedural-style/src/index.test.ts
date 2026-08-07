import { describe, expect, it } from 'vitest';
import {
  createCoordinateValueResolver,
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

  it('tints hex colors by a multiplier', () => {
    expect(tintHexColor('#808080', 0.5)).toBe('#404040');
  });
});
