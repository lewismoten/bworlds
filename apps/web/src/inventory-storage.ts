import type { InventoryItemLike } from '@bworlds/plugin-api';

export type SavedInventoryProfile = {
  items?: InventoryItemLike[];
};

export type InventoryProfileSnapshot = {
  items: InventoryItemLike[];
};

export type InventoryStorageLike = {
  loadProfile(): SavedInventoryProfile | null;
  saveProfile(profile: InventoryProfileSnapshot): void;
  clearProfile(): void;
};

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function serializeInventoryProfile(
  profile: InventoryProfileSnapshot
): string {
  return JSON.stringify(profile);
}

export function parseSavedInventoryProfile(
  raw: string | null
): SavedInventoryProfile | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.items !== 'undefined' &&
      parseInventoryItems(parsed.items) === null
    ) {
      return null;
    }
    if (typeof parsed?.items !== 'undefined') {
      parsed.items = parseInventoryItems(parsed.items);
    }
    return parsed as SavedInventoryProfile;
  } catch {
    return null;
  }
}

export function parseInventoryItems(
  value: unknown
): InventoryItemLike[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items: InventoryItemLike[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      return null;
    }
    const item = entry as InventoryItemLike;
    if (typeof item.id !== 'string' || typeof item.quantity !== 'number') {
      return null;
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      return null;
    }
    if (
      typeof item.label !== 'undefined' &&
      typeof item.label !== 'string'
    ) {
      return null;
    }
    if (
      typeof item.kind !== 'undefined' &&
      typeof item.kind !== 'string'
    ) {
      return null;
    }
    items.push({
      ...item,
      quantity: Math.max(1, Math.round(item.quantity)),
    });
  }
  return items;
}

export function createLocalInventoryStorage(
  storage: StorageLike,
  key: string
): InventoryStorageLike {
  return {
    loadProfile() {
      return parseSavedInventoryProfile(storage.getItem(key));
    },
    saveProfile(profile) {
      storage.setItem(key, serializeInventoryProfile(profile));
    },
    clearProfile() {
      storage.removeItem(key);
    },
  };
}
