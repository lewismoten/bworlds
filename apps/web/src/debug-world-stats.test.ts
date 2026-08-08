import { describe, expect, it } from 'vitest';
import { getTownNpcPlacements } from '@bworlds/town-support';
import { getDebugWorldStats } from './debug-world-stats.ts';

describe('debug world stats', () => {
  it('reports town npc activity together with full simulation counts', () => {
    const timeMs = 18_000;
    const activeNpcCount = getTownNpcPlacements(3, 7, timeMs).length;
    expect(
      getDebugWorldStats({
        timeMs,
        activeCharacterIds: ['player', 'npc:lyra'],
        characterRoster: {
          characters: [
            { availability: 'active' },
            { availability: 'active' },
            { availability: 'available' },
            { availability: 'dropped' },
          ],
        },
        getCurrentContext() {
          return {
            id: 'town:3:7',
            type: 'town',
            depth: 1,
            origin: { x: 3, y: 7 },
          };
        },
      })
    ).toEqual({
      activeNpcCount,
      fullSimulationEntityCount: activeNpcCount + 2,
      reducedSimulationEntityCount: 1,
    });
  });

  it('keeps counting town npcs while inside a building interior with the same origin', () => {
    const timeMs = 36_000;
    expect(
      getDebugWorldStats({
        timeMs,
        activeCharacterIds: ['player'],
        getCurrentContext() {
          return {
            id: 'town:3:7:building',
            type: 'building',
            depth: 2,
            origin: { x: 3, y: 7 },
          };
        },
      })
    ).toEqual({
      activeNpcCount: getTownNpcPlacements(3, 7, timeMs).length,
      fullSimulationEntityCount: getTownNpcPlacements(3, 7, timeMs).length + 1,
      reducedSimulationEntityCount: 0,
    });
  });

  it('falls back to only the active party outside town-backed contexts', () => {
    expect(
      getDebugWorldStats({
        timeMs: 18_000,
        activeCharacterIds: ['player', 'npc:lyra', 'npc:orin'],
        characterRoster: {
          characters: [
            { availability: 'active' },
            { availability: 'active' },
            { availability: 'active' },
            { availability: 'available' },
          ],
        },
        getCurrentContext() {
          return {
            id: 'overworld',
            type: 'overworld',
            depth: 0,
          };
        },
      })
    ).toEqual({
      activeNpcCount: 0,
      fullSimulationEntityCount: 3,
      reducedSimulationEntityCount: 1,
    });
  });
});
