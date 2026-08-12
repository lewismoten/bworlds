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

export type MapProjectionWorldCoordinate = {
  worldX: number;
  worldY: number;
};

export type MapProjectionMapCoordinate = {
  mapX: number;
  mapY: number;
};

export type MapProjectionBounds = {
  minWorldX: number;
  maxWorldX: number;
  minWorldY: number;
  maxWorldY: number;
  minMapX: number;
  maxMapX: number;
  minMapY: number;
  maxMapY: number;
};

export type MapProjectionWrapping = {
  wrapsWorldX?: boolean;
  wrapsWorldY?: boolean;
};

export type MapProjectionDistortion =
  | 'conformal'
  | 'equal-area'
  | 'equidistant'
  | 'compromise'
  | 'perspective'
  | 'custom';

export interface MapProjectionPlugin {
  id: string;
  label?: string;
  bounds: MapProjectionBounds;
  wrapping: MapProjectionWrapping;
  distortion: MapProjectionDistortion;
  project(
    coordinate: MapProjectionWorldCoordinate
  ): MapProjectionMapCoordinate;
  invert?(
    coordinate: MapProjectionMapCoordinate
  ): MapProjectionWorldCoordinate | null;
}

type DecoratedTileContext =
  | DecorateTownTileContext
  | DecorateBuildingTileContext
  | DecorateDepthTileContext;

type ContextualWorldLike<TContextType extends WorldContextType> =
  WorldContextLike & {
    type?: TContextType;
  };

export function createMapProjectionPlugin(params: {
  id: string;
  label?: string;
  bounds: MapProjectionBounds;
  wrapping?: MapProjectionWrapping;
  distortion: MapProjectionDistortion;
  project: MapProjectionPlugin['project'];
  invert?: MapProjectionPlugin['invert'];
}): MapProjectionPlugin {
  return {
    id: normalizeNonEmptyString(params.id, 'Map projection plugin id'),
    label:
      typeof params.label === 'string' && params.label.trim().length > 0
        ? params.label.trim()
        : undefined,
    bounds: normalizeMapProjectionBounds(params.bounds),
    wrapping: normalizeMapProjectionWrapping(params.wrapping),
    distortion: normalizeMapProjectionDistortion(params.distortion),
    project(coordinate) {
      return normalizeMapProjectionMapCoordinate(
        params.project(normalizeMapProjectionWorldCoordinate(coordinate)),
        'Map projection project result'
      );
    },
    ...(params.invert
      ? {
          invert(coordinate: MapProjectionMapCoordinate) {
            const inverted = params.invert?.(
              normalizeMapProjectionMapCoordinate(
                coordinate,
                'Map projection invert coordinate'
              )
            );
            if (inverted == null) {
              return null;
            }
            return normalizeMapProjectionWorldCoordinate(inverted);
          },
        }
      : {}),
  };
}

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

function normalizeMapProjectionWorldCoordinate(
  coordinate: MapProjectionWorldCoordinate
): MapProjectionWorldCoordinate {
  return {
    worldX: normalizeFiniteNumber(
      coordinate.worldX,
      'Map projection worldX'
    ),
    worldY: normalizeFiniteNumber(
      coordinate.worldY,
      'Map projection worldY'
    ),
  };
}

function normalizeMapProjectionMapCoordinate(
  coordinate: MapProjectionMapCoordinate,
  label: string
): MapProjectionMapCoordinate {
  return {
    mapX: normalizeFiniteNumber(coordinate.mapX, `${label} mapX`),
    mapY: normalizeFiniteNumber(coordinate.mapY, `${label} mapY`),
  };
}

function normalizeMapProjectionBounds(
  bounds: MapProjectionBounds
): MapProjectionBounds {
  const normalized = {
    minWorldX: normalizeFiniteNumber(
      bounds.minWorldX,
      'Map projection bounds minWorldX'
    ),
    maxWorldX: normalizeFiniteNumber(
      bounds.maxWorldX,
      'Map projection bounds maxWorldX'
    ),
    minWorldY: normalizeFiniteNumber(
      bounds.minWorldY,
      'Map projection bounds minWorldY'
    ),
    maxWorldY: normalizeFiniteNumber(
      bounds.maxWorldY,
      'Map projection bounds maxWorldY'
    ),
    minMapX: normalizeFiniteNumber(
      bounds.minMapX,
      'Map projection bounds minMapX'
    ),
    maxMapX: normalizeFiniteNumber(
      bounds.maxMapX,
      'Map projection bounds maxMapX'
    ),
    minMapY: normalizeFiniteNumber(
      bounds.minMapY,
      'Map projection bounds minMapY'
    ),
    maxMapY: normalizeFiniteNumber(
      bounds.maxMapY,
      'Map projection bounds maxMapY'
    ),
  };

  if (normalized.minWorldX > normalized.maxWorldX) {
    throw new Error(
      'Map projection bounds minWorldX must be <= maxWorldX.'
    );
  }
  if (normalized.minWorldY > normalized.maxWorldY) {
    throw new Error(
      'Map projection bounds minWorldY must be <= maxWorldY.'
    );
  }
  if (normalized.minMapX > normalized.maxMapX) {
    throw new Error('Map projection bounds minMapX must be <= maxMapX.');
  }
  if (normalized.minMapY > normalized.maxMapY) {
    throw new Error('Map projection bounds minMapY must be <= maxMapY.');
  }

  return normalized;
}

function normalizeMapProjectionWrapping(
  wrapping: MapProjectionWrapping | undefined
): MapProjectionWrapping {
  return {
    wrapsWorldX: wrapping?.wrapsWorldX === true,
    wrapsWorldY: wrapping?.wrapsWorldY === true,
  };
}

function normalizeMapProjectionDistortion(
  distortion: MapProjectionDistortion
): MapProjectionDistortion {
  switch (distortion) {
    case 'conformal':
    case 'equal-area':
    case 'equidistant':
    case 'compromise':
    case 'perspective':
    case 'custom':
      return distortion;
    default:
      throw new Error(
        `Map projection distortion ${JSON.stringify(distortion)} is not supported.`
      );
  }
}

function normalizeNonEmptyString(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return normalized;
}

function normalizeFiniteNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return value;
}
