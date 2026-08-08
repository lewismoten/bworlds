import { describe, expect, it } from 'vitest';
import { getNearbyOverworldQueryState } from './nearby-overworld-query.ts';

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
});
