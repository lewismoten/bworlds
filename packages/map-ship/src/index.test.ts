import { describe, expect, it } from 'vitest';
import { createShipMapPlugin } from './index.ts';

describe('map ship', () => {
  it('returns service-ship passengers to the next dock destination on exit', () => {
    const plugin = createShipMapPlugin();
    const map = plugin.createMap?.({
      seed: 'spec',
      plugins: {} as never,
      context: {
        id: 'dock-route-ship:0:0',
        label: 'Tide Run',
        type: 'ship',
        depth: 1,
        origin: { x: 0, y: 0 },
        destination: { x: 11, y: 22 },
        routeBoatName: 'Tide Run',
      },
    });
    if (!map) {
      throw new Error('Expected ship map plugin to create a ship map.');
    }

    expect(map.getTile(0, 0)).toEqual(
      expect.objectContaining({
        kind: 'ship',
        note: expect.stringContaining('Tide Run'),
      })
    );
    expect(map.getExit?.(0, 5)).toEqual(
      expect.objectContaining({
        spawn: { x: 11, y: 22 },
      })
    );
  });
});
