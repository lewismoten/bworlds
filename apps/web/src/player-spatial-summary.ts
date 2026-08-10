import { snapWorldCoordinate, toGps } from '@bworlds/core';
import type {
  TileLike,
  WorldContextLike,
  WorldStateLike,
} from '@bworlds/plugin-api';

export type PlayerSpatialSummary = {
  context: WorldContextLike;
  tile: TileLike;
  gps: ReturnType<typeof toGps>;
  gridX: number;
  gridY: number;
  playerX: number;
  playerY: number;
  facing: number;
};

type SpatialState = Pick<
  WorldStateLike,
  'getCurrentContext' | 'getCurrentTile'
> & {
  player: {
    x: number;
    y: number;
    facing: number;
  };
};

export function getPlayerSpatialSummary(
  state: SpatialState
): PlayerSpatialSummary {
  return {
    context: state.getCurrentContext(),
    tile: state.getCurrentTile(),
    gps: toGps(state.player.x, state.player.y),
    gridX: snapWorldCoordinate(state.player.x),
    gridY: snapWorldCoordinate(state.player.y),
    playerX: state.player.x,
    playerY: state.player.y,
    facing: state.player.facing,
  };
}
