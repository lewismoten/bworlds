import { describe, expect, it } from 'vitest';
import { getDockBoatPlacements, resolveDockBoatRoute } from './index.ts';

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

describe('dock route support long checks', () => {
  it('keeps dock routes deterministic after bounded route-cache eviction churn', () => {
    const state = createCircularDockRouteState();
    const baselineRoute = resolveDockBoatRoute(state as never, 0, 0);
    const baselinePlacements = getDockBoatPlacements(state as never, 0, 0, 0);

    for (let index = 0; index < 600; index += 1) {
      resolveDockBoatRoute(
        state as never,
        index % 2 === 0 ? 0 : 23,
        index % 3 === 0 ? 0 : 22
      );
      getDockBoatPlacements(
        state as never,
        index * 2_000,
        (index % 120) - 60,
        Math.floor(index / 12) - 25
      );
    }

    expect(resolveDockBoatRoute(state as never, 0, 0)).toEqual(baselineRoute);
    expect(getDockBoatPlacements(state as never, 0, 0, 0)).toEqual(
      baselinePlacements
    );
  });

  it('reports arrival and departure whistle windows near dock approaches', () => {
    const state = createCircularDockRouteState();
    let departurePlacement:
      ReturnType<typeof getDockBoatPlacements>[number] | undefined;
    let arrivalPlacement:
      ReturnType<typeof getDockBoatPlacements>[number] | undefined;

    for (let timeMs = 0; timeMs <= 30 * 60 * 1000; timeMs += 2_000) {
      const placements = getDockBoatPlacements(state as never, timeMs, 0, 0);
      departurePlacement ??= placements.find(
        (placement) => placement.whistlePhase === 'departure'
      );
      arrivalPlacement ??= placements.find(
        (placement) => placement.whistlePhase === 'arrival'
      );
      if (departurePlacement && arrivalPlacement) {
        break;
      }
    }

    expect(departurePlacement).toEqual(
      expect.objectContaining({
        whistlePhase: 'departure',
      })
    );
    expect(arrivalPlacement).toEqual(
      expect.objectContaining({
        whistlePhase: 'arrival',
      })
    );
  });
});
