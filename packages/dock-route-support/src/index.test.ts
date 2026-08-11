import { describe, expect, it } from 'vitest';
import {
  getDockBoatPhaseSeed,
  getDockBoatPlacements,
  resolveDockBoatRoute,
} from './index.ts';

function createCircularDockRouteState() {
  const dockTiles = new Set(['0:0', '1:0', '22:0', '23:0', '11:22', '12:22']);
  const poiNames: Record<string, string> = {
    '-1:0': 'Beacon Point',
    '24:0': 'Harbor Market',
    '13:23': 'Crescent Watch',
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
      const onTopRoute = y === 0 && x >= 2 && x <= 21;
      const onRightRoute = x === 23 && y >= 1 && y <= 21;
      const onBottomRightRoute = y === 22 && x >= 13 && x <= 23;
      const onBottomLeftRoute = y === 22 && x >= 0 && x <= 10;
      const onLeftRoute = x === 0 && y >= 1 && y <= 21;
      if (
        onTopRoute ||
        onRightRoute ||
        onBottomRightRoute ||
        onBottomLeftRoute ||
        onLeftRoute
      ) {
        return {
          kind:
            (x === 23 && y === 22) || (x === 12 && y === 21)
              ? 'bridge'
              : 'ocean',
        };
      }
      return { kind: 'shore' };
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
  it('reuses deterministic boat phase seeds for repeated stop layouts', () => {
    const harborRunnerRoute = {
      stops: [
        { x: 1, y: 2, name: 'Beacon Point' },
        { x: 8, y: -3, name: 'Crescent Watch' },
      ],
    };
    const crescentFerryRoute = {
      stops: [
        { x: 1, y: 2, name: 'Beacon Point' },
        { x: 9, y: -3, name: 'Crescent Watch' },
      ],
    };

    expect(getDockBoatPhaseSeed(harborRunnerRoute)).toBe(
      getDockBoatPhaseSeed(harborRunnerRoute)
    );
    expect(getDockBoatPhaseSeed(harborRunnerRoute)).not.toBe(
      getDockBoatPhaseSeed(crescentFerryRoute)
    );
  });

  it('resolves a deterministic circular dock route with named stops', () => {
    const state = createCircularDockRouteState();

    const route = resolveDockBoatRoute(state as never, 0, 0);

    expect(route?.boatName).toEqual(expect.any(String));
    expect(route?.currentStopIndex).toBe(0);
    expect(route?.stops.length).toBeGreaterThanOrEqual(2);
    expect(route?.stops.length).toBeLessThanOrEqual(5);
    expect(route?.stops).toEqual([
      expect.objectContaining({ name: 'Beacon Point' }),
      expect.objectContaining({ name: 'Crescent Watch' }),
      expect.objectContaining({ name: 'Harbor Market' }),
    ]);
  });

  it('returns null when the tile is not a dock', () => {
    const state = createCircularDockRouteState();

    expect(resolveDockBoatRoute(state as never, 8, 8)).toBeNull();
  });

  it('resolves deterministic paddle-boat placements along the route water tiles', () => {
    const state = createCircularDockRouteState();

    const first = getDockBoatPlacements(state as never, 0, 0, 0);
    const second = getDockBoatPlacements(state as never, 1_500, 0, 0);

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
    expect(first[0]).toEqual(
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
        boatName: expect.any(String),
        segmentProgress: expect.any(Number),
        from: expect.any(String),
        to: expect.any(String),
      })
    );
    expect(state.getCurrentTile(first[0]!.x, first[0]!.y).kind).toMatch(
      /^(ocean|bridge)$/
    );
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

  it('rejects routes that would double back over the same water corridor', () => {
    const state = {
      player: { x: 0, y: 0, facing: 0 },
      getCurrentContext() {
        return { id: 'overworld', type: 'overworld', depth: 0 };
      },
      getCurrentTile(x: number, y: number) {
        if ((x === 0 || x === 1) && y === 0) {
          return { kind: 'dock' };
        }
        if ((x === 22 || x === 23) && y === 0) {
          return { kind: 'dock' };
        }
        if ((x === 11 || x === 12) && y === 10) {
          return { kind: 'dock' };
        }
        if (x === -1 && y === 0) {
          return { kind: 'shore', poi: { type: 'town', name: 'Beacon Point' } };
        }
        if (x === 24 && y === 0) {
          return {
            kind: 'shore',
            poi: { type: 'town', name: 'Harbor Market' },
          };
        }
        if (x === 13 && y === 10) {
          return { kind: 'shore', poi: { type: 'town', name: 'Middle Reach' } };
        }
        if ((y === 0 && x >= 2 && x <= 21) || (x === 12 && y >= 1 && y <= 9)) {
          return { kind: 'ocean' };
        }
        return { kind: 'shore' };
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
