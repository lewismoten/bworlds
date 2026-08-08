import { describe, expect, it } from 'vitest';
import { getDockBoatPlacements } from '@bworlds/dock-route-support';
import { createDockTrafficRuntimePlugin } from './index.ts';

function createCircularDockRouteState() {
  const dockTiles = new Set([
    '0:0',
    '1:0',
    '22:0',
    '23:0',
    '11:22',
    '12:22',
  ]);
  const poiNames: Record<string, string> = {
    '-1:0': 'Beacon Point',
    '24:0': 'Harbor Market',
    '13:23': 'Crescent Watch',
  };

  return {
    timeMs: 0,
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
  };
}

describe('runtime dock traffic', () => {
  it('annotates water tiles with active paddle-boat traffic', () => {
    const plugin = createDockTrafficRuntimePlugin();
    const state = createCircularDockRouteState();
    const placement = getDockBoatPlacements(state as never, 0, 0, 0)[0];

    expect(placement).toBeDefined();

    const tile = plugin.decorateOverworldTile?.({
      seed: 'spec-seed',
      x: placement!.x,
      y: placement!.y,
      tile: { kind: state.getCurrentTile(placement!.x, placement!.y).kind },
      state: state as never,
    } as never);

    expect(tile).toEqual(
      expect.objectContaining({
        boat: expect.objectContaining({
          x: placement!.x,
          y: placement!.y,
          boatName: expect.any(String),
        }),
      })
    );
  });

  it('returns deterministic overlays within the same time bucket', () => {
    const plugin = createDockTrafficRuntimePlugin();
    const state = createCircularDockRouteState();
    const placement = getDockBoatPlacements(state as never, 0, 0, 0)[0]!;

    const first = plugin.decorateOverworldTile?.({
      seed: 'spec-seed',
      x: placement.x,
      y: placement.y,
      tile: { kind: state.getCurrentTile(placement.x, placement.y).kind },
      state: { ...state, timeMs: 500 } as never,
    } as never);
    const second = plugin.decorateOverworldTile?.({
      seed: 'spec-seed',
      x: placement.x,
      y: placement.y,
      tile: { kind: state.getCurrentTile(placement.x, placement.y).kind },
      state: { ...state, timeMs: 1500 } as never,
    } as never);

    expect(second).toEqual(first);
  });
});
