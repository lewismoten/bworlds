import { generatePoiName, hash2D } from '@bworlds/core';
import { createRouteTraversalProfile } from '@bworlds/tile-support';
import type {
  ClassifyOverworldTileContext,
  CardinalDirectionLike,
  CreateWorldActionContext,
  Kind,
  PoiLike,
  PoiAnchorLike,
  PluginName,
  PointOfInterestType,
  Seed,
  TileLike,
  TilePlugin,
  TraversalProfile3D,
  ViewMode,
  WorldActionLike,
  WorldStateLike,
} from '@bworlds/plugin-api';
import {
  createSingleTilePlugin,
  withOverworldTileClassifier,
} from '@bworlds/plugin-api';

export const DEFAULT_LAND_POI_BLOCKED_KINDS = new Set([
  'river',
  'ocean',
  'mountain',
]) satisfies Set<Kind>;

export function canPlaceLandPoi(
  nearLand: boolean,
  tileKind: Kind,
  blockedKinds: ReadonlySet<Kind> = DEFAULT_LAND_POI_BLOCKED_KINDS
) {
  return nearLand && !blockedKinds.has(tileKind);
}

export function createGeneratedPoiTile({
  kind,
  note,
  poiType,
  seed,
  tile,
  x,
  y,
}: {
  kind: Kind;
  note: string;
  poiType: PointOfInterestType;
  seed: Seed;
  tile?: TileLike | null;
  x: number;
  y: number;
}) {
  return {
    kind,
    poi: {
      type: poiType,
      name: tile?.poi?.name ?? generatePoiName(seed, poiType, x, y),
    },
    note,
  };
}

export function createAnchoredPoiTile({
  kind,
  note,
  poiType,
  seed,
  tile,
  anchor,
}: {
  kind: Kind;
  note: string;
  poiType: PointOfInterestType;
  seed: Seed;
  tile?: TileLike | null;
  anchor: PoiAnchorLike;
}) {
  return {
    kind,
    poi: createNamedPoi(seed, poiType, anchor.x, anchor.y, anchor.name ?? tile?.poi?.name),
    note,
  };
}

export function createChanceBasedLandPoiClassifier(options: {
  kind: Kind;
  poiType: PointOfInterestType;
  note: string;
  threshold: number;
  chanceKey?: string;
  getChance?(context: ClassifyOverworldTileContext): number | undefined;
  blockedKinds?: ReadonlySet<Kind>;
}) {
  return function classifyChanceBasedLandPoi(
    context: ClassifyOverworldTileContext
  ) {
    const { nearLand, tile, seed, x, y } = context;
    if (!canPlaceLandPoi(nearLand, tile.kind, options.blockedKinds)) {
      return null;
    }

    if (
      resolvePlacementChance(context, options.chanceKey, options.getChance) <=
      options.threshold
    ) {
      return null;
    }

    return createGeneratedPoiTile({
      kind: options.kind,
      note: options.note,
      poiType: options.poiType,
      seed,
      tile,
      x,
      y,
    });
  };
}

export function createChanceBasedEnterablePoiTilePlugin(options: {
  pluginName: PluginName;
  kind: Kind;
  definition: NonNullable<TilePlugin['definition']>;
  poiType?: PointOfInterestType;
  note: string;
  threshold: number;
  chanceKey?: string;
  getChance?(context: ClassifyOverworldTileContext): number | undefined;
  blockedKinds?: ReadonlySet<Kind>;
  traversalProfile?: Partial<TraversalProfile3D>;
  worldAction?: {
    facing?: number;
    spawn?: { x: number; y: number };
  };
  classifyOverworldTile?: (
    context: ClassifyOverworldTileContext
  ) => TileLike | null;
  paint2D?: TilePlugin['paint2D'];
  create3DModel?: TilePlugin['create3DModel'];
  canOccupy3D?: TilePlugin['canOccupy3D'];
  getSurfaceProfile3D?: TilePlugin['getSurfaceProfile3D'];
  getTraversalProfile3D?: TilePlugin['getTraversalProfile3D'];
  createWorldAction?: TilePlugin['createWorldAction'];
}) {
  const kind = options.kind;
  const poiType = options.poiType ?? kind;
  return createEnterablePoiTilePlugin({
    ...options,
    classifyPoi:
      options.classifyOverworldTile ??
      createChanceBasedLandPoiClassifier({
        kind,
        poiType,
        note: options.note,
        threshold: options.threshold,
        chanceKey: options.chanceKey,
        getChance: options.getChance,
        blockedKinds: options.blockedKinds,
      }),
  });
}

