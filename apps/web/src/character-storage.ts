import {
  parsePlayerPlacedPois,
  type PlayerPlacedPoiLike,
} from '@bworlds/runtime-player-poi';
import { normalizePlayerLevel } from './player-progression.ts';
import {
  parsePlayerCharacterRoster,
  type CharacterWorldContext,
  type PlayerCharacterRosterSnapshot,
} from './player-character-roster.ts';

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
  characterRoster?: PlayerCharacterRosterSnapshot;
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
  characterRoster: PlayerCharacterRosterSnapshot;
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
        parsed.completedQuestIds.some(
          (value: unknown) => typeof value !== 'string'
        ))
    ) {
      return null;
    }
    if (
      typeof parsed?.playerPlacedPois !== 'undefined' &&
      parsePlayerPlacedPois(parsed.playerPlacedPois) === null
    ) {
      return null;
    }
    if (
      typeof parsed?.characterRoster !== 'undefined' &&
      parsePlayerCharacterRoster(parsed.characterRoster) === null
    ) {
      return null;
    }

    if (typeof parsed?.playerPlacedPois !== 'undefined') {
      parsed.playerPlacedPois = parsePlayerPlacedPois(parsed.playerPlacedPois);
    }
    if (typeof parsed?.characterRoster !== 'undefined') {
      parsed.characterRoster = parsePlayerCharacterRoster(
        parsed.characterRoster
      );
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
