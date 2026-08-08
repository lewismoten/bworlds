import { describe, expect, it } from 'vitest';
import {
  createLocalCharacterStorage,
  parseSavedCharacterProfile,
  serializeCharacterProfile,
} from './character-storage.ts';
import { createPrimaryPlayerCharacterRoster } from './player-character-roster.ts';

describe('character storage', () => {
  it('round-trips persisted character profiles with level and quest progress', () => {
    const raw = serializeCharacterProfile({
      player: {
        x: 4.5,
        y: -2.25,
        facing: Math.PI / 4,
      },
      packIds: ['default-content-pack'],
      stack: [{ id: 'overworld', depth: 0, type: 'overworld' }],
      worldSeed: 'character-seed',
      playerLevel: 5,
      playerProfession: 'guard',
      completedQuestIds: ['tower:1', 'cave:2'],
      characterRoster: createPrimaryPlayerCharacterRoster({
        player: {
          x: 4.5,
          y: -2.25,
          facing: Math.PI / 4,
        },
        stack: [{ id: 'overworld', depth: 0, type: 'overworld' }],
        worldSeed: 'character-seed',
        playerLevel: 5,
        playerProfession: 'guard',
        completedQuestIds: ['tower:1', 'cave:2'],
      }),
    });

    expect(parseSavedCharacterProfile(raw)).toEqual(
      expect.objectContaining({
        worldSeed: 'character-seed',
        playerLevel: 5,
        playerProfession: 'guard',
        completedQuestIds: ['tower:1', 'cave:2'],
        characterRoster: expect.objectContaining({
          activeCharacterIds: ['player'],
        }),
      })
    );
  });

  it('rejects malformed profession and completed quest payloads', () => {
    expect(
      parseSavedCharacterProfile(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          playerProfession: 42,
        })
      )
    ).toBeNull();

    expect(
      parseSavedCharacterProfile(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          completedQuestIds: ['tower:1', 2],
        })
      )
    ).toBeNull();

    expect(
      parseSavedCharacterProfile(
        JSON.stringify({
          player: { x: 0, y: 0, facing: 0 },
          stack: [{ id: 'overworld', depth: 0 }],
          characterRoster: {
            characters: [],
            activeCharacterIds: ['player'],
          },
        })
      )
    ).toBeNull();
  });

  it('persists profiles through the local character storage adapter', () => {
    const values = new Map<string, string>();
    const storage = createLocalCharacterStorage(
      {
        getItem(key) {
          return values.get(key) ?? null;
        },
        setItem(key, value) {
          values.set(key, value);
        },
        removeItem(key) {
          values.delete(key);
        },
      },
      'bworlds:character'
    );

    storage.saveProfile({
      player: { x: 2, y: 3, facing: 0.5 },
      packIds: ['default-content-pack'],
      stack: [{ id: 'overworld', depth: 0 }],
      worldSeed: 'adapter-seed',
      playerLevel: 3,
      completedQuestIds: [],
      characterRoster: createPrimaryPlayerCharacterRoster({
        player: { x: 2, y: 3, facing: 0.5 },
        stack: [{ id: 'overworld', depth: 0 }],
        worldSeed: 'adapter-seed',
        playerLevel: 3,
      }),
    });

    expect(storage.loadProfile()).toEqual(
      expect.objectContaining({
        worldSeed: 'adapter-seed',
        playerLevel: 3,
        characterRoster: expect.objectContaining({
          activeCharacterIds: ['player'],
        }),
      })
    );

    storage.clearProfile();
    expect(storage.loadProfile()).toBeNull();
  });
});