export function createAnchoredEnterablePoiTilePlugin(options: {
  pluginName: PluginName;
  kind: Kind;
  definition: NonNullable<TilePlugin['definition']>;
  poiType?: PointOfInterestType;
  note: string;
  blockedKinds?: ReadonlySet<Kind>;
  maxDistance?: number;
  createPoi?(
    context: ClassifyOverworldTileContext,
    anchor: PoiAnchorLike
  ): TileLike;
  traversalProfile?: Partial<TraversalProfile3D>;
  worldAction?: {
    facing?: number;
    spawn?: { x: number; y: number };
  };
  classifyOverworldTile?: (
    context: ClassifyOverworldTileContext
  ) => TileLike | null;
  paint2D?: TilePlugin['paint2D'];
  create3DModel?: TilePlugin['create3DModel'];
  canOccupy3D?: TilePlugin['canOccupy3D'];
  getSurfaceProfile3D?: TilePlugin['getSurfaceProfile3D'];
  getTraversalProfile3D?: TilePlugin['getTraversalProfile3D'];
  createWorldAction?: TilePlugin['createWorldAction'];
}) {
  const kind = options.kind;
  const poiType = options.poiType ?? kind;
  return createEnterablePoiTilePlugin({
    ...options,
    classifyPoi:
      options.classifyOverworldTile ??
      createAnchoredLandPoiClassifier({
        kind,
        poiType,
        note: options.note,
        blockedKinds: options.blockedKinds,
        maxDistance: options.maxDistance,
        createPoi: options.createPoi,
      }),
  });
}

export function createEnterablePoiTilePlugin(options: {
  pluginName: PluginName;
  kind: Kind;
  definition: NonNullable<TilePlugin['definition']>;
  classifyPoi(context: ClassifyOverworldTileContext): TileLike | null;
  traversalProfile?: Partial<TraversalProfile3D>;
  worldAction?: {
    facing?: number;
    spawn?: { x: number; y: number };
  };
  paint2D?: TilePlugin['paint2D'];
  create3DModel?: TilePlugin['create3DModel'];
  canOccupy3D?: TilePlugin['canOccupy3D'];
  getSurfaceProfile3D?: TilePlugin['getSurfaceProfile3D'];
  getTraversalProfile3D?: TilePlugin['getTraversalProfile3D'];
  createWorldAction?: TilePlugin['createWorldAction'];
}) {
  const enterablePoiFeatures = createEnterablePoiTileFeatures({
    traversalProfile: options.traversalProfile,
    worldAction: options.worldAction,
  });

  return createSingleTilePlugin(
    options.pluginName,
    withOverworldTileClassifier(
      {
        kind: options.kind,
        definition: options.definition,
        ...enterablePoiFeatures,
        paint2D: options.paint2D,
        create3DModel: options.create3DModel,
        canOccupy3D: options.canOccupy3D,
        getSurfaceProfile3D: options.getSurfaceProfile3D,
        getTraversalProfile3D:
          options.getTraversalProfile3D ??
          enterablePoiFeatures.getTraversalProfile3D,
        createWorldAction:
          options.createWorldAction ?? enterablePoiFeatures.createWorldAction,
      },
      options.classifyPoi
    )
  );
}

export function findPoiAnchor(
  context: ClassifyOverworldTileContext,
  poiType: PointOfInterestType,
  maxDistance = 0.55
) {
  return (context.poiAnchors ?? []).find(
    (anchor) =>
      anchor.type === poiType &&
      Math.hypot(context.x - anchor.x, context.y - anchor.y) <= maxDistance
  );
}

export function createAnchoredLandPoiClassifier(options: {
  kind: Kind;
  poiType?: PointOfInterestType;
  note: string;
  blockedKinds?: ReadonlySet<Kind>;
  maxDistance?: number;
  createPoi?(
    context: ClassifyOverworldTileContext,
    anchor: PoiAnchorLike
  ): TileLike;
}) {
  return function classifyAnchoredLandPoi(
    context: ClassifyOverworldTileContext
  ) {
    const poiType = options.poiType ?? options.kind;
    if (
      !canPlaceLandPoi(
        context.nearLand,
        context.tile.kind,
        options.blockedKinds
      )
    ) {
      return null;
    }

    const anchor = findPoiAnchor(context, poiType, options.maxDistance);
    if (!anchor) {
      return null;
    }

    if (options.createPoi) {
      return options.createPoi(context, anchor);
    }

    return createAnchoredPoiTile({
      kind: options.kind,
      note: options.note,
      poiType,
      seed: context.seed,
      tile: context.tile,
      anchor,
    });
  };
}

