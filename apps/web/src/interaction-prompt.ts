import type {
  TileLike,
  WorldActionLike,
  WorldMapLike,
  WorldStateLike,
} from '@bworlds/plugin-api';

type PromptState = Pick<
  WorldStateLike,
  'getCurrentMap' | 'getCurrentTile' | 'getCurrentContext'
> & {
  player: { x: number; y: number };
};

type ResolvedPromptState = {
  map?: WorldMapLike | null;
  player: { x: number; y: number };
  tile: TileLike;
  contextLabel: string;
};

export function getInteractionPrompt(state: PromptState): string {
  return getInteractionPromptFromResolvedState({
    map: state.getCurrentMap(),
    player: state.player,
    tile: state.getCurrentTile(state.player.x, state.player.y),
    contextLabel: state.getCurrentContext().label,
  });
}

export function getInteractionPromptFromResolvedState(
  state: ResolvedPromptState
): string {
  const map = state.map ?? null;
  const action =
    (map?.getAction?.(
      state.player.x,
      state.player.y,
      state as unknown as WorldStateLike
    ) as WorldActionLike | null | undefined) ?? null;
  const exit =
    (map?.getExit?.(state.player.x, state.player.y) as
      WorldActionLike | null | undefined) ?? null;

  if (exit) {
    return buildExitPrompt(state.tile, state.contextLabel);
  }
  if (action) {
    return buildActionPrompt(state.tile, action);
  }
  return '';
}

function buildActionPrompt(tile: TileLike, action: WorldActionLike): string {
  if (action.type === 'deepen') {
    const destinationLabel =
      (typeof action.context?.label === 'string' && action.context.label) ||
      tile.poi?.name ||
      describeTile(tile);
    return `Press Enter to descend into ${destinationLabel}`;
  }
  if (action.type === 'inspect') {
    const targetLabel =
      (typeof action.label === 'string' && action.label) ||
      (typeof action.context?.label === 'string' && action.context.label) ||
      describeTile(tile);
    return `Press Enter to inspect ${targetLabel}`;
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
