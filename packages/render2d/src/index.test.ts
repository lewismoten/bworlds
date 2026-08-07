import { describe, expect, it } from 'vitest';
import { getRiverOverlayConnections } from './index';

function createState(tileMap: Record<string, string>) {
  return {
    getCurrentTile(x: number, y: number) {
      return {
        kind: tileMap[`${x}:${y}`] ?? 'plains',
      };
    },
  };
}

describe('getRiverOverlayConnections', () => {
  it('includes river, bridge, and ocean neighbors as connected flow', () => {
    const state = createState({
      '0:-1': 'river',
      '1:0': 'bridge',
      '0:1': 'ocean',
      '-1:0': 'plains',
    });

    expect(getRiverOverlayConnections(state, 0, 0).map(({ id }) => id)).toEqual([
      'north',
      'east',
      'south',
    ]);
  });

  it('sorts diagonal and cardinal neighbors by angle for stable curve pairing', () => {
    const state = createState({
      '1:-1': 'river',
      '1:0': 'river',
      '1:1': 'river',
      '-1:1': 'river',
    });

    expect(getRiverOverlayConnections(state, 0, 0).map(({ id }) => id)).toEqual([
      'northeast',
      'east',
      'southeast',
      'southwest',
    ]);
  });
});
