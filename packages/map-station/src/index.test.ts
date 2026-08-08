import { describe, expect, it } from 'vitest';
import { createStationMapPlugin } from './index.ts';

describe('map station', () => {
  it('creates a station interior with a central hall and exit back outside', () => {
    const plugin = createStationMapPlugin();
    const map = plugin.createMap?.({
      seed: 'spec',
      plugins: {} as never,
      context: {
        id: 'station:4:9:0',
        label: 'Copper Lantern Station',
        type: 'station',
        depth: 1,
        origin: { x: 4, y: 9 },
      },
    });

    if (!map) {
      throw new Error('Expected station map plugin to create a station map.');
    }

    expect(map.getTile(0, 0)).toEqual(
      expect.objectContaining({
        kind: 'station',
        note: expect.stringContaining('station hall'),
      })
    );
    expect(map.getTile(0, 4)).toEqual(
      expect.objectContaining({
        kind: 'door',
      })
    );
    expect(map.getExit?.(0, 4)).toEqual(
      expect.objectContaining({
        spawn: { x: 4, y: 9 },
      })
    );
  });
});
