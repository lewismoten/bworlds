import { describe, expect, it } from 'vitest';
import { createStartRegionRuntimePlugin } from './index.ts';

type StarterTerrainTileKind =
  | 'plains'
  | 'road'
  | 'sign'
  | 'river'
  | 'bridge'
  | 'town';

const plugin = createStartRegionRuntimePlugin();
type ResolveOverworldTilePayload = Parameters<
  NonNullable<typeof plugin.resolveOverworldTile>
>[0];

function createStartRegionPayload(
  overrides: Partial<ResolveOverworldTilePayload> = {}
): ResolveOverworldTilePayload {
  return {
    seed: 'spec',
    x: 0,
    y: 0,
    sampleTerrainSignals() {
      throw new Error('starter region lookup should not need terrain signals');
    },
    ...overrides,
  };
}

describe('runtime start region', () => {
  it('returns curated starter terrain near the origin', () => {
    const tile = plugin.resolveOverworldTile?.(createStartRegionPayload());

    expect(tile).toEqual(
      expect.objectContaining({
        kind: 'plains',
      })
    );
  });

  it('preserves curated starter feature tiles inside the meadow band', () => {
    const samples: Array<{ x: number; y: number; kind: StarterTerrainTileKind }> = [
      { x: -1, y: 2, kind: 'road' },
      { x: 0, y: 2, kind: 'road' },
      { x: 1, y: 1, kind: 'sign' },
      { x: 1, y: 2, kind: 'road' },
      { x: 2, y: 2, kind: 'road' },
      { x: 3, y: -1, kind: 'river' },
      { x: 4, y: -1, kind: 'river' },
      { x: 4, y: 0, kind: 'river' },
      { x: 3, y: 1, kind: 'river' },
      { x: 3, y: 2, kind: 'bridge' },
      { x: 3, y: 3, kind: 'river' },
      { x: 4, y: 2, kind: 'road' },
      { x: 5, y: 2, kind: 'road' },
      { x: 5, y: 3, kind: 'road' },
      { x: 4, y: 4, kind: 'river' },
      { x: 5, y: 5, kind: 'river' },
    ];

    for (const sample of samples) {
      const tile = plugin.resolveOverworldTile?.(
        createStartRegionPayload({
          x: sample.x,
          y: sample.y,
        })
      );

      expect(tile).toEqual(
        expect.objectContaining({
          kind: sample.kind,
        })
      );
    }
  });

  it('keeps a visibly winding river path near the starting bridge', () => {
    const riverRun = [
      { x: 3, y: -1 },
      { x: 4, y: -1 },
      { x: 4, y: 0 },
      { x: 3, y: 1 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
      { x: 5, y: 5 },
    ].map(({ x, y }) =>
      plugin.resolveOverworldTile?.(createStartRegionPayload({ x, y }))
    );

    expect(riverRun).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'river' }),
        expect.objectContaining({ kind: 'river' }),
        expect.objectContaining({ kind: 'river' }),
      ])
    );
  });

  it('replaces starter poi names with deterministic generated names', () => {
    const tile = plugin.resolveOverworldTile?.(
      createStartRegionPayload({
        x: 5,
        y: 4,
      })
    );

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
