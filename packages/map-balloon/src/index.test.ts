import { describe, expect, it } from 'vitest';
import {
  createBalloonMapPlugin,
  findBalloonLandingPoint,
  isBalloonLaunchableLandTile,
} from './index.ts';

describe('map balloon', () => {
  it('launches from open ground near travel infrastructure and finds a distant landing', () => {
    const sampleTile = (x: number, y: number) => {
      if (x === 0 && y === -1) {
        return { kind: 'road' };
      }
      if (x >= 8) {
        return { kind: 'plains' };
      }
      return { kind: 'plains' };
    };

    expect(
      isBalloonLaunchableLandTile({
        x: 0,
        y: 0,
        sampleTile: sampleTile as never,
        isWalkable(kind) {
          return !['mountain', 'ocean', 'river', 'wall'].includes(kind);
        },
      })
    ).toBe(true);
    expect(
      findBalloonLandingPoint({
        x: 0,
        y: 0,
        facing: 0,
        sampleTile: sampleTile as never,
        isWalkable(kind) {
          return !['mountain', 'ocean', 'river', 'wall'].includes(kind);
        },
      })
    ).toEqual({ x: 8, y: 0 });
  });

  it('builds a balloon map that lands on the configured destination', () => {
    const plugin = createBalloonMapPlugin();
    const map = plugin.createMap?.({
      seed: 'spec',
      plugins: {} as never,
      context: {
        id: 'balloon:0:0:12:0',
        label: 'Balloon',
        type: 'balloon',
        depth: 1,
        origin: { x: 0, y: 0 },
        destination: { x: 12, y: 0 },
      },
    });
    if (!map) {
      throw new Error('Expected balloon map plugin to create a balloon map.');
    }

    expect(map.getTile(0, 0)).toEqual(
      expect.objectContaining({
        kind: 'interior',
      })
    );
    expect(map.getExit?.(0, -2)).toEqual({
      spawn: { x: 12, y: 0 },
    });
  });
});
