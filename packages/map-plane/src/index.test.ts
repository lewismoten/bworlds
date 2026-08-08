import { describe, expect, it } from 'vitest';
import {
  createPlaneMapPlugin,
  findPlaneLandingPoint,
  isPlaneLaunchableLandTile,
} from './index.ts';

describe('map plane', () => {
  it('launches from runway-like ground and finds a long landing strip', () => {
    const sampleTile = (x: number, y: number) => {
      if (y === 0 && x >= 0 && x <= 3) {
        return { kind: 'road' };
      }
      return { kind: 'plains' };
    };

    expect(
      isPlaneLaunchableLandTile({
        x: 0,
        y: 0,
        facing: 0,
        sampleTile: sampleTile as never,
        isWalkable(kind) {
          return !['mountain', 'ocean', 'river', 'wall'].includes(kind);
        },
      })
    ).toBe(true);
    expect(
      findPlaneLandingPoint({
        x: 0,
        y: 0,
        facing: 0,
        sampleTile: sampleTile as never,
        isWalkable(kind) {
          return !['mountain', 'ocean', 'river', 'wall'].includes(kind);
        },
      })
    ).toEqual({ x: 16, y: 0 });
  });

  it('builds a plane map that lands on the configured destination', () => {
    const plugin = createPlaneMapPlugin();
    const map = plugin.createMap?.({
      seed: 'spec',
      plugins: {} as never,
      context: {
        id: 'plane:0:0:20:0',
        label: 'Plane',
        type: 'plane',
        depth: 1,
        origin: { x: 0, y: 0 },
        destination: { x: 20, y: 0 },
      },
    });
    if (!map) {
      throw new Error('Expected plane map plugin to create a plane map.');
    }

    expect(map.getTile(0, 0)).toEqual(
      expect.objectContaining({
        kind: 'interior',
      })
    );
    expect(map.getExit?.(0, -2)).toEqual({
      spawn: { x: 20, y: 0 },
    });
  });
});
