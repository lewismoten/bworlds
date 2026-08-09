import {
  clamp,
  generatePoiName,
} from '@bworlds/core';
import {
  appendHashSeedLabel,
  createHashSeed,
  hash2DWithSeed,
  registerHashLabel,
} from '@bworlds/core/hash';
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
  RuntimePlugin,
  Seed,
  TileLike,
  TilePlugin,
  ThreeMaterialLike,
  ThreeObject3DLike,
  TraversalProfile3D,
  ViewMode,
  WorldEnvironmentLike,
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

interface PoiWorldActionOptions {
  facing?: number;
  spawn?: { x: number; y: number };
}

interface GeneratedPoiTileOptions {
  kind: Kind;
  note: string;
  poiType: PointOfInterestType;
  seed: Seed;
  tile?: TileLike | null;
  x: number;
  y: number;
}

interface AnchoredPoiTileOptions {
  kind: Kind;
  note: string;
  poiType: PointOfInterestType;
  seed: Seed;
  tile?: TileLike | null;
  anchor: PoiAnchorLike;
}

interface ChanceBasedLandPoiClassifierOptions {
  kind: Kind;
  poiType: PointOfInterestType;
  note: string;
  threshold: number;
  chanceKey?: string;
  getChance?(context: ClassifyOverworldTileContext): number | undefined;
  blockedKinds?: ReadonlySet<Kind>;
}

interface EnterablePoiTilePluginOptions {
  pluginName: PluginName;
  kind: Kind;
  definition: NonNullable<TilePlugin['definition']>;
  classifyPoi(context: ClassifyOverworldTileContext): TileLike | null;
  traversalProfile?: Partial<TraversalProfile3D>;
  worldAction?: PoiWorldActionOptions;
  paint2D?: TilePlugin['paint2D'];
  create3DModel?: TilePlugin['create3DModel'];
  sync3DModel?: TilePlugin['sync3DModel'];
  canOccupy3D?: TilePlugin['canOccupy3D'];
  getSurfaceProfile3D?: TilePlugin['getSurfaceProfile3D'];
  getTraversalProfile3D?: TilePlugin['getTraversalProfile3D'];
  createWorldAction?: TilePlugin['createWorldAction'];
}

interface ChanceBasedEnterablePoiTilePluginOptions
  extends Omit<EnterablePoiTilePluginOptions, 'classifyPoi'> {
  poiType?: PointOfInterestType;
  note: string;
  threshold: number;
  chanceKey?: string;
  getChance?(context: ClassifyOverworldTileContext): number | undefined;
  blockedKinds?: ReadonlySet<Kind>;
  classifyOverworldTile?: (
    context: ClassifyOverworldTileContext
  ) => TileLike | null;
}

interface AnchoredLandPoiClassifierOptions {
  kind: Kind;
  poiType?: PointOfInterestType;
  note: string;
  blockedKinds?: ReadonlySet<Kind>;
  maxDistance?: number;
  createPoi?(
    context: ClassifyOverworldTileContext,
    anchor: PoiAnchorLike
  ): TileLike;
}

interface AnchoredEnterablePoiTilePluginOptions
  extends Omit<EnterablePoiTilePluginOptions, 'classifyPoi'>,
    AnchoredLandPoiClassifierOptions {
  classifyOverworldTile?: (
    context: ClassifyOverworldTileContext
  ) => TileLike | null;
}

type LandmarkFacingScore = CardinalDirectionLike & { score: number };
type PoiLightCycleLike = {
  daylight: number;
  twilight: number;
  night: number;
};
type PoiLightEmitterKind = 'emissive-mesh' | 'point-light';
type PoiLightEmitterOptions = {
  kind: PoiLightEmitterKind;
  dayIntensity?: number;
  nightIntensity: number;
  visibleThreshold?: number;
};
type PoiLightMaterialLike = ThreeMaterialLike & {
  emissiveIntensity?: number;
};
type PoiLightTaggedObject = ThreeObject3DLike & {
  intensity?: number;
  material?: PoiLightMaterialLike | PoiLightMaterialLike[];
};
type PoiWindAxis = 'x' | 'y' | 'z';
type PoiWindResponderOptions = {
  axis?: PoiWindAxis;
  baseRotation?: number;
  idleAmplitude?: number;
  windAmplitude?: number;
  gustAmplitude?: number;
  speed?: number;
  gustSpeed?: number;
  phase?: number;
  gustPhase?: number;
};
const POI_LIGHT_EMITTER_KEY = 'poiNightLightEmitter';
const POI_WIND_RESPONDER_KEY = 'poiWindResponder';
const LANDMARK_FACING_DIRECTION_SEEDS: Record<string, number> = {
  north: registerHashLabel('north'),
  east: registerHashLabel('east'),
  south: registerHashLabel('south'),
  west: registerHashLabel('west'),
};
const poiWindResponderProfileCache = new Map<
  string,
  Required<PoiWindResponderOptions>
