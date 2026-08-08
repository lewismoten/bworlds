import type { TileLike, WorldActionLike, WorldStateLike } from '@bworlds/plugin-api';

type PromptState = Pick<
  WorldStateLike,
  'getCurrentMap' | 'getCurrentTile' | 'getCurrentContext'
> & {
  player: { x: number; y: number };
};

export function getInteractionPrompt(state: PromptState): string {
  const tile = state.getCurrentTile(state.player.x, state.player.y);
  const map = state.getCurrentMap?.();
  const action =
    (map?.getAction?.(state.player.x, state.player.y, state as WorldStateLike) as
      | WorldActionLike
      | null
      | undefined) ?? null;
  const exit =
    (map?.getExit?.(state.player.x, state.player.y) as WorldActionLike | null | undefined) ??
    null;

  if (exit) {
    return buildExitPrompt(tile, state.getCurrentContext().label);
  }
  if (action) {
    return buildActionPrompt(tile, action);
  }
  return '';
}

function buildActionPrompt(tile: TileLike, action: WorldActionLike): string {
  if (action.type === 'deepen') {
    return 'Press Enter to go deeper';
  }
  if (action.type !== 'enter') {
    return '';
  }

  const destinationLabel =
    (typeof action.context?.label === 'string' && action.context.label) ||
    tile.poi?.name ||
    describeTile(tile);
  if (tile.kind === 'npc' || tile.poi?.type === 'npc') {
    return `Press Enter to talk to ${destinationLabel}`;
  }
  if (tile.kind === 'door') {
    return `Press Enter to enter ${destinationLabel}`;
  }
  return `Press Enter to enter ${destinationLabel}`;
}

function buildExitPrompt(tile: TileLike, contextLabel: string): string {
  if (tile.kind === 'door') {
    return `Press X to exit ${contextLabel}`;
  }
  return 'Press X to exit';
}

function describeTile(tile: TileLike): string {
  if (tile.poi?.name) {
    return tile.poi.name;
  }
  if (tile.poi?.type) {
    return tile.poi.type;
  }
  return tile.kind;
}
