import { describe, expect, it } from 'vitest';
import {
  createBlimpMapPlugin,
  findBlimpLandingPoint,
  isBlimpLaunchableLandTile,
} from './index.ts';

describe('map blimp', () => {
  it('launches from heavy infrastructure and finds a farther landing zone', () => {
    const sampleTile = (x: number, y: number) => {
      if (x === 0 && y === -1) {
        return { kind: 'station' };
      }
      return { kind: 'plains' };
    };

    expect(
      isBlimpLaunchableLandTile({
        x: 0,
        y: 0,
        sampleTile: sampleTile as never,
        isWalkable(kind) {
          return !['mountain', 'ocean', 'river', 'wall'].includes(kind);
        },
      })
    ).toBe(true);
    expect(
      findBlimpLandingPoint({
        x: 0,
        y: 0,
        facing: 0,
        sampleTile: sampleTile as never,
        isWalkable(kind) {
          return !['mountain', 'ocean', 'river', 'wall'].includes(kind);
        },
      })
    ).toEqual({ x: 12, y: 0 });
  });

  it('builds a blimp map that lands on the configured destination', () => {
    const plugin = createBlimpMapPlugin();
    const map = plugin.createMap?.({
      seed: 'spec',
      plugins: {} as never,
      context: {
        id: 'blimp:0:0:16:0',
        label: 'Blimp',
        type: 'blimp',
        depth: 1,
        origin: { x: 0, y: 0 },
        destination: { x: 16, y: 0 },
      },
    });
    if (!map) {
      throw new Error('Expected blimp map plugin to create a blimp map.');
    }

    expect(map.getTile(0, 0)).toEqual(
      expect.objectContaining({
        kind: 'interior',
      })
    );
    expect(map.getExit?.(0, -2)).toEqual({
      spawn: { x: 16, y: 0 },
    });
  });
});
