import { describe, expect, it } from 'vitest';
import { createTowerTilePlugin } from './index.ts';

describe('tile tower', () => {
  it('creates an enterable anchored tower point of interest', () => {
    const plugin = createTowerTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'tower');

    const classified = tile?.classifyOverworldTile?.({
      seed: 'spec',
      x: 8,
      y: -3,
      nearLand: true,
      tile: { kind: 'plains' },
      poiAnchors: [{ x: 8, y: -3, type: 'tower', name: 'Old Watchtower' }],
    } as never);

    expect(classified).toEqual(
      expect.objectContaining({
        kind: 'tower',
        poi: expect.objectContaining({
          type: 'tower',
          name: 'Old Watchtower',
        }),
      })
    );
  });
});