>();
const poiWindResponderCache = new WeakMap<
  ThreeObject3DLike,
  Array<
    ThreeObject3DLike & {
      userData: Record<string, unknown>;
    }
  >
>();

export function getPoiLightActivation(cycle: PoiLightCycleLike): number {
  return clamp(
    cycle.night * 1.08 + cycle.twilight * 0.52 - cycle.daylight * 0.12,
    0,
    1
  );
}

export function markPoiLightEmitter<TObject extends ThreeObject3DLike>(
  target: TObject,
  options: PoiLightEmitterOptions
): TObject {
  target.userData = {
    ...(target.userData ?? {}),
    [POI_LIGHT_EMITTER_KEY]: options,
  };
  return target;
}

export function syncPoiLightEmitters(
  root: ThreeObject3DLike,
  cycle: PoiLightCycleLike
): void {
  const activation = getPoiLightActivation(cycle);
  const visit = (node: ThreeObject3DLike): void => {
    const emitter = node.userData?.[POI_LIGHT_EMITTER_KEY] as
      | PoiLightEmitterOptions
      | undefined;
    if (!emitter) {
      return;
    }

    const intensity =
      (emitter.dayIntensity ?? 0) +
      (emitter.nightIntensity - (emitter.dayIntensity ?? 0)) * activation;
    const target = node as PoiLightTaggedObject;
    if (emitter.kind === 'point-light' && typeof target.intensity === 'number') {
      target.intensity = intensity;
      target.visible = intensity > (emitter.visibleThreshold ?? 0.01);
      return;
    }

    const materials = Array.isArray(target.material)
      ? target.material
      : target.material
        ? [target.material]
        : [];
    materials.forEach((material) => {
      material.emissiveIntensity = intensity;
    });
  };

  if (typeof root.traverse === 'function') {
    root.traverse((node) => {
      visit(node);
    });
    return;
  }

  visit(root);
}

export function markPoiWindResponder<TObject extends ThreeObject3DLike>(
  target: TObject,
  options: PoiWindResponderOptions = {}
): TObject {
  const responderProfile = getPoiWindResponderProfile(options);
  target.userData = {
    ...(target.userData ?? {}),
    [POI_WIND_RESPONDER_KEY]: responderProfile,
  };
  return target;
}

export function getPoiWindActivation(environment: WorldEnvironmentLike): number {
  return clamp(environment.weather?.current?.windStrength ?? 0.16, 0, 1);
}

export function syncPoiWindResponders(
  root: ThreeObject3DLike,
  environment: WorldEnvironmentLike,
  timeMs = 0
): void {
  const activation = getPoiWindActivation(environment);
  const elapsed = timeMs * 0.001;
  const responders = getPoiWindResponderTargets(root);
  responders.forEach((node) => {
    const responder = node.userData[POI_WIND_RESPONDER_KEY] as
      Required<PoiWindResponderOptions>;
    const axis = responder.axis;
    const gust = Math.sin(elapsed * responder.gustSpeed + responder.gustPhase);
    const sway = Math.sin(elapsed * responder.speed + responder.phase);
    node.rotation[axis] =
      responder.baseRotation +
      sway * (responder.idleAmplitude + responder.windAmplitude * activation) +
      gust * responder.gustAmplitude * activation;
  });
}

function getPoiWindResponderTargets(root: ThreeObject3DLike) {
  const cached = poiWindResponderCache.get(root);
  if (cached) {
    return cached;
  }

  const responders: Array<
    ThreeObject3DLike & {
      userData: Record<string, unknown>;
    }
  > = [];

  const visit = (node: ThreeObject3DLike): void => {
    if (node.userData?.[POI_WIND_RESPONDER_KEY]) {
      responders.push(
        node as ThreeObject3DLike & {
          userData: Record<string, unknown>;
        }
      );
    }
  };

  if (typeof root.traverse === 'function') {
    root.traverse((node) => {
      visit(node);
    });
  } else {
    visit(root);
  }

  poiWindResponderCache.set(root, responders);
  return responders;
}

