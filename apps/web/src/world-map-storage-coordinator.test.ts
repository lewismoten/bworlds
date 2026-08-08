import { describe, expect, it } from 'vitest';
import {
  createLocalWorldMapStorage,
  createWorldMapStorageCoordinator,
  mergeWorldMapProfilesByPreference,
  normalizePreferredWorldMapServerIds,
  parsePreferredWorldMapServerIds,
  type WorldMapStorageLike,
} from './world-map-storage.ts';

function createMemoryWorldMapStorage(key = 'world-map'): WorldMapStorageLike {
  const values = new Map<string, string>();
  return createLocalWorldMapStorage(
    {
      getItem(storageKey) {
        return values.get(storageKey) ?? null;
      },
      setItem(storageKey, value) {
        values.set(storageKey, value);
      },
      removeItem(storageKey) {
        values.delete(storageKey);
      },
    },
    key
  );
}

describe('world map storage coordinator', () => {
  it('keeps local-only play optional by defaulting to a single local provider', () => {
    const localStorage = createMemoryWorldMapStorage();
    localStorage.saveProfile({
      playerPlacedPois: [
        {
          x: 2,
          y: 3,
          kind: 'town',
          note: 'A local-only frontier town rises here.',
          poi: { type: 'town', name: 'Solo Camp' },
        },
      ],
      preferredServerIds: ['local'],
    });
    const coordinator = createWorldMapStorageCoordinator({
      settingsStorage: localStorage,
      providers: [{ id: 'local', storage: localStorage }],
    });

    expect(coordinator.loadProfile()).toEqual({
      playerPlacedPois: [
        {
          x: 2,
          y: 3,
          kind: 'town',
          note: 'A local-only frontier town rises here.',
          poi: { type: 'town', name: 'Solo Camp' },
        },
      ],
      preferredServerIds: ['local'],
    });
    expect(coordinator.getPreferredServerIds?.()).toEqual(['local']);
  });

  it('normalizes player server preferences into a stable order', () => {
    expect(
      normalizePreferredWorldMapServerIds(
        ['guild-b', 'local', 'guild-b', 'missing'],
        ['local', 'guild-a', 'guild-b']
      )
    ).toEqual(['guild-b', 'local', 'guild-a']);
  });

  it('merges overlapping poi changes by player preference order', () => {
    expect(
      mergeWorldMapProfilesByPreference(
        [
          {
            serverId: 'local',
            profile: {
              playerPlacedPois: [
                {
                  x: 8,
                  y: 5,
                  kind: 'town',
                  note: 'A local workshop district grows here.',
                  poi: { type: 'town', name: 'Copperfield' },
                },
              ],
            },
          },
          {
            serverId: 'guild',
            profile: {
              playerPlacedPois: [
                {
                  x: 8,
                  y: 5,
                  kind: 'lighthouse',
                  note: 'A guild lighthouse claims the same overworld cell.',
                  poi: { type: 'lighthouse', name: 'Brightmark' },
                },
                {
                  x: 10,
                  y: 6,
                  kind: 'quarry',
                  note: 'A stone quarry expands nearby.',
                  poi: { type: 'quarry', name: 'Stonewake' },
                },
              ],
            },
          },
        ],
        ['guild', 'local']
      )
    ).toEqual({
      playerPlacedPois: [
        {
          x: 8,
          y: 5,
          kind: 'lighthouse',
          note: 'A guild lighthouse claims the same overworld cell.',
          poi: { type: 'lighthouse', name: 'Brightmark' },
        },
        {
          x: 10,
          y: 6,
          kind: 'quarry',
          note: 'A stone quarry expands nearby.',
          poi: { type: 'quarry', name: 'Stonewake' },
        },
      ],
      preferredServerIds: ['guild', 'local'],
    });
  });

  it('stores preferred server ids in the coordinator settings profile', () => {
    const settingsStorage = createMemoryWorldMapStorage('settings');
    const guildStorage = createMemoryWorldMapStorage('guild');
    const coordinator = createWorldMapStorageCoordinator({
      settingsStorage,
      providers: [
        { id: 'local', storage: settingsStorage },
        { id: 'guild', storage: guildStorage },
      ],
    });

    coordinator.saveProfile({
      playerPlacedPois: [],
      preferredServerIds: ['guild', 'local'],
    });

    expect(settingsStorage.loadProfile()).toEqual({
      playerPlacedPois: [],
      preferredServerIds: ['guild', 'local'],
    });
  });

  it('rejects malformed preferred world-map server ids', () => {
    expect(parsePreferredWorldMapServerIds(['local', 4])).toBeNull();
    expect(parsePreferredWorldMapServerIds('local')).toBeNull();
  });
});
