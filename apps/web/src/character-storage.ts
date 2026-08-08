import {
  parsePlayerPlacedPois,
  type PlayerPlacedPoiLike,
} from '@bworlds/runtime-player-poi';
import { normalizePlayerLevel } from './player-progression.ts';

type CharacterWorldContext = {
  id: string;
  depth: number;
  origin?: {
    x: number;
    y: number;
  };
  label?: string;
  type?: string;
  [key: string]: unknown;
};

export type SavedCharacterProfile = {
  player: {
    x: number;
    y: number;
    facing: number;
  };
  packIds?: string[];
  stack: CharacterWorldContext[];
  worldSeed?: string;
  playerLevel?: number;
  playerProfession?: string;
  completedQuestIds?: string[];
  playerPlacedPois?: PlayerPlacedPoiLike[];
};

export type CharacterProfileSnapshot = {
  player: {
    x: number;
    y: number;
    facing: number;
  };
  packIds: string[];
  stack: CharacterWorldContext[];
  worldSeed: string;
  playerLevel: number;
  playerProfession?: string;
  completedQuestIds: string[];
  playerPlacedPois: PlayerPlacedPoiLike[];
};

export type CharacterStorageLike = {
  loadProfile(): SavedCharacterProfile | null;
  saveProfile(profile: CharacterProfileSnapshot): void;
  clearProfile(): void;
};

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function serializeCharacterProfile(
  profile: CharacterProfileSnapshot
): string {
  return JSON.stringify(profile);
}

export function parseSavedCharacterProfile(
  raw: string | null
): SavedCharacterProfile | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.player?.x !== 'number' ||
      typeof parsed?.player?.y !== 'number' ||
      typeof parsed?.player?.facing !== 'number'
    ) {
      return null;
    }
    if (!Array.isArray(parsed?.stack) || parsed.stack.length === 0) {
      return null;
    }
    if (
      typeof parsed?.worldSeed !== 'undefined' &&
      typeof parsed.worldSeed !== 'string'
    ) {
      return null;
    }
    if (
      typeof parsed?.playerLevel !== 'undefined' &&
      typeof parsed.playerLevel !== 'number'
    ) {
      return null;
    }
    if (
      typeof parsed?.playerProfession !== 'undefined' &&
      typeof parsed.playerProfession !== 'string'
    ) {
      return null;
    }
    if (
      typeof parsed?.completedQuestIds !== 'undefined' &&
      (!Array.isArray(parsed.completedQuestIds) ||
        parsed.completedQuestIds.some((value: unknown) => typeof value !== 'string'))
    ) {
      return null;
    }
    if (
      typeof parsed?.playerPlacedPois !== 'undefined' &&
      parsePlayerPlacedPois(parsed.playerPlacedPois) === null
    ) {
      return null;
    }

    if (typeof parsed?.playerPlacedPois !== 'undefined') {
      parsed.playerPlacedPois = parsePlayerPlacedPois(parsed.playerPlacedPois);
    }
    if (typeof parsed?.playerLevel !== 'undefined') {
      parsed.playerLevel = normalizePlayerLevel(parsed.playerLevel);
    }
    return parsed as SavedCharacterProfile;
  } catch {
    return null;
  }
}

export function createLocalCharacterStorage(
  storage: StorageLike,
  key: string
): CharacterStorageLike {
  return {
    loadProfile() {
      return parseSavedCharacterProfile(storage.getItem(key));
    },
    saveProfile(profile) {
      storage.setItem(key, serializeCharacterProfile(profile));
    },
    clearProfile() {
      storage.removeItem(key);
    },
  };
}
