import { normalizePlayerLevel } from './player-progression.ts';

export type CharacterWorldContext = {
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

export type PlayerCharacterRosterMember = {
  id: string;
  name: string;
  player: {
    x: number;
    y: number;
    facing: number;
  };
  stack: CharacterWorldContext[];
  worldSeed: string;
  playerLevel: number;
  playerProfession?: string;
  completedQuestIds: string[];
  availability: 'active' | 'available' | 'dropped';
  recruitedNpcId?: string;
};

export type PlayerCharacterRosterSnapshot = {
  characters: PlayerCharacterRosterMember[];
  activeCharacterIds: string[];
};

export const DEFAULT_MAX_ACTIVE_PLAYER_CHARACTERS = 4;

export function parsePlayerCharacterRoster(
  value: unknown
): PlayerCharacterRosterSnapshot | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const roster = value as {
    characters?: unknown;
    activeCharacterIds?: unknown;
  };
  if (!Array.isArray(roster.characters) || !Array.isArray(roster.activeCharacterIds)) {
    return null;
  }
  const characters = new Array<PlayerCharacterRosterMember>();
  const seenIds = new Set<string>();
  for (const entry of roster.characters) {
    const member = parsePlayerCharacterRosterMember(entry);
    if (!member || seenIds.has(member.id)) {
      return null;
    }
    seenIds.add(member.id);
    characters.push(member);
  }
  const activeCharacterIds = new Array<string>();
  for (const entry of roster.activeCharacterIds) {
    if (typeof entry !== 'string' || !seenIds.has(entry) || activeCharacterIds.includes(entry)) {
      return null;
    }
    activeCharacterIds.push(entry);
  }
  return {
    characters,
    activeCharacterIds,
  };
}

function parsePlayerCharacterRosterMember(
  value: unknown
): PlayerCharacterRosterMember | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const member = value as Record<string, unknown>;
  const player =
    member.player && typeof member.player === 'object'
      ? (member.player as Record<string, unknown>)
      : null;
  if (
    typeof member.id !== 'string' ||
    typeof member.name !== 'string' ||
    typeof member.worldSeed !== 'string' ||
    typeof player?.x !== 'number' ||
    typeof player?.y !== 'number' ||
    typeof player?.facing !== 'number' ||
    !Array.isArray(member.stack) ||
    member.stack.length === 0 ||
    (member.availability !== 'active' &&
      member.availability !== 'available' &&
      member.availability !== 'dropped')
  ) {
    return null;
  }
  if (
    typeof member.playerProfession !== 'undefined' &&
    typeof member.playerProfession !== 'string'
  ) {
    return null;
  }
  if (
    typeof member.recruitedNpcId !== 'undefined' &&
    typeof member.recruitedNpcId !== 'string'
  ) {
    return null;
  }
  if (
    !Array.isArray(member.completedQuestIds) ||
    member.completedQuestIds.some((entry) => typeof entry !== 'string')
  ) {
    return null;
  }
  return {
    id: member.id,
    name: member.name,
    player: {
      x: player.x,
      y: player.y,
      facing: player.facing,
    },
    stack: member.stack as CharacterWorldContext[],
    worldSeed: member.worldSeed,
    playerLevel: normalizePlayerLevel(
      typeof member.playerLevel === 'number' ? member.playerLevel : undefined
    ),
    playerProfession: member.playerProfession as string | undefined,
    completedQuestIds: [...(member.completedQuestIds as string[])],
    availability: member.availability,
    recruitedNpcId: member.recruitedNpcId as string | undefined,
  };
}

export function createPrimaryPlayerCharacterRoster(options: {
  id?: string;
  name?: string;
  player: PlayerCharacterRosterMember['player'];
  stack: CharacterWorldContext[];
  worldSeed: string;
  playerLevel: number;
  playerProfession?: string;
  completedQuestIds?: string[];
}): PlayerCharacterRosterSnapshot {
  const id = options.id?.trim() || 'player';
  return {
    characters: [
      {
        id,
        name: options.name?.trim() || 'Player',
        player: { ...options.player },
        stack: [...options.stack],
        worldSeed: options.worldSeed,
        playerLevel: normalizePlayerLevel(options.playerLevel),
        playerProfession: options.playerProfession,
        completedQuestIds: [...(options.completedQuestIds ?? [])],
        availability: 'active',
      },
    ],
    activeCharacterIds: [id],
  };
}

export function ensurePlayerCharacterRoster(
  roster: PlayerCharacterRosterSnapshot | null,
  fallback: Parameters<typeof createPrimaryPlayerCharacterRoster>[0]
): PlayerCharacterRosterSnapshot {
  if (!roster || roster.characters.length === 0 || roster.activeCharacterIds.length === 0) {
    return createPrimaryPlayerCharacterRoster(fallback);
  }
  return normalizePlayerCharacterRoster(roster);
}

export function setActivePlayerCharacters(
  roster: PlayerCharacterRosterSnapshot,
  activeCharacterIds: readonly string[],
  options?: {
    maxActiveCharacterCount?: number;
  }
): PlayerCharacterRosterSnapshot {
  const maxActiveCharacterCount = normalizeMaxActiveCharacterCount(
    options?.maxActiveCharacterCount
  );
  const playableIds = new Set(
    roster.characters
      .filter((character) => character.availability !== 'dropped')
      .map((character) => character.id)
  );
  const nextActiveCharacterIds = new Array<string>();
  for (const characterId of activeCharacterIds) {
    if (
      !playableIds.has(characterId) ||
      nextActiveCharacterIds.includes(characterId) ||
      nextActiveCharacterIds.length >= maxActiveCharacterCount
    ) {
      continue;
    }
    nextActiveCharacterIds.push(characterId);
  }
  if (nextActiveCharacterIds.length === 0) {
    const fallbackCharacterId = resolveFallbackActiveCharacterId(roster);
    if (fallbackCharacterId) {
      nextActiveCharacterIds.push(fallbackCharacterId);
    }
  }
  const activeIdSet = new Set(nextActiveCharacterIds);
  return {
    activeCharacterIds: nextActiveCharacterIds,
    characters: roster.characters.map((character) => ({
      ...character,
      availability: activeIdSet.has(character.id)
        ? 'active'
        : character.availability === 'dropped'
          ? 'dropped'
          : 'available',
    })),
  };
}