function getPoiWindResponderProfile(
  options: PoiWindResponderOptions = {}
): Required<PoiWindResponderOptions> {
  const normalized = {
    axis: options.axis ?? 'z',
    baseRotation: options.baseRotation ?? 0,
    idleAmplitude: options.idleAmplitude ?? 0.02,
    windAmplitude: options.windAmplitude ?? 0.14,
    gustAmplitude: options.gustAmplitude ?? 0.06,
    speed: options.speed ?? 1,
    gustSpeed: options.gustSpeed ?? 2.2,
    phase: options.phase ?? 0,
    gustPhase: options.gustPhase ?? 0,
  } satisfies Required<PoiWindResponderOptions>;
  const key = [
    normalized.axis,
    normalized.baseRotation,
    normalized.idleAmplitude,
    normalized.windAmplitude,
    normalized.gustAmplitude,
    normalized.speed,
    normalized.gustSpeed,
    normalized.phase,
    normalized.gustPhase,
  ].join(':');

  if (!poiWindResponderProfileCache.has(key)) {
    poiWindResponderProfileCache.set(key, normalized);
  }

  return poiWindResponderProfileCache.get(key)!;
}

export function canPlaceLandPoi(
  nearLand: boolean,
  tileKind: Kind,
  blockedKinds: ReadonlySet<Kind> = DEFAULT_LAND_POI_BLOCKED_KINDS
): boolean {
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
}: GeneratedPoiTileOptions): TileLike {
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
}: AnchoredPoiTileOptions): TileLike {
  return {
    kind,
    poi: createNamedPoi(seed, poiType, anchor.x, anchor.y, anchor.name ?? tile?.poi?.name),
    note,
  };
}

export function createChanceBasedLandPoiClassifier(
  options: ChanceBasedLandPoiClassifierOptions
): (context: ClassifyOverworldTileContext) => TileLike | null {
  return function classifyChanceBasedLandPoi(
    context: ClassifyOverworldTileContext
  ): TileLike | null {
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

export function createChanceBasedEnterablePoiTilePlugin(
  options: ChanceBasedEnterablePoiTilePluginOptions
): RuntimePlugin {
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

export function createAnchoredEnterablePoiTilePlugin(
  options: AnchoredEnterablePoiTilePluginOptions
): RuntimePlugin {
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

export function createEnterablePoiTilePlugin(
  options: EnterablePoiTilePluginOptions
): RuntimePlugin {
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
        sync3DModel: options.sync3DModel,
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
): PoiAnchorLike | undefined {
  return (context.poiAnchors ?? []).find(
    (anchor) =>
      anchor.type === poiType &&
      Math.hypot(context.x - anchor.x, context.y - anchor.y) <= maxDistance
  );
}

export function createAnchoredLandPoiClassifier(
  options: AnchoredLandPoiClassifierOptions
): (context: ClassifyOverworldTileContext) => TileLike | null {
  return function classifyAnchoredLandPoi(
    context: ClassifyOverworldTileContext
  ): TileLike | null {
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
  options: PoiWorldActionOptions = {}
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
    worldAction?: PoiWorldActionOptions;
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
): number {
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
): number {
  for (let distance = 1; distance <= maxDistance; distance += 1) {
    const tile = state.getCurrentTile(
      tileX + direction.dx * distance,
      tileY + direction.dy * distance
    );
    if (tile.kind === 'road' || tile.kind === 'bridge' || tile.kind === 'dock') {
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
  seedKey: Seed;
  preferLandFacing?: boolean;
}): LandmarkFacingScore {
  const seedHash =
    typeof seedKey === 'number' ? createHashSeed(seedKey) : registerHashLabel(seedKey);
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
        hash2DWithSeed(
          appendHashSeedLabel(
            seedHash,
            LANDMARK_FACING_DIRECTION_SEEDS[direction.label] ??
              registerHashLabel(direction.label)
          ),
          tileX,
          tileY
        ),
    };
  }).sort((left, right) => right.score - left.score)[0];
}
