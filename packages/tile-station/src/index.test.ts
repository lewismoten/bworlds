import { describe, expect, it } from 'vitest';
import { createStationTilePlugin } from './index.ts';

describe('tile station', () => {
  it('creates an enterable anchored station point of interest', () => {
    const plugin = createStationTilePlugin();
    const tile = plugin.tiles?.find((entry) => entry.kind === 'station');

    const classified = tile?.classifyOverworldTile?.({
      seed: 'spec',
      x: 6,
      y: 4,
      nearLand: true,
      tile: { kind: 'plains' },
      poiAnchors: [{ x: 6, y: 4, type: 'station', name: 'Copper Lantern Station' }],
    } as never);

    expect(classified).toEqual(
      expect.objectContaining({
        kind: 'station',
        poi: expect.objectContaining({
          type: 'station',
          name: 'Copper Lantern Station',
        }),
      })
    );
  });
});
