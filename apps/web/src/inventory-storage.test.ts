import { describe, expect, it } from 'vitest';
import {
  createLocalInventoryStorage,
  parseSavedInventoryProfile,
  serializeInventoryProfile,
} from './inventory-storage.ts';

describe('inventory storage', () => {
  it('round-trips persisted inventory items', () => {
    const raw = serializeInventoryProfile({
      items: [
        { id: 'rope', quantity: 2, label: 'Coil of Rope', kind: 'gear' },
        { id: 'torch', quantity: 5, label: 'Torch', kind: 'supply' },
      ],
    });

    expect(parseSavedInventoryProfile(raw)).toEqual({
      items: [
        { id: 'rope', quantity: 2, label: 'Coil of Rope', kind: 'gear' },
        { id: 'torch', quantity: 5, label: 'Torch', kind: 'supply' },
      ],
    });
  });

  it('preserves custom inventory payloads such as treasure-map documents', () => {
    const raw = serializeInventoryProfile({
      items: [
        {
          id: 'treasure:one',
          quantity: 1,
          label: 'Treasure Map N9 E17',
          kind: 'treasure-map',
          treasureMap: {
            gpsLabel: 'N9 E17',
            rows: ['..:X', '.::.', '....'],
          },
        },
      ],
    });

    expect(parseSavedInventoryProfile(raw)).toEqual({
      items: [
        {
          id: 'treasure:one',
          quantity: 1,
          label: 'Treasure Map N9 E17',
          kind: 'treasure-map',
          treasureMap: {
            gpsLabel: 'N9 E17',
            rows: ['..:X', '.::.', '....'],
          },
        },
      ],
    });
  });

  it('rejects malformed inventory items and normalizes quantities', () => {
    expect(
      parseSavedInventoryProfile(
        JSON.stringify({
          items: [{ id: 'rope', quantity: 0 }],
        })
      )
    ).toBeNull();

    expect(
      parseSavedInventoryProfile(
        JSON.stringify({
          items: [{ id: 'torch', quantity: 2.7 }],
        })
      )
    ).toEqual({
      items: [{ id: 'torch', quantity: 3 }],
    });
  });

  it('persists profiles through the local inventory storage adapter', () => {
    const values = new Map<string, string>();
    const storage = createLocalInventoryStorage(
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
      'bworlds:inventory'
    );

    storage.saveProfile({
      items: [{ id: 'provisions', quantity: 4, label: 'Trail Provisions' }],
    });

    expect(storage.loadProfile()).toEqual({
      items: [{ id: 'provisions', quantity: 4, label: 'Trail Provisions' }],
    });

    storage.clearProfile();
    expect(storage.loadProfile()).toBeNull();
  });
});
