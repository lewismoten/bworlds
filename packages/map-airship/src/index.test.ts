import { describe, expect, it } from 'vitest';
import {
  createAirshipMapPlugin,
  findAirshipLandingPoint,
  isAirshipLaunchableLandTile,
} from './index.ts';

describe('map airship', () => {
  it('launches from land beside a moored ship and finds a distant landing', () => {
    const sampleTile = (x: number, y: number) => {
      if (x === 0 && y === -1) {
        return { kind: 'ship' };
      }
      return { kind: 'plains' };
    };

    expect(
      isAirshipLaunchableLandTile({
        x: 0,
        y: 0,
        sampleTile: sampleTile as never,
        isWalkable(kind) {
          return !['mountain', 'ocean', 'river', 'wall'].includes(kind);
        },
      })
    ).toBe(true);
    expect(
      findAirshipLandingPoint({
        x: 0,
        y: 0,
        facing: 0,
        sampleTile: sampleTile as never,
        isWalkable(kind) {
          return !['mountain', 'ocean', 'river', 'wall'].includes(kind);
        },
      })
    ).toEqual({ x: 18, y: 0 });
  });

  it('builds an airship map that lands on the configured destination', () => {
    const plugin = createAirshipMapPlugin();
    const map = plugin.createMap?.({
      seed: 'spec',
      plugins: {} as never,
      context: {
        id: 'airship:0:0:24:0',
        label: 'Propeller Tall Ship',
        type: 'airship',
        depth: 1,
        origin: { x: 0, y: 0 },
        destination: { x: 24, y: 0 },
      },
    });
    if (!map) {
      throw new Error('Expected airship map plugin to create an airship map.');
    }

    expect(map.getTile(0, 0)).toEqual(
      expect.objectContaining({
        kind: 'ship',
      })
    );
    expect(map.getExit?.(0, -3)).toEqual({
      spawn: { x: 24, y: 0 },
    });
  });
});
