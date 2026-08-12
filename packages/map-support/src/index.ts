import type {
  CreateMapContext,
  DecorateBuildingTileContext,
  DecorateDepthTileContext,
  DecorateTownTileContext,
  RuntimePlugin,
  Point,
  TileLike,
  WorldStateLike,
  WorldActionLike,
  WorldContextLike,
  WorldContextType,
  WorldMapLike,
} from '@bworlds/plugin-api';
export type * from './map-projections.ts';
export {
  AZIMUTHAL_CENTER_LATITUDE,
  AZIMUTHAL_CENTER_LONGITUDE,
  AZIMUTHAL_MAX_PROJECTED_RADIUS,
  ALBERS_CENTRAL_MERIDIAN,
  ALBERS_LATITUDE_OF_ORIGIN,
  ALBERS_MAX_WORLD_LATITUDE,
  ALBERS_MAX_WORLD_LONGITUDE,
  ALBERS_STANDARD_PARALLEL_1,
  ALBERS_STANDARD_PARALLEL_2,
  createAzimuthalMapProjectionPlugin,
  createAlbersEqualAreaConicMapProjectionPlugin,
  createGenericConicMapProjectionPlugin,
  createMapProjectionPlugin,
  createMercatorMapProjectionPlugin,
  createMillerCylindricalMapProjectionPlugin,
  createTransverseMercatorMapProjectionPlugin,
  GENERIC_CONIC_CENTRAL_MERIDIAN,
  GENERIC_CONIC_LATITUDE_OF_ORIGIN,
  GENERIC_CONIC_MAX_WORLD_LATITUDE,
  GENERIC_CONIC_MAX_WORLD_LONGITUDE,
  GENERIC_CONIC_STANDARD_PARALLEL_1,
  GENERIC_CONIC_STANDARD_PARALLEL_2,
  MILLER_MAX_PROJECTED_Y,
  MILLER_MAX_WORLD_LATITUDE,
  MERCATOR_MAX_WORLD_LATITUDE,
  TRANSVERSE_MERCATOR_MAX_PROJECTED_X,
  TRANSVERSE_MERCATOR_MAX_WORLD_LATITUDE,
  TRANSVERSE_MERCATOR_MAX_WORLD_LONGITUDE,
} from './map-projections.ts';

type DecoratedTileContext =
  | DecorateTownTileContext
  | DecorateBuildingTileContext
  | DecorateDepthTileContext;

type ContextualWorldLike<TContextType extends WorldContextType> =
  WorldContextLike & {
    type?: TContextType;
  };

function hasMatchingContextType(
  context: WorldContextLike,
  contextTypes: readonly WorldContextType[]
): boolean {
  return (
    typeof context.type === 'string' &&
    contextTypes.includes(context.type as WorldContextType)
  );
}

export function createChildContext<TContextType extends WorldContextType>(
  context: WorldContextLike,
  overrides: {
    id: string;
    label: string;
    type: TContextType;
    depth?: number;
    origin?: Point;
  }
): ContextualWorldLike<TContextType> {
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
  resolveTile(x: number, y: number, state?: WorldStateLike): TTile;
  decorateTile(payload: DecoratedTileContext): TileLike;
}): (x: number, y: number, state?: WorldStateLike) => TTile {
  return function getTile(x: number, y: number, state?: WorldStateLike): TTile {
    return decorateTile({
      context,
      seed,
      x,
      y,
      tile: resolveTile(x, y, state),
    }) as TTile;
  };
}

export function createContextMapPlugin<
  TContext extends WorldContextLike,
>(options: {
  name: string;
  contextType: WorldContextType | readonly WorldContextType[];
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
      if (!hasMatchingContextType(context, contextTypes)) {
        return null;
      }
      return options.createMap(context as TContext, seed, plugins);
    },
  };
}
