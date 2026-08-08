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
