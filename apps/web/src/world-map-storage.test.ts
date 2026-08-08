import { describe, expect, it } from 'vitest';
import {
  createLocalWorldMapStorage,
  parseSavedWorldMapProfile,
  serializeWorldMapProfile,
} from './world-map-storage.ts';

describe('world map storage', () => {
  it('round-trips persisted player-built poi changes', () => {
    const raw = serializeWorldMapProfile({
      playerPlacedPois: [
        {
          x: 4,
          y: 5,
          kind: 'observatory',
          note: 'A newly raised observatory opens its dome to the sky above.',
          poi: { type: 'observatory', name: 'Spec Dome' },
        },
      ],
    });

    expect(parseSavedWorldMapProfile(raw)).toEqual({
      playerPlacedPois: [
        {
          x: 4,
          y: 5,
          kind: 'observatory',
          note: 'A newly raised observatory opens its dome to the sky above.',
          poi: { type: 'observatory', name: 'Spec Dome' },
        },
      ],
    });
  });

  it('rejects malformed world-map change payloads', () => {
    expect(
      parseSavedWorldMapProfile(
        JSON.stringify({
          playerPlacedPois: [{ x: 1 }],
        })
      )
    ).toBeNull();
  });

  it('persists profiles through the local world-map storage adapter', () => {
    const values = new Map<string, string>();
    const storage = createLocalWorldMapStorage(
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
      'bworlds:world-map'
    );

    storage.saveProfile({
      playerPlacedPois: [
        {
          x: 1,
          y: 2,
          kind: 'town',
          note: 'A newly founded settlement takes shape here.',
          poi: { type: 'town', name: 'Newford' },
        },
      ],
    });

    expect(storage.loadProfile()).toEqual({
      playerPlacedPois: [
        {
          x: 1,
          y: 2,
          kind: 'town',
          note: 'A newly founded settlement takes shape here.',
          poi: { type: 'town', name: 'Newford' },
        },
      ],
    });

    storage.clearProfile();
    expect(storage.loadProfile()).toBeNull();
  });
});
