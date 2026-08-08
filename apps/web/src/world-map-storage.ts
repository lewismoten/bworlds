import {
  parsePlayerPlacedPois,
  type PlayerPlacedPoiLike,
} from '@bworlds/runtime-player-poi';

export type SavedWorldMapProfile = {
  playerPlacedPois?: PlayerPlacedPoiLike[];
  preferredServerIds?: string[];
};

export type WorldMapProfileSnapshot = {
  playerPlacedPois: PlayerPlacedPoiLike[];
  preferredServerIds: string[];
};

export type WorldMapStorageLike = {
  loadProfile(): SavedWorldMapProfile | null;
  saveProfile(profile: WorldMapProfileSnapshot): void;
  clearProfile(): void;
  getPreferredServerIds?(): string[];
};

export type WorldMapStorageProviderLike = {
  id: string;
  storage: WorldMapStorageLike;
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
    if (
      typeof parsed?.preferredServerIds !== 'undefined' &&
      parsePreferredWorldMapServerIds(parsed.preferredServerIds) === null
    ) {
      return null;
    }
    if (typeof parsed?.playerPlacedPois !== 'undefined') {
      parsed.playerPlacedPois = parsePlayerPlacedPois(parsed.playerPlacedPois);
    }
    if (typeof parsed?.preferredServerIds !== 'undefined') {
      parsed.preferredServerIds = parsePreferredWorldMapServerIds(
        parsed.preferredServerIds
      );
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

export function parsePreferredWorldMapServerIds(
  value: unknown
): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const ids = new Array<string>();
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== 'string') {
      return null;
    }
    const normalized = entry.trim();
    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }
    ids.push(normalized);
    seen.add(normalized);
  }
  return ids;
}

export function normalizePreferredWorldMapServerIds(
  preferredServerIds: readonly string[],
  availableServerIds: readonly string[]
): string[] {
  const available = new Set(
    availableServerIds.map((serverId) => serverId.trim()).filter(Boolean)
  );
  const ordered = new Array<string>();
  const seen = new Set<string>();
  for (const serverId of preferredServerIds) {
    const normalized = serverId.trim();
    if (normalized.length === 0 || seen.has(normalized) || !available.has(normalized)) {
      continue;
    }
    ordered.push(normalized);
    seen.add(normalized);
  }
  for (const serverId of availableServerIds) {
    const normalized = serverId.trim();
    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }
    ordered.push(normalized);
    seen.add(normalized);
  }
  return ordered;
}

export function mergeWorldMapProfilesByPreference(
  profiles: ReadonlyArray<{
    serverId: string;
    profile: SavedWorldMapProfile | null;
  }>,
  preferredServerIds: readonly string[]
): WorldMapProfileSnapshot | null {
  const normalizedServerIds = normalizePreferredWorldMapServerIds(
    preferredServerIds,
    profiles.map((entry) => entry.serverId)
  );
  const profileById = new Map(
    profiles.map((entry) => [entry.serverId, entry.profile] as const)
  );
  const mergedPois = new Array<PlayerPlacedPoiLike>();
  const seenPoiKeys = new Set<string>();

  normalizedServerIds.forEach((serverId) => {
    const profile = profileById.get(serverId);
    (profile?.playerPlacedPois ?? []).forEach((poi) => {
      const key = `${poi.x}:${poi.y}`;
      if (seenPoiKeys.has(key)) {
        return;
      }
      seenPoiKeys.add(key);
      mergedPois.push(poi);
    });
  });

  if (mergedPois.length === 0 && normalizedServerIds.length === 0) {
    return null;
  }

  return {
    playerPlacedPois: mergedPois,
    preferredServerIds: normalizedServerIds,
  };
}

export function createWorldMapStorageCoordinator({
  settingsStorage,
  providers,
}: {
  settingsStorage: WorldMapStorageLike;
  providers: ReadonlyArray<WorldMapStorageProviderLike>;
}): WorldMapStorageLike {
  const availableServerIds = providers.map((provider) => provider.id);
  const getPreferredServerIds = () =>
    normalizePreferredWorldMapServerIds(
      settingsStorage.loadProfile()?.preferredServerIds ?? availableServerIds,
      availableServerIds
    );

  return {
    loadProfile() {
      return mergeWorldMapProfilesByPreference(
        providers.map((provider) => ({
          serverId: provider.id,
          profile: provider.storage.loadProfile(),
        })),
        getPreferredServerIds()
      );
    },
    saveProfile(profile) {
      settingsStorage.saveProfile({
        playerPlacedPois: [...profile.playerPlacedPois],
        preferredServerIds: normalizePreferredWorldMapServerIds(
          profile.preferredServerIds,
          availableServerIds
        ),
      });
    },
    clearProfile() {
      settingsStorage.clearProfile();
    },
    getPreferredServerIds,
  };
}
