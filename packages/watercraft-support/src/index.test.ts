import { describe, expect, it } from 'vitest';
import {
  createWatercraftMap,
  findNearestWatercraftLandingPoint,
  findNearestWatercraftLaunchPoint,
  hasNearbyKind,
} from './index.ts';
import type { TileLike } from '@bworlds/plugin-api';

describe('watercraft support', () => {
  it('finds the nearest navigable launch point in deterministic ring order', () => {
    const navigable = new Set(['1:0', '0:2']);

    const launch = findNearestWatercraftLaunchPoint({
      x: 0,
      y: 0,
      sampleTile(sampleX: number, sampleY: number): TileLike {
        return {
          kind: navigable.has(`${sampleX}:${sampleY}`) ? 'river' : 'plains',
        };
      },
      canNavigate({ x: sampleX, y: sampleY }) {
        return navigable.has(`${sampleX}:${sampleY}`);
      },
      searchRadius: 3,
    });

    expect(launch).toEqual({ x: 1, y: 0 });
  });

  it('finds the nearest landing tile that can still relaunch nearby', () => {
    const navigable = new Set(['0:0', '1:0', '2:0']);
    const landable = new Set(['1:1', '2:1']);

    const landing = findNearestWatercraftLandingPoint({
      x: 0,
      y: 0,
      sampleTile(sampleX: number, sampleY: number): TileLike {
        if (navigable.has(`${sampleX}:${sampleY}`)) {
          return { kind: 'river' };
        }
        if (landable.has(`${sampleX}:${sampleY}`)) {
          return { kind: 'shore' };
        }
        return { kind: 'forest' };
      },
      isWalkable(kind) {
        return kind !== 'river';
      },
      canNavigate({ x: sampleX, y: sampleY }) {
        return navigable.has(`${sampleX}:${sampleY}`);
      },
      searchRadius: 3,
      canLandTileKind(kind) {
        return kind === 'shore';
      },
    });

    expect(landing).toEqual({ x: 1, y: 1 });
  });

  it('detects matching nearby kinds without considering the center tile', () => {
    const nearbyWater = hasNearbyKind(
      0,
      0,
      (sampleX, sampleY) =>
        ({
          kind: sampleX === 1 && sampleY === 0 ? 'river' : 'plains',
        }) satisfies TileLike,
      (kind) => kind === 'river'
    );
    const centerOnlyWater = hasNearbyKind(
      0,
      0,
      (sampleX, sampleY) =>
        ({
          kind: sampleX === 0 && sampleY === 0 ? 'river' : 'plains',
        }) satisfies TileLike,
      (kind) => kind === 'river'
    );

    expect(nearbyWater).toBe(true);
    expect(centerOnlyWater).toBe(false);
  });

  it('recreates deterministic watercraft tiles after bounded cache eviction churn', () => {
    const map = createWatercraftMap({
      seed: 'cache-spec',
      context: {
        id: 'boat:cache',
        label: 'Boat',
        type: 'boat',
        depth: 1,
        origin: { x: 10, y: -5 },
      },
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
          if ((x + y) % 7 === 0) {
            return { kind: 'river', note: `current:${x}:${y}` };
          }
          if ((x - y) % 5 === 0) {
            return { kind: 'shore', note: `shore:${x}:${y}` };
          }
          return { kind: 'forest', note: `forest:${x}:${y}` };
        },
        decorateOverworldTile({ tile }: { tile: TileLike }) {
          return tile;
        },
        decorateTownTile({ tile }: { tile: TileLike }) {
          return tile;
        },
        decorateBuildingTile({ tile }: { tile: TileLike }) {
          return tile;
        },
        decorateDepthTile({ tile }: { tile: TileLike }) {
          return tile;
        },
      } as never,
      isNavigableTile({ sampleTile, x, y, state }) {
        const kind = sampleTile(x, y, state).kind;
        return kind === 'river' || kind === 'shore';
      },
      landingSearchRadius: 3,
      tileCacheMaxEntries: 4,
    });

    const baseline = map.getTile(2, 3);

    for (let index = 0; index < 8; index += 1) {
      map.getTile(index - 4, index + 2);
    }

    expect(map.getTile(2, 3)).toEqual(baseline);
  });
});
