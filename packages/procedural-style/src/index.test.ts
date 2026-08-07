import { describe, expect, it } from 'vitest';
import {
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

  it('tints hex colors by a multiplier', () => {
    expect(tintHexColor('#808080', 0.5)).toBe('#404040');
  });
});
