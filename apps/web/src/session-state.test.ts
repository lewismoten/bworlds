import { describe, expect, it } from 'vitest';
import { DEFAULT_DAY_LENGTH_MS, getDaylightCycleState } from '@bworlds/core';
import { DEFAULT_PLAYER_LEVEL } from './player-progression.ts';
import { parseSavedSession, serializeSessionSnapshot } from './session-state.ts';

describe('session state', () => {
  it('round-trips frozen time, active tab, and compass heading state', () => {
    const raw = serializeSessionSnapshot({
      characterProfile: {
        player: {
          x: 12.5,
          y: -4.25,
          facing: Math.PI / 3,
        },
        packIds: ['default-content-pack'],
        stack: [{ id: 'overworld', depth: 0 }],
        worldSeed: 'spec-seed',
        playerLevel: 4,
        playerProfession: 'guard',
        completedQuestIds: ['tower:1'],
        playerPlacedPois: [
          {
            x: 4,
            y: 5,
            kind: 'town',
            note: 'A newly founded settlement takes shape here.',
            poi: { type: 'town', name: 'Spec Town' },
          },
        ],
      },
      player: {
        x: 12.5,
        y: -4.25,
        facing: Math.PI / 3,
      },
      packIds: ['default-content-pack'],
      stack: [{ id: 'overworld', depth: 0 }],
      viewMode: '3d',
      worldSeed: 'spec-seed',
      timekeeperDisplayMode: 'graphical',
      compassDisplayMode: 'graphical',
      minimapDisplayMode: 'graphical',
      minimapZoom: 1.4,
      timeOffsetMs: 42000,
      timeFrozen: true,
      frozenWorldTimeMs: 123456,
      inspectorTab: 'compass',
      modelPreviewMode: 'split',
      celestialEventMode: 'aurora',
      compassHeadingAngle: -Math.PI / 2,
      cameraPitch: -0.22,
      playerLevel: 4,
      completedQuestIds: ['tower:1'],
      playerPlacedPois: [
        {
          x: 4,
          y: 5,
          kind: 'town',
          note: 'A newly founded settlement takes shape here.',
          poi: { type: 'town', name: 'Spec Town' },
        },
      ],
    });

    expect(parseSavedSession(raw)).toEqual(
      expect.objectContaining({
        characterProfile: expect.objectContaining({
          playerProfession: 'guard',
          completedQuestIds: ['tower:1'],
        }),
        timeOffsetMs: 42000,
        worldSeed: 'spec-seed',
        timekeeperDisplayMode: 'graphical',
        compassDisplayMode: 'graphical',
        minimapDisplayMode: 'graphical',
        minimapZoom: 1.4,
        timeFrozen: true,
        frozenWorldTimeMs: 123456,
        inspectorTab: 'compass',
        compassHeadingAngle: -Math.PI / 2,
        cameraPitch: -0.22,
        playerLevel: 4,
        playerPlacedPois: [
          expect.objectContaining({
            kind: 'town',
          }),
        ],
      })
    );
  });

  it('accepts the ascii text viewport mode in saved sessions', () => {
    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          worldSeed: 42,
        })
      )
    ).toBeNull();

    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          viewMode: 'text',
        })
      )
    ).toEqual(
      expect.objectContaining({
        viewMode: 'text',
      })
    );
  });

  it('rejects invalid persisted inspector tabs and event modes', () => {
    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          timekeeperDisplayMode: 'analog',
        })
      )
    ).toBeNull();

    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          compassDisplayMode: 'dial',
        })
      )
    ).toBeNull();

    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          minimapDisplayMode: 'radar',
        })
      )
    ).toBeNull();

    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          inspectorTab: 'sextant',
        })
      )
    ).toEqual(
      expect.objectContaining({
        inspectorTab: 'sextant',
      })
    );

    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          inspectorTab: 'invalid',
        })
      )
    ).toBeNull();

    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          celestialEventMode: 'invalid',
        })
      )
    ).toBeNull();

    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          celestialEventMode: 'eclipse',
        })
      )
    ).toEqual(
      expect.objectContaining({
        celestialEventMode: 'eclipse',
      })
    );
  });

  it('rejects malformed frozen time and heading values', () => {
    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          cameraPitch: 'up',
        })
      )
    ).toBeNull();

    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          timeFrozen: 'yes',
        })
      )
    ).toBeNull();

    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          compassHeadingAngle: 'north',
        })
      )
    ).toBeNull();

    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          playerLevel: 'high',
        })
      )
    ).toBeNull();

    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          playerProfession: 42,
        })
      )
    ).toBeNull();

    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          completedQuestIds: ['tower:1', 7],
        })
      )
    ).toBeNull();

    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          playerPlacedPois: [{ x: 1 }],
        })
      )
    ).toBeNull();
  });

  it('accepts nested character profiles for character-storage migration', () => {
    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          characterProfile: {
            player: { x: 1, y: 2, facing: 0.5 },
            stack: [{ id: 'overworld', depth: 0 }],
            worldSeed: 'migrated-seed',
            playerLevel: 0,
            playerProfession: 'courier',
            completedQuestIds: ['quest:one'],
            playerPlacedPois: [],
          },
        })
      )
    ).toEqual(
      expect.objectContaining({
        characterProfile: expect.objectContaining({
          worldSeed: 'migrated-seed',
          playerLevel: DEFAULT_PLAYER_LEVEL,
          playerProfession: 'courier',
          completedQuestIds: ['quest:one'],
        }),
      })
    );
  });

  it('restores the same season and moon phase from the saved world time offset', () => {
    const savedOffsetMs = DEFAULT_DAY_LENGTH_MS * 17.5;
    const raw = serializeSessionSnapshot({
      player: {
        x: 0,
        y: 0,
        facing: 0,
      },
      packIds: ['default-content-pack'],
      stack: [{ id: 'overworld', depth: 0 }],
      viewMode: '2d',
      worldSeed: 'season-seed',
      timekeeperDisplayMode: 'time-date',
      compassDisplayMode: 'letters',
      minimapDisplayMode: 'hidden',
      minimapZoom: 1,
      timeOffsetMs: savedOffsetMs,
      timeFrozen: false,
      frozenWorldTimeMs: null,
      inspectorTab: 'timekeeper',
      modelPreviewMode: 'world',
      celestialEventMode: 'auto',
      compassHeadingAngle: null,
      cameraPitch: -0.08,
      playerLevel: 3,
      completedQuestIds: [],
      playerPlacedPois: [],
    });

    const parsed = parseSavedSession(raw);
    const expectedCycle = getDaylightCycleState(savedOffsetMs);
    const restoredCycle = getDaylightCycleState(parsed?.timeOffsetMs ?? 0);

    expect(restoredCycle.activeConstellation.name).toBe(
      expectedCycle.activeConstellation.name
    );
    expect(restoredCycle.moonPhaseName).toBe(expectedCycle.moonPhaseName);
    expect(restoredCycle.dayProgress).toBe(expectedCycle.dayProgress);
  });

  it('normalizes saved player level values into the supported range', () => {
    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          playerLevel: 0,
        })
      )
    ).toEqual(
      expect.objectContaining({
        playerLevel: DEFAULT_PLAYER_LEVEL,
      })
    );
  });
});
