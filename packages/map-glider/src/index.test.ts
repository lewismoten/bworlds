import { describe, expect, it } from 'vitest';
import {
  createGliderMapPlugin,
  findGliderLandingPoint,
  isGliderLaunchableLandTile,
} from './index.ts';

describe('map glider', () => {
  it('launches from walkable high ground beside mountains and finds a landing downrange', () => {
    const sampleTile = (x: number, y: number) => {
      if (x === 0 && y === -1) {
        return { kind: 'mountain' };
      }
      if (x >= 6) {
        return { kind: 'plains' };
      }
      return { kind: 'road' };
    };

    expect(
      isGliderLaunchableLandTile({
        x: 0,
        y: 0,
        sampleTile: sampleTile as never,
        isWalkable(kind) {
          return kind !== 'mountain' && kind !== 'ocean' && kind !== 'river';
        },
      })
    ).toBe(true);
    expect(
      findGliderLandingPoint({
        x: 0,
        y: 0,
        facing: 0,
        sampleTile: sampleTile as never,
        isWalkable(kind) {
          return kind !== 'mountain' && kind !== 'ocean' && kind !== 'river';
        },
      })
    ).toEqual({ x: 4, y: 0 });
  });

  it('builds a glider map that lands on the configured destination', () => {
    const plugin = createGliderMapPlugin();
    const map = plugin.createMap?.({
      seed: 'spec',
      plugins: {} as never,
      context: {
        id: 'glider:0:0:8:0',
        label: 'Glider',
        type: 'glider',
        depth: 1,
        origin: { x: 0, y: 0 },
        destination: { x: 8, y: 0 },
      },
    });
    if (!map) {
      throw new Error('Expected glider map plugin to create a glider map.');
    }

    expect(map.getTile(0, 0)).toEqual(
      expect.objectContaining({
        kind: 'interior',
      })
    );
    expect(map.getExit?.(0, -2)).toEqual({
      spawn: { x: 8, y: 0 },
    });
  });
});
