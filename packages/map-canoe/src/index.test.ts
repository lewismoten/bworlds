import { describe, expect, it } from 'vitest';
import {
  createCanoeMapPlugin,
  findNearestCanoeLandingPoint,
  findNearestCanoeLaunchPoint,
  isCanoeNavigableTile,
} from './index.ts';

describe('map canoe', () => {
  it('finds launch and landing points around rivers and nearshore ocean', () => {
    const sampleTile = (x: number, y: number) => {
      if (x === 0 && y === 0) return { kind: 'plains' };
      if (x === 1 && y === 0) return { kind: 'river' };
      if (x >= 4 && x <= 6 && Math.abs(y) <= 1) return { kind: 'ocean' };
      if (x === 3 && y === 0) return { kind: 'shore' };
      return { kind: 'forest' };
    };

    expect(
      findNearestCanoeLaunchPoint({
        x: 0,
        y: 0,
        sampleTile,
      })
    ).toEqual({ x: 1, y: 0 });

    expect(
      isCanoeNavigableTile({
        x: 5,
        y: 0,
        sampleTile,
      })
    ).toBe(true);

    expect(
      findNearestCanoeLandingPoint({
        x: 1,
        y: 0,
        sampleTile,
        isWalkable(kind) {
          return kind !== 'ocean' && kind !== 'river';
        },
      })
    ).toEqual(
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
      })
    );
  });

  it('builds a canoe map that keeps water visible while allowing contextual travel', () => {
    const plugin = createCanoeMapPlugin();
    const map = plugin.createMap?.({
      seed: 'spec',
      plugins: {
        getDefaultTileKind() {
          return 'plains';
        },
        getTileDefinition(kind: string) {
          return {
            name: kind,
            color: '#000',
            miniColor: '#111',
            walkable: kind !== 'ocean' && kind !== 'river',
            wallHeight: 0,
          };
        },
        resolveOverworldTile() {
          return null;
        },
        resolveOverworldAnchors() {
          return {
            townAnchors: [],
            bridgeAnchors: [],
            poiAnchors: [],
          };
        },
        classifyTerrainTile() {
          return null;
        },
        classifyOverworldTile({ x, y }: { x: number; y: number }) {
          if (x === 0 && y === 0) return { kind: 'plains' };
          if (x === 1 && y === 0) return { kind: 'river' };
          if (x >= 3 && x <= 5 && y === 0) return { kind: 'ocean' };
          if (x === 2 && y === 0) return { kind: 'shore' };
          return { kind: 'forest' };
        },
        decorateOverworldTile({ tile }: { tile: { kind: string } }) {
          return tile;
        },
        decorateTownTile({ tile }: { tile: { kind: string } }) {
          return tile;
        },
        decorateBuildingTile({ tile }: { tile: { kind: string } }) {
          return tile;
        },
        decorateDepthTile({ tile }: { tile: { kind: string } }) {
          return tile;
        },
      } as never,
      context: {
        id: 'canoe:0:0',
        label: 'Canoe',
        type: 'canoe',
        depth: 1,
        origin: { x: 0, y: 0 },
      },
    });
    if (!map) {
      throw new Error('Expected canoe map plugin to create a canoe map.');
    }

    expect(map.getTile(1, 0).kind).toBe('river');
    expect(map.canWalk?.(1, 0)).toBe(true);
    expect(map.canWalk?.(0, 0)).toBe(false);
    expect(map.getExit?.(1, 0)).toEqual(
      expect.objectContaining({
        spawn: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      })
    );
  });
});
