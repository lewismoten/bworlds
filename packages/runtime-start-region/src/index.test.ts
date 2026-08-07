import { describe, expect, it } from 'vitest';
import { createStartRegionRuntimePlugin } from './index.ts';

describe('runtime start region', () => {
  it('returns curated starter terrain near the origin', () => {
    const plugin = createStartRegionRuntimePlugin();
    const tile = plugin.resolveOverworldTile?.({
      seed: 'spec',
      x: 0,
      y: 0,
      sampleTerrainSignals() {
        throw new Error('starter region lookup should not need terrain signals');
      },
    } as any);

    expect(tile).toEqual(
      expect.objectContaining({
        kind: 'plains',
      })
    );
  });

  it('replaces starter poi names with deterministic generated names', () => {
    const plugin = createStartRegionRuntimePlugin();
    const tile = plugin.resolveOverworldTile?.({
      seed: 'spec',
      x: 5,
      y: 4,
      sampleTerrainSignals() {
        throw new Error('starter region lookup should not need terrain signals');
      },
    } as any);

    expect(tile).toEqual(
      expect.objectContaining({
        kind: 'town',
        poi: expect.objectContaining({
          type: 'town',
          name: expect.any(String),
        }),
      })
    );
    expect(tile && 'poi' in tile ? tile.poi?.name : undefined).not.toBe(
      'Starter Town'
    );
  });
});