export function syncPrimaryPlayerCharacter(
  roster: PlayerCharacterRosterSnapshot,
  profile: {
    player: PlayerCharacterRosterMember['player'];
    stack: CharacterWorldContext[];
    worldSeed: string;
    playerLevel: number;
    playerProfession?: string;
    completedQuestIds?: string[];
  }
): PlayerCharacterRosterSnapshot {
  const primaryCharacterId = roster.activeCharacterIds[0] ?? roster.characters[0]?.id ?? 'player';
  return {
    activeCharacterIds:
      roster.activeCharacterIds.length > 0 ? [...roster.activeCharacterIds] : [primaryCharacterId],
    characters: roster.characters.map((character) =>
      character.id === primaryCharacterId
        ? {
            ...character,
            player: { ...profile.player },
            stack: [...profile.stack],
            worldSeed: profile.worldSeed,
            playerLevel: normalizePlayerLevel(profile.playerLevel),
            playerProfession: profile.playerProfession,
            completedQuestIds: [...(profile.completedQuestIds ?? [])],
            availability: 'active',
          }
        : character
    ),
  };
}

export function dropOffPlayerCharacter(
  roster: PlayerCharacterRosterSnapshot,
  characterId: string
): PlayerCharacterRosterSnapshot {
  if (!roster.activeCharacterIds.includes(characterId)) {
    return roster;
  }
  const remainingActiveIds = roster.activeCharacterIds.filter((id) => id !== characterId);
  if (remainingActiveIds.length === 0) {
    return roster;
  }
  return {
    activeCharacterIds: remainingActiveIds,
    characters: roster.characters.map((character) =>
      character.id === characterId
        ? {
            ...character,
            availability: 'dropped',
          }
        : character
    ),
  };
}

export function pickUpPlayerCharacter(
  roster: PlayerCharacterRosterSnapshot,
  characterId: string,
  options?: {
    maxActiveCharacterCount?: number;
  }
): PlayerCharacterRosterSnapshot {
  const maxActiveCharacterCount = normalizeMaxActiveCharacterCount(
    options?.maxActiveCharacterCount
  );
  const character = roster.characters.find((entry) => entry.id === characterId);
  if (!character || roster.activeCharacterIds.includes(characterId)) {
    return roster;
  }
  if (roster.activeCharacterIds.length >= maxActiveCharacterCount) {
    return roster;
  }
  const nextActiveIds = roster.activeCharacterIds.includes(characterId)
    ? roster.activeCharacterIds
    : [...roster.activeCharacterIds, characterId];
  return {
    activeCharacterIds: nextActiveIds,
    characters: roster.characters.map((character) =>
      character.id === characterId
        ? {
            ...character,
            availability: 'active',
          }
        : character
    ),
  };
}

export function recruitNpcAsPlayerCharacter(
  roster: PlayerCharacterRosterSnapshot,
  recruit: {
    id: string;
    name: string;
    player: PlayerCharacterRosterMember['player'];
    stack: CharacterWorldContext[];
    worldSeed: string;
    playerLevel?: number;
    playerProfession?: string;
    completedQuestIds?: string[];
    recruitedNpcId: string;
  }
): PlayerCharacterRosterSnapshot {
  if (roster.characters.some((character) => character.id === recruit.id)) {
    return roster;
  }
  return {
    activeCharacterIds: [...roster.activeCharacterIds],
    characters: [
      ...roster.characters,
      {
        id: recruit.id,
        name: recruit.name,
        player: { ...recruit.player },
        stack: [...recruit.stack],
        worldSeed: recruit.worldSeed,
        playerLevel: normalizePlayerLevel(recruit.playerLevel),
        playerProfession: recruit.playerProfession,
        completedQuestIds: [...(recruit.completedQuestIds ?? [])],
        availability: 'available',
        recruitedNpcId: recruit.recruitedNpcId,
      },
    ],
  };
}

function normalizePlayerCharacterRoster(
  roster: PlayerCharacterRosterSnapshot,
  maxActiveCharacterCount = DEFAULT_MAX_ACTIVE_PLAYER_CHARACTERS
): PlayerCharacterRosterSnapshot {
  return setActivePlayerCharacters(roster, roster.activeCharacterIds, {
    maxActiveCharacterCount,
  });
}

function normalizeMaxActiveCharacterCount(value?: number): number {
  if (!Number.isFinite(value) || (value ?? 0) < 1) {
    return DEFAULT_MAX_ACTIVE_PLAYER_CHARACTERS;
  }
  return Math.max(1, Math.floor(value ?? DEFAULT_MAX_ACTIVE_PLAYER_CHARACTERS));
}

function resolveFallbackActiveCharacterId(
  roster: PlayerCharacterRosterSnapshot
): string | null {
  const retainedActiveId = roster.activeCharacterIds.find((characterId) =>
    roster.characters.some(
      (character) =>
        character.id === characterId && character.availability !== 'dropped'
    )
  );
  if (retainedActiveId) {
    return retainedActiveId;
  }
  return (
    roster.characters.find((character) => character.availability !== 'dropped')?.id ?? null
  );
}
