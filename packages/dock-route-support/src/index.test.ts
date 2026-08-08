import { describe, expect, it } from 'vitest';
import { resolveDockBoatRoute } from './index.ts';

function createDockRouteState() {
  const dockTiles = new Set([
    '0:0',
    '1:0',
    '24:10',
    '25:10',
    '12:28',
    '13:28',
  ]);
  const poiNames: Record<string, string> = {
    '-1:0': 'Beacon Point',
    '23:10': 'Harbor Market',
    '11:28': 'Crescent Watch',
  };

  return {
    player: { x: 0, y: 0, facing: 0 },
    getCurrentContext() {
      return { id: 'overworld', type: 'overworld', depth: 0 };
    },
    getCurrentTile(x: number, y: number) {
      const key = `${x}:${y}`;
      if (dockTiles.has(key)) {
        return { kind: 'dock' };
      }
      if (poiNames[key]) {
        return { kind: 'shore', poi: { type: 'town', name: poiNames[key] } };
      }
      return { kind: 'ocean' };
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
  };
}

describe('dock route support', () => {
  it('resolves a deterministic dock route with named stops', () => {
    const state = createDockRouteState();

    const route = resolveDockBoatRoute(state as never, 0, 0);

    expect(route?.boatName).toEqual(expect.any(String));
    expect(route?.currentStopIndex).toBe(0);
    expect(route?.stops).toEqual([
      expect.objectContaining({ name: 'Beacon Point' }),
      expect.objectContaining({ name: 'Harbor Market' }),
    ]);
  });

  it('returns null when the tile is not a dock', () => {
    const state = createDockRouteState();

    expect(resolveDockBoatRoute(state as never, 8, 8)).toBeNull();
  });

  it('rejects docks that are too close together for a route circuit', () => {
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile(x: number, y: number) {
        if ((x === 0 || x === 1) && y === 0) {
          return { kind: 'dock' };
        }
        if ((x === 8 || x === 9) && y === 0) {
          return { kind: 'dock' };
        }
        if (x === -1 && y === 0) {
          return { kind: 'shore', poi: { type: 'town', name: 'Nearport' } };
        }
        if (x === 7 && y === 0) {
          return { kind: 'shore', poi: { type: 'town', name: 'Closehaven' } };
        }
        return { kind: 'ocean' };
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
    };

    expect(resolveDockBoatRoute(state as never, 0, 0)).toBeNull();
  });
});
