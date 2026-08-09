import type { PlayerSpatialSummary } from './player-spatial-summary.ts';

type CachedPlayerSpatialState = {
  player: {
    x: number;
    y: number;
    facing: number;
  };
  getCurrentContext(): { id?: string };
};

type PlayerSpatialSummaryResolver<TState extends CachedPlayerSpatialState> = (
  state: TState
) => PlayerSpatialSummary;

export function createPlayerSpatialSummaryCache<
  TState extends CachedPlayerSpatialState,
>(
  resolveSummary: PlayerSpatialSummaryResolver<TState>
): (state: TState) => PlayerSpatialSummary {
  let cachedState: TState | null = null;
  let cachedContextId = '';
  let cachedPlayerX = Number.NaN;
  let cachedPlayerY = Number.NaN;
  let cachedFacing = Number.NaN;
  let cachedSummary: PlayerSpatialSummary | null = null;

  return (state) => {
    const contextId = state.getCurrentContext().id ?? '';
    if (
      cachedState === state &&
      cachedSummary &&
      cachedContextId === contextId &&
      cachedPlayerX === state.player.x &&
      cachedPlayerY === state.player.y &&
      cachedFacing === state.player.facing
    ) {
      return cachedSummary;
    }

    cachedState = state;
    cachedContextId = contextId;
    cachedPlayerX = state.player.x;
    cachedPlayerY = state.player.y;
    cachedFacing = state.player.facing;
    cachedSummary = resolveSummary(state);
    return cachedSummary;
  };
}
