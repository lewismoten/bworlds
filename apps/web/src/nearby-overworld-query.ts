import { snapWorldCoordinate } from '@bworlds/core';
import type { WorldContextLike, WorldStateLike } from '@bworlds/plugin-api';

export type NearbyOverworldQueryState = {
  centerX: number;
  centerY: number;
  contextId: string;
};

type NearbyOverworldState = Pick<WorldStateLike, 'getCurrentContext'> & {
  player: {
    x: number;
    y: number;
  };
};

export function getNearbyOverworldQueryState(
  state: NearbyOverworldState
): NearbyOverworldQueryState | null {
  const context = state.getCurrentContext() as WorldContextLike;
  if (context.type !== 'overworld') {
    return null;
  }

  return {
    centerX: snapWorldCoordinate(state.player.x),
    centerY: snapWorldCoordinate(state.player.y),
    contextId: context.id,
  };
}

export function createNearbyOverworldQueryStateCache<
  TState extends NearbyOverworldState,
>(
  resolveQueryState: (state: TState) => NearbyOverworldQueryState | null
): (state: TState) => NearbyOverworldQueryState | null {
  let cachedState: TState | null = null;
  let cachedContextId = '';
  let cachedPlayerX = Number.NaN;
  let cachedPlayerY = Number.NaN;
  let cachedQueryState: NearbyOverworldQueryState | null = null;

  return (state) => {
    const contextId = state.getCurrentContext().id ?? '';
    if (
      cachedState === state &&
      cachedQueryState &&
      cachedContextId === contextId &&
      cachedPlayerX === state.player.x &&
      cachedPlayerY === state.player.y
    ) {
      return cachedQueryState;
    }

    cachedState = state;
    cachedContextId = contextId;
    cachedPlayerX = state.player.x;
    cachedPlayerY = state.player.y;
    cachedQueryState = resolveQueryState(state);
    return cachedQueryState;
  };
}