export function createPoiWorldAction(
  { x, y, tile }: CreateWorldActionContext,
  options: {
    facing?: number;
    spawn?: { x: number; y: number };
  } = {}
): WorldActionLike | null {
  if (!tile.poi) return null;

  return {
    type: 'enter',
    context: {
      id: `${tile.poi.type}:${x}:${y}:0`,
      label: tile.poi.name,
      type: tile.poi.type,
      depth: 1,
      origin: { x, y },
    },
    spawn: options.spawn ?? { x: 0, y: 0 },
    facing: options.facing ?? 0,
  };
}

export function createEnterablePoiTileFeatures(
  options: {
    traversalProfile?: Partial<TraversalProfile3D>;
    worldAction?: {
      facing?: number;
      spawn?: { x: number; y: number };
    };
  } = {}
): Pick<TilePlugin, 'getTraversalProfile3D' | 'createWorldAction'> {
  return {
    getTraversalProfile3D() {
      return createRouteTraversalProfile(options.traversalProfile);
    },
    createWorldAction(context: CreateWorldActionContext) {
      return createPoiWorldAction(context, options.worldAction);
    },
  };
}

export function resolvePlacementChance(
  context: ClassifyOverworldTileContext,
  chanceKey?: string,
  getChance?: ((context: ClassifyOverworldTileContext) => number | undefined) | null
) {
  if (typeof getChance === 'function') {
    const chance = getChance(context);
    if (typeof chance === 'number') {
      return chance;
    }
  }

  if (chanceKey && typeof context.getPlacementChance === 'function') {
    return context.getPlacementChance(chanceKey);
  }

  if (chanceKey && typeof context.placementChances?.[chanceKey] === 'number') {
    return context.placementChances[chanceKey]!;
  }

  if (chanceKey === 'town') return context.townChance ?? 0;
  if (chanceKey === 'cave') return context.caveChance ?? 0;
  if (chanceKey === 'dungeon') return context.dungeonChance ?? 0;
  if (chanceKey === 'sign') return context.signChance ?? 0;

  return 0;
}

export function createNamedPoi(
  seed: Seed,
  poiType: PointOfInterestType,
  x: number,
  y: number,
  name?: string
): PoiLike {
  return {
    type: poiType,
    name: name ?? generatePoiName(seed, poiType, x, y),
  };
}

export const CARDINAL_DIRECTIONS: CardinalDirectionLike[] = [
  { dx: 0, dy: -1, rotationY: Math.PI, label: 'north' },
  { dx: 1, dy: 0, rotationY: -Math.PI * 0.5, label: 'east' },
  { dx: 0, dy: 1, rotationY: 0, label: 'south' },
  { dx: -1, dy: 0, rotationY: Math.PI * 0.5, label: 'west' },
];

export function getNearestAccessibleRouteDistance(
  state: WorldStateLike,
  tileX: number,
  tileY: number,
  direction: CardinalDirectionLike,
  maxDistance = 5
) {
  for (let distance = 1; distance <= maxDistance; distance += 1) {
    const tile = state.getCurrentTile(
      tileX + direction.dx * distance,
      tileY + direction.dy * distance
    );
    if (tile.kind === 'road' || tile.kind === 'bridge') {
      return distance;
    }
    if (!state.getTileDefinition(tile.kind).walkable) {
      return Infinity;
    }
  }

  return Infinity;
}

export function pickPreferredLandmarkFacing({
  state,
  tileX,
  tileY,
  seedKey,
  preferLandFacing = false,
}: {
  state: WorldStateLike;
  tileX: number;
  tileY: number;
  seedKey: string;
  preferLandFacing?: boolean;
}) {
  return CARDINAL_DIRECTIONS.map((direction) => {
    const adjacentTile = state.getCurrentTile(
      tileX + direction.dx,
      tileY + direction.dy
    );
    const walkable = state.getTileDefinition(adjacentTile.kind).walkable;
    const landFacing =
      walkable &&
      adjacentTile.kind !== 'river' &&
      adjacentTile.kind !== 'ocean';
    const routeDistance = getNearestAccessibleRouteDistance(
      state,
      tileX,
      tileY,
      direction
    );

    return {
      ...direction,
        score:
        (routeDistance === 1 ? 8 : 0) +
        (routeDistance > 1 && Number.isFinite(routeDistance)
          ? Math.max(0, 6 - routeDistance)
          : 0) +
        (preferLandFacing && landFacing ? 4 : 0) +
        (walkable ? 2 : 0) +
        hash2D(`${seedKey}:${direction.label}`, tileX, tileY),
    };
  }).sort((left, right) => right.score - left.score)[0];
}
