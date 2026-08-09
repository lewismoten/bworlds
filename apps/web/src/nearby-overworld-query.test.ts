import { describe, expect, it } from 'vitest';
import {
  createNearbyOverworldQueryStateCache,
  getNearbyOverworldQueryState,
} from './nearby-overworld-query.ts';

describe('nearby overworld query state', () => {
  it('returns snapped overworld coordinates and context id for overworld players', () => {
    const state = {
      player: { x: 12.5, y: -4.25 },
      getCurrentContext() {
        return {
          id: 'overworld',
          label: 'Overworld',
          type: 'overworld',
          depth: 0,
        };
      },
    };

    expect(getNearbyOverworldQueryState(state as never)).toEqual({
      centerX: 13,
      centerY: -4,
      contextId: 'overworld',
    });
  });

  it('returns null outside the overworld', () => {
    const state = {
      player: { x: 0, y: 11 },
      getCurrentContext() {
        return {
          id: 'town:4:6:0',
          label: 'Oakcross',
          type: 'town',
          depth: 1,
        };
      },
    };

    expect(getNearbyOverworldQueryState(state as never)).toBeNull();
  });

  it('reuses cached query state objects until the player or context changes', () => {
    const resolveCachedQueryState = createNearbyOverworldQueryStateCache(
      getNearbyOverworldQueryState
    );
    let contextId = 'overworld';
    const state = {
      player: { x: 12.5, y: -4.25 },
      getCurrentContext() {
        return {
          id: contextId,
          label: 'Overworld',
          type: 'overworld',
          depth: 0,
        };
      },
    };

    const first = resolveCachedQueryState(state as never);
    const second = resolveCachedQueryState(state as never);

    expect(first).toBe(second);

    state.player.x = 13.25;
    const moved = resolveCachedQueryState(state as never);
    expect(moved).not.toBe(first);
    expect(moved).toEqual({
      centerX: 13,
      centerY: -4,
      contextId: 'overworld',
    });

    contextId = 'overworld:shifted';
    const contextChanged = resolveCachedQueryState(state as never);
    expect(contextChanged).not.toBe(moved);
    expect(contextChanged).toEqual({
      centerX: 13,
      centerY: -4,
      contextId: 'overworld:shifted',
    });
  });
});
