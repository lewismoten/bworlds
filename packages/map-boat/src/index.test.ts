import { describe, expect, it } from 'vitest';
import {
  createBoatMapPlugin,
  findNearestBoatLaunchPoint,
  isBoatLaunchableLandTile,
  isBoatNavigableTile,
} from './index.ts';

describe('map boat', () => {
  it('finds launchable coastlines and allows open-ocean navigation', () => {
    const sampleTile = (x: number) => {
      if (x <= 0) return { kind: 'plains' };
      if (x === 1) return { kind: 'shore' };
      return { kind: 'ocean' };
    };

    expect(
      isBoatLaunchableLandTile({
        x: 0,
        y: 0,
        sampleTile: sampleTile as never,
        isWalkable(kind) {
          return kind !== 'ocean';
        },
      })
    ).toBe(true);
    expect(
      findNearestBoatLaunchPoint({
        x: 0,
        y: 0,
        sampleTile: sampleTile as never,
      })
    ).toEqual({ x: 1, y: 0 });
    expect(
      isBoatNavigableTile({
        x: 4,
        y: 0,
        sampleTile: sampleTile as never,
      })
    ).toBe(true);
  });

  it('builds a boat map that keeps open ocean traversable and lands on nearby coast', () => {
    const plugin = createBoatMapPlugin();
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
            walkable: kind !== 'ocean',
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
        classifyOverworldTile({ x }: { x: number }) {
          if (x <= 0) return { kind: 'plains' };
          if (x === 1) return { kind: 'shore' };
          return { kind: 'ocean' };
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
        id: 'boat:0:0',
        label: 'Boat',
        type: 'boat',
        depth: 1,
        origin: { x: 0, y: 0 },
      },
    });
    if (!map) {
      throw new Error('Expected boat map plugin to create a boat map.');
    }

    expect(map.getTile(4, 0).kind).toBe('ocean');
    expect(map.canWalk?.(4, 0)).toBe(true);
    expect(map.canWalk?.(0, 0)).toBe(false);
    expect(map.getExit?.(4, 0)).toEqual(
      expect.objectContaining({
        spawn: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
        }),
      })
    );
  });
});
