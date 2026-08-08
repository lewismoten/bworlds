import type { WorldActionLike, WorldStateLike } from '@bworlds/plugin-api';

type AutoEnterState = Pick<
  WorldStateLike,
  'getCurrentContext' | 'getCurrentTile' | 'getCurrentMap' | 'interact'
> & {
  player: { x: number; y: number; facing: number };
};

export function shouldAutoEnterOnArrival(
  state: AutoEnterState,
  action: WorldActionLike | null
): boolean {
  if (state.getCurrentContext().type !== 'overworld') {
    return false;
  }

  const currentTile = state.getCurrentTile(state.player.x, state.player.y);
  if (currentTile.kind !== 'town' && currentTile.poi?.type !== 'town') {
    return false;
  }

  return action?.type === 'enter' && action.context?.type === 'town';
}

export function attemptAutoEnterOverworldPoi(state: AutoEnterState): boolean {
  const action =
    (state
      .getCurrentMap?.()
      ?.getAction?.(
        state.player.x,
        state.player.y,
        state as WorldStateLike
      ) as WorldActionLike | null) ??
    null;
  if (!shouldAutoEnterOnArrival(state, action)) {
    return false;
  }
  return state.interact();
}
