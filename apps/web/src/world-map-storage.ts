import {
  parsePlayerPlacedPois,
  type PlayerPlacedPoiLike,
} from '@bworlds/runtime-player-poi';

export type SavedWorldMapProfile = {
  playerPlacedPois?: PlayerPlacedPoiLike[];
};

export type WorldMapProfileSnapshot = {
  playerPlacedPois: PlayerPlacedPoiLike[];
};

export type WorldMapStorageLike = {
  loadProfile(): SavedWorldMapProfile | null;
  saveProfile(profile: WorldMapProfileSnapshot): void;
  clearProfile(): void;
};

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function serializeWorldMapProfile(
  profile: WorldMapProfileSnapshot
): string {
  return JSON.stringify(profile);
}

export function parseSavedWorldMapProfile(
  raw: string | null
): SavedWorldMapProfile | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.playerPlacedPois !== 'undefined' &&
      parsePlayerPlacedPois(parsed.playerPlacedPois) === null
    ) {
      return null;
    }
    if (typeof parsed?.playerPlacedPois !== 'undefined') {
      parsed.playerPlacedPois = parsePlayerPlacedPois(parsed.playerPlacedPois);
    }
    return parsed as SavedWorldMapProfile;
  } catch {
    return null;
  }
}

export function createLocalWorldMapStorage(
  storage: StorageLike,
  key: string
): WorldMapStorageLike {
  return {
    loadProfile() {
      return parseSavedWorldMapProfile(storage.getItem(key));
    },
    saveProfile(profile) {
      storage.setItem(key, serializeWorldMapProfile(profile));
    },
    clearProfile() {
      storage.removeItem(key);
    },
  };
}
