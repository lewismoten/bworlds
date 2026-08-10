import { describe, expect, it } from 'vitest';
import { DEFAULT_DAY_LENGTH_MS, getDaylightCycleState } from '@bworlds/core';
import { DEFAULT_PLAYER_LEVEL } from './player-progression.ts';
import {
  parseSavedSession,
  serializeSessionSnapshot,
} from './session-state.ts';

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
      inventoryProfile: {
        items: [
          { id: 'rope', quantity: 2, label: 'Coil of Rope', kind: 'gear' },
        ],
      },
      worldMapProfile: {
        playerPlacedPois: [
          {
            x: 4,
            y: 5,
            kind: 'town',
            note: 'A newly founded settlement takes shape here.',
            poi: { type: 'town', name: 'Spec Town' },
          },
        ],
        preferredServerIds: ['guild', 'local'],
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
      musicEnabled: false,
      soundEnabled: true,
      ambianceEnabled: false,
      runtimePerformanceTrackingEnabled: false,
      categoryVolumes: {
        music: 0.7,
        ui: 0.9,
        speech: 0.6,
        combat: 0.8,
        environment: 0.5,
        creatures: 0.4,
      },
      compassHeadingAngle: -Math.PI / 2,
      cameraPitch: -0.22,
      playerLevel: 4,
      completedQuestIds: ['tower:1'],
      teleportPins: [],
      inventory: [
        { id: 'rope', quantity: 2, label: 'Coil of Rope', kind: 'gear' },
      ],
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
        inventoryProfile: expect.objectContaining({
          items: [
            expect.objectContaining({
              id: 'rope',
            }),
          ],
        }),
        worldMapProfile: expect.objectContaining({
          preferredServerIds: ['guild', 'local'],
          playerPlacedPois: [
            expect.objectContaining({
              kind: 'town',
            }),
          ],
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
        musicEnabled: false,
        soundEnabled: true,
        ambianceEnabled: false,
        runtimePerformanceTrackingEnabled: false,
        categoryVolumes: {
          music: 0.7,
          ui: 0.9,
          speech: 0.6,
          combat: 0.8,
          environment: 0.5,
          creatures: 0.4,
        },
        compassHeadingAngle: -Math.PI / 2,
        cameraPitch: -0.22,
        playerLevel: 4,
        inventory: [
          expect.objectContaining({
            id: 'rope',
          }),
        ],
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
          runtimePerformanceTrackingEnabled: 'off',
        })
      )
    ).toBeNull();

    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          ambianceEnabled: 'off',
        })
      )
    ).toBeNull();

    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          categoryVolumes: 'loud',
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
          musicEnabled: 'off',
        })
      )
    ).toBeNull();

    expect(
      parseSavedSession(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          soundEnabled: 'off',
        })
      )
    ).toBeNull();

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
          inventory: [{ id: 'rope', quantity: 0 }],
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
          inventoryProfile: {
            items: [{ id: 'torch', quantity: 2.2, label: 'Torch' }],
          },
          worldMapProfile: {
            playerPlacedPois: [
              {
                x: 6,
                y: 7,
                kind: 'observatory',
                note: 'A newly raised observatory opens its dome to the sky above.',
                poi: { type: 'observatory', name: 'Skyglass' },
              },
            ],
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
        inventoryProfile: expect.objectContaining({
          items: [{ id: 'torch', quantity: 2, label: 'Torch' }],
        }),
        worldMapProfile: expect.objectContaining({
          playerPlacedPois: [
            expect.objectContaining({
              kind: 'observatory',
            }),
          ],
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
      musicEnabled: true,
      soundEnabled: true,
      ambianceEnabled: true,
      runtimePerformanceTrackingEnabled: true,
      categoryVolumes: {
        music: 1,
        ui: 1,
        speech: 1,
        combat: 1,
        environment: 1,
        creatures: 1,
      },
      teleportPins: [],
      compassHeadingAngle: null,
      cameraPitch: -0.08,
      playerLevel: 3,
      completedQuestIds: [],
      inventory: [],
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
