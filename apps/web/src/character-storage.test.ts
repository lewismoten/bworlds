import { describe, expect, it } from 'vitest';
import {
  createLocalCharacterStorage,
  parseSavedCharacterProfile,
  serializeCharacterProfile,
} from './character-storage.ts';

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
      playerPlacedPois: [
        {
          x: 3,
          y: 2,
          kind: 'observatory',
          note: 'A newly raised observatory opens its dome to the sky above.',
          poi: { type: 'observatory', name: 'Spec Dome' },
        },
      ],
    });

    expect(parseSavedCharacterProfile(raw)).toEqual(
      expect.objectContaining({
        worldSeed: 'character-seed',
        playerLevel: 5,
        playerProfession: 'guard',
        completedQuestIds: ['tower:1', 'cave:2'],
        playerPlacedPois: [
          expect.objectContaining({
            kind: 'observatory',
          }),
        ],
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
      playerPlacedPois: [],
    });

    expect(storage.loadProfile()).toEqual(
      expect.objectContaining({
        worldSeed: 'adapter-seed',
        playerLevel: 3,
      })
    );

    storage.clearProfile();
    expect(storage.loadProfile()).toBeNull();
  });
});
