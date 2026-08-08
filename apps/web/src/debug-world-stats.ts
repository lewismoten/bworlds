import { getTownNpcPlacements } from '@bworlds/town-support';
import type { WorldContextLike, WorldStateLike } from '@bworlds/plugin-api';

type CharacterRosterLike = {
  characters: Array<{
    availability: 'active' | 'available' | 'dropped';
  }>;
};

type DebugWorldStateLike = Pick<WorldStateLike, 'getCurrentContext' | 'timeMs'> & {
  activeCharacterIds?: string[];
  characterRoster?: CharacterRosterLike;
};

export type DebugWorldStats = {
  activeNpcCount: number;
  fullSimulationEntityCount: number;
  reducedSimulationEntityCount: number;
};

export function getDebugWorldStats(state: DebugWorldStateLike): DebugWorldStats {
  const activePartyCount = Array.isArray(state.activeCharacterIds)
    ? state.activeCharacterIds.length
    : 1;
  const activeNpcCount = getContextActiveNpcCount(state.getCurrentContext(), state.timeMs);
  const reducedSimulationEntityCount =
    state.characterRoster?.characters.filter(
      (character) => character.availability === 'available'
    ).length ?? 0;

  return {
    activeNpcCount,
    fullSimulationEntityCount: activePartyCount + activeNpcCount,
    reducedSimulationEntityCount,
  };
}

function getContextActiveNpcCount(
  context: WorldContextLike,
  timeMs: number | undefined
): number {
  if (
    (context.type !== 'town' && context.type !== 'building') ||
    typeof context.origin?.x !== 'number' ||
    typeof context.origin?.y !== 'number'
  ) {
    return 0;
  }

  return getTownNpcPlacements(context.origin.x, context.origin.y, timeMs ?? 0).length;
}
