import { describe, expect, it } from 'vitest';
import { getTownNpcPlacements } from '@bworlds/town-support';
import { getActiveNpcCount } from './debug-world-stats.ts';

describe('debug world stats', () => {
  it('reports the active npc count for town contexts from shared town placement data', () => {
    const timeMs = 18_000;
    expect(
      getActiveNpcCount({
        timeMs,
        getCurrentContext() {
          return {
            id: 'town:3:7',
            type: 'town',
            depth: 1,
            origin: { x: 3, y: 7 },
          };
        },
      })
    ).toBe(getTownNpcPlacements(3, 7, timeMs).length);
  });

  it('keeps counting town npcs while inside a building interior with the same origin', () => {
    const timeMs = 36_000;
    expect(
      getActiveNpcCount({
        timeMs,
        getCurrentContext() {
          return {
            id: 'town:3:7:building',
            type: 'building',
            depth: 2,
            origin: { x: 3, y: 7 },
          };
        },
      })
    ).toBe(getTownNpcPlacements(3, 7, timeMs).length);
  });

  it('returns zero outside contexts backed by a town origin', () => {
    expect(
      getActiveNpcCount({
        timeMs: 18_000,
        getCurrentContext() {
          return {
            id: 'overworld',
            type: 'overworld',
            depth: 0,
          };
        },
      })
    ).toBe(0);
  });
});
