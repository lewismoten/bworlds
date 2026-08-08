import { describe, expect, it } from 'vitest';
import {
  appendWorldMapPoi,
  createLocalWorldMapStorage,
  createWorldMapStorageCoordinator,
  formatWorldMapPoiPublishPrompt,
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

  it('lists only preferred servers that support poi publishing', () => {
    const settingsStorage = createMemoryWorldMapStorage('settings');
    settingsStorage.saveProfile({
      playerPlacedPois: [],
      preferredServerIds: ['guild', 'friends', 'local'],
    });
    const coordinator = createWorldMapStorageCoordinator({
      settingsStorage,
      providers: [
        { id: 'local', label: 'Local Play', storage: createMemoryWorldMapStorage('local') },
        {
          id: 'guild',
          label: 'Guild Atlas',
          storage: createMemoryWorldMapStorage('guild'),
          supportsPoiPublishing: true,
        },
        {
          id: 'friends',
          label: 'Friends Realm',
          storage: createMemoryWorldMapStorage('friends'),
          supportsPoiPublishing: true,
        },
      ],
    });

    expect(coordinator.getPreferredPoiPublishTargets?.()).toEqual([
      { id: 'guild', label: 'Guild Atlas' },
      { id: 'friends', label: 'Friends Realm' },
    ]);
  });

  it('publishes a built poi to preferred publishing servers in order', () => {
    const settingsStorage = createMemoryWorldMapStorage('settings');
    settingsStorage.saveProfile({
      playerPlacedPois: [],
      preferredServerIds: ['guild', 'local', 'friends'],
    });
    const guildStorage = createMemoryWorldMapStorage('guild');
    const friendsStorage = createMemoryWorldMapStorage('friends');
    const coordinator = createWorldMapStorageCoordinator({
      settingsStorage,
      providers: [
        {
          id: 'guild',
          label: 'Guild Atlas',
          storage: guildStorage,
          supportsPoiPublishing: true,
        },
        {
          id: 'local',
          label: 'Local Play',
          storage: createMemoryWorldMapStorage('local'),
        },
        {
          id: 'friends',
          label: 'Friends Realm',
          storage: friendsStorage,
          supportsPoiPublishing: true,
        },
      ],
    });

    const poi = {
      x: 7,
      y: 4,
      kind: 'town' as const,
      note: 'A shared frontier town rises here.',
      poi: { type: 'town' as const, name: 'Northpass' },
    };

    expect(coordinator.publishPoiToPreferredServers?.(poi)).toEqual(['guild', 'friends']);
    expect(guildStorage.loadProfile()?.playerPlacedPois).toEqual([poi]);
    expect(friendsStorage.loadProfile()?.playerPlacedPois).toEqual([poi]);
  });

  it('rejects malformed preferred world-map server ids', () => {
    expect(parsePreferredWorldMapServerIds(['local', 4])).toBeNull();
    expect(parsePreferredWorldMapServerIds('local')).toBeNull();
  });

  it('replaces an older poi entry when publishing the same world cell again', () => {
    const originalPoi = {
      x: 3,
      y: 9,
      kind: 'quarry' as const,
      note: 'An older quarry sits here.',
      poi: { type: 'quarry' as const, name: 'Old Quarry' },
    };
    const replacementPoi = {
      x: 3,
      y: 9,
      kind: 'town' as const,
      note: 'A newer settlement replaces the quarry.',
      poi: { type: 'town' as const, name: 'New Quarry Town' },
    };

    expect(
      appendWorldMapPoi(
        {
          playerPlacedPois: [originalPoi],
          preferredServerIds: ['guild'],
        },
        replacementPoi
      )
    ).toEqual({
      playerPlacedPois: [replacementPoi],
      preferredServerIds: ['guild'],
    });
  });

  it('formats a publish prompt from the available world-map server labels', () => {
    expect(
      formatWorldMapPoiPublishPrompt('Northpass', [
        { id: 'guild', label: 'Guild Atlas' },
        { id: 'friends', label: 'Friends Realm' },
      ])
    ).toBe('Also publish Northpass to Guild Atlas and Friends Realm?');
  });
});
