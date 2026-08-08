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
  return roster;
}

export function setActivePlayerCharacters(
  roster: PlayerCharacterRosterSnapshot,
  activeCharacterIds: readonly string[]
): PlayerCharacterRosterSnapshot {
  const activeIdSet = new Set(activeCharacterIds);
  return {
    activeCharacterIds: [...activeCharacterIds],
    characters: roster.characters.map((character) => ({
      ...character,
      availability: activeIdSet.has(character.id) ? 'active' : character.availability,
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
  const remainingActiveIds = roster.activeCharacterIds.filter((id) => id !== characterId);
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
  characterId: string
): PlayerCharacterRosterSnapshot {
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
