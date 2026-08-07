import type {
  CreateMapContext,
  DecorateBuildingTileContext,
  DecorateDepthTileContext,
  DecorateTownTileContext,
  RuntimePlugin,
  Point,
  TileLike,
  WorldActionLike,
  WorldContextLike,
  WorldMapLike,
} from '@bworlds/plugin-api';

export function createChildContext(
  context: WorldContextLike,
  overrides: {
    id: string;
    label: string;
    type: string;
    depth?: number;
    origin?: Point;
  }
) {
  return {
    id: overrides.id,
    label: overrides.label,
    type: overrides.type,
    depth: overrides.depth ?? context.depth + 1,
    origin: overrides.origin ?? context.origin,
  };
}

export function createEnterMapAction({
  context,
  spawn,
  facing,
}: {
  context: WorldContextLike;
  spawn: Point;
  facing?: number;
}): WorldActionLike {
  return {
    type: 'enter',
    context,
    spawn,
    ...(typeof facing === 'number' ? { facing } : {}),
  };
}

export function createDeepenMapAction({
  context,
  spawn,
}: {
  context: WorldContextLike;
  spawn: Point;
}): WorldActionLike {
  return {
    type: 'deepen',
    context,
    spawn,
  };
}

export function createExitMapAction(spawn: Point): Partial<WorldActionLike> {
  return {
    spawn,
  };
}

export function createReturnMapAction(): Partial<WorldActionLike> {
  return {};
}

export function createDecoratedMapTileGetter<
  TTile extends TileLike,
  TContext extends WorldContextLike,
>({
  context,
  seed,
  resolveTile,
  decorateTile,
}: {
  context: TContext;
  seed: CreateMapContext['seed'];
  resolveTile(x: number, y: number): TTile;
  decorateTile(
    payload:
      | DecorateTownTileContext
      | DecorateBuildingTileContext
      | DecorateDepthTileContext
  ): TileLike;
}) {
  return function getTile(x: number, y: number): TTile {
    return decorateTile({
      context,
      seed,
      x,
      y,
      tile: resolveTile(x, y),
    }) as TTile;
  };
}

export function createContextMapPlugin<TContext extends WorldContextLike>(options: {
  name: string;
  contextType: string | string[];
  createMap(
    context: TContext,
    seed: CreateMapContext['seed'],
    plugins: CreateMapContext['plugins']
  ): WorldMapLike;
}): RuntimePlugin {
  const contextTypes = Array.isArray(options.contextType)
    ? options.contextType
    : [options.contextType];

  return {
    name: options.name,
    createMap({ context, seed, plugins }: CreateMapContext) {
      if (!context.type || !contextTypes.includes(context.type)) {
        return null;
      }
      return options.createMap(context as TContext, seed, plugins);
    },
  };
}
