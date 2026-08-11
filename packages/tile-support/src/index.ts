import type {
  ClassifyOverworldTileContext,
  CrossingTileKind,
  Kind,
  KnownTileKind,
  OverworldAnchorLike,
  ResolveFloorKind3DContext,
  RouteTerminalTileKind,
  SurfaceBoundaryRole3D,
  SurfaceBoundaryTransition3D,
  SurfaceProfile3D,
  TileLike,
  TilePlugin,
  TraversalProfile3D,
  WaterTileKind,
} from '@bworlds/plugin-api';
import { createCoordinateCache } from '@bworlds/cache-support';

export type RouteConnectionSegment = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  tolerance: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type ConnectedRouteSegments = {
  townPairSegments: RouteConnectionSegment[];
  townBridgeSegments: Array<RouteConnectionSegment | null>;
};

const connectedRouteSegmentCaches = new WeakMap<
  readonly OverworldAnchorLike[],
  WeakMap<readonly OverworldAnchorLike[], Map<string, ConnectedRouteSegments>>
>();

export function createRouteTraversalProfile(
  overrides: Partial<TraversalProfile3D> = {}
): TraversalProfile3D {
  return {
    travelGroup: 'route',
    ...overrides,
  };
}

export const DEFAULT_ROUTE_TERMINAL_KINDS = new Set<RouteTerminalTileKind>([
  'sign',
  'town',
  'cave',
  'dungeon',
  'tower',
  'quarry',
  'lighthouse',
  'ship',
  'observatory',
  'station',
]);

export const DEFAULT_BRIDGE_WATER_KINDS = new Set<WaterTileKind>([
  'river',
  'ocean',
]);
export const DEFAULT_WATER_KINDS = new Set<WaterTileKind>(['river', 'ocean']);
export const DEFAULT_WATER_OR_CROSSING_KINDS = new Set<
  WaterTileKind | CrossingTileKind
>([...DEFAULT_WATER_KINDS, 'bridge', 'dock']);

export function isRouteTerminalKind(
  kind: Kind,
  terminalKinds: ReadonlySet<RouteTerminalTileKind> = DEFAULT_ROUTE_TERMINAL_KINDS
) {
  return terminalKinds.has(kind as RouteTerminalTileKind);
}

export function isBridgeWaterKind(
  kind: Kind,
  waterKinds: ReadonlySet<WaterTileKind> = DEFAULT_BRIDGE_WATER_KINDS
) {
  return waterKinds.has(kind as WaterTileKind);
}

export function isWaterKind(
  kind: Kind,
  waterKinds: ReadonlySet<WaterTileKind> = DEFAULT_WATER_KINDS
) {
  return waterKinds.has(kind as WaterTileKind);
}

export function isWaterOrCrossingKind(
  kind: Kind,
  kinds: ReadonlySet<
    WaterTileKind | CrossingTileKind
  > = DEFAULT_WATER_OR_CROSSING_KINDS
) {
  return kinds.has(kind as WaterTileKind | CrossingTileKind);
}

export function distanceToLineSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const lengthSquared = abx * abx + aby * aby;

  if (lengthSquared === 0) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = Math.min(1, Math.max(0, (apx * abx + apy * aby) / lengthSquared));
  const nearestX = ax + abx * t;
  const nearestY = ay + aby * t;
  return Math.hypot(px - nearestX, py - nearestY);
}

export function hasConnectedRoutePath({
  x,
  y,
  townAnchors,
  bridgeAnchors,
  maxTownPairDistance = 28,
  townAnchorSnapDistance = 1.1,
  townAnchorAxisTolerance = 0.35,
  townBridgeMaxDistance = 16,
  townBridgePathTolerance = 0.38,
  townPairPathTolerance = 0.42,
  bridgeAnchorSnapDistance = 0.8,
}: {
  x: number;
  y: number;
  townAnchors: OverworldAnchorLike[];
  bridgeAnchors: OverworldAnchorLike[];
  maxTownPairDistance?: number;
  townAnchorSnapDistance?: number;
  townAnchorAxisTolerance?: number;
  townBridgeMaxDistance?: number;
  townBridgePathTolerance?: number;
  townPairPathTolerance?: number;
  bridgeAnchorSnapDistance?: number;
}) {
  const resolvePath = createConnectedRoutePathResolver({
    townAnchors,
    bridgeAnchors,
    maxTownPairDistance,
    townAnchorSnapDistance,
    townAnchorAxisTolerance,
    townBridgeMaxDistance,
    townBridgePathTolerance,
    townPairPathTolerance,
    bridgeAnchorSnapDistance,
  });
  return resolvePath(x, y);
}

export function createConnectedRoutePathResolver({
  townAnchors,
  bridgeAnchors,
  maxTownPairDistance = 28,
  townAnchorSnapDistance = 1.1,
  townAnchorAxisTolerance = 0.35,
  townBridgeMaxDistance = 16,
  townBridgePathTolerance = 0.38,
  townPairPathTolerance = 0.42,
  bridgeAnchorSnapDistance = 0.8,
}: {
  townAnchors: OverworldAnchorLike[];
  bridgeAnchors: OverworldAnchorLike[];
  maxTownPairDistance?: number;
  townAnchorSnapDistance?: number;
  townAnchorAxisTolerance?: number;
  townBridgeMaxDistance?: number;
  townBridgePathTolerance?: number;
  townPairPathTolerance?: number;
  bridgeAnchorSnapDistance?: number;
}) {
  const connectedSegments = resolveConnectedRouteSegments({
    townAnchors,
    bridgeAnchors,
    maxTownPairDistance,
    townBridgeMaxDistance,
    townPairPathTolerance,
    townBridgePathTolerance,
  });
  const nearestTownCache =
    createCoordinateCache<
      { anchor: OverworldAnchorLike; distance: number; index: number } | null
    >();
  const bridgeSnapCache = createCoordinateCache<boolean>();

  return (x: number, y: number) =>
    resolveConnectedRoutePathAtPoint({
      x,
      y,
      connectedSegments,
      townAnchors,
      bridgeAnchors,
      townAnchorSnapDistance,
      townAnchorAxisTolerance,
      bridgeAnchorSnapDistance,
      resolveNearestTown(targetX, targetY) {
        return (
          nearestTownCache.getOrCreate(targetX, targetY, () => {
            return findNearestAnchorDistance(townAnchors, targetX, targetY) ?? null;
          }) ?? undefined
        );
      },
      hasNearbyBridge(targetX, targetY) {
        return bridgeSnapCache.getOrCreate(targetX, targetY, () =>
          bridgeAnchors.some(
            (bridge) =>
              Math.hypot(targetX - bridge.x, targetY - bridge.y) <
              bridgeAnchorSnapDistance
          )
        );
      },
    });
}

function resolveConnectedRoutePathAtPoint({
  x,
  y,
  connectedSegments,
  townAnchors,
  bridgeAnchors,
  townAnchorSnapDistance,
  townAnchorAxisTolerance,
  bridgeAnchorSnapDistance,
  resolveNearestTown,
  hasNearbyBridge,
}: {
  x: number;
  y: number;
  connectedSegments: ConnectedRouteSegments;
  townAnchors: readonly OverworldAnchorLike[];
  bridgeAnchors: readonly OverworldAnchorLike[];
  townAnchorSnapDistance: number;
  townAnchorAxisTolerance: number;
  bridgeAnchorSnapDistance: number;
  resolveNearestTown: (
    x: number,
    y: number
  ) => { anchor: OverworldAnchorLike; distance: number; index: number } | undefined;
  hasNearbyBridge: (x: number, y: number) => boolean;
}) {
  const nearestTown = resolveNearestTown(x, y);

  if (
    nearestTown &&
    nearestTown.distance < townAnchorSnapDistance &&
    (Math.abs(x - nearestTown.anchor.x) < townAnchorAxisTolerance ||
      Math.abs(y - nearestTown.anchor.y) < townAnchorAxisTolerance)
  ) {
    return true;
  }

  for (const segment of connectedSegments.townPairSegments) {
    if (!canRouteConnectionSegmentAffectPoint(segment, x, y)) {
      continue;
    }
    if (
      distanceToLineSegment(
        x,
        y,
        segment.startX,
        segment.startY,
        segment.endX,
        segment.endY
      ) < segment.tolerance
    ) {
      return true;
    }
  }

  if (nearestTown) {
    const nearestBridgeSegment =
      connectedSegments.townBridgeSegments[nearestTown.index] ?? null;

    if (
      nearestBridgeSegment &&
      canRouteConnectionSegmentAffectPoint(nearestBridgeSegment, x, y) &&
      distanceToLineSegment(
        x,
        y,
        nearestBridgeSegment.startX,
        nearestBridgeSegment.startY,
        nearestBridgeSegment.endX,
        nearestBridgeSegment.endY
      ) < nearestBridgeSegment.tolerance
    ) {
      return true;
    }
  }

  if (bridgeAnchors.length === 0 || bridgeAnchorSnapDistance <= 0) {
    return false;
  }

  return hasNearbyBridge(x, y);
}

export function resolveConnectedRouteSegments({
  townAnchors,
  bridgeAnchors,
  maxTownPairDistance = 28,
  townBridgeMaxDistance = 16,
  townPairPathTolerance = 0.42,
  townBridgePathTolerance = 0.38,
}: {
  townAnchors: readonly OverworldAnchorLike[];
  bridgeAnchors: readonly OverworldAnchorLike[];
  maxTownPairDistance?: number;
  townBridgeMaxDistance?: number;
  townPairPathTolerance?: number;
  townBridgePathTolerance?: number;
}): ConnectedRouteSegments {
  const cacheKey = `${maxTownPairDistance}:${townBridgeMaxDistance}:${townPairPathTolerance}:${townBridgePathTolerance}`;
  const cached = getConnectedRouteSegmentCache(
    townAnchors,
    bridgeAnchors,
    cacheKey
  );
  if (cached) {
    return cached;
  }

  const townPairSegments: RouteConnectionSegment[] = [];
  for (let index = 0; index < townAnchors.length; index += 1) {
    const start = townAnchors[index];
    if (!start) {
      continue;
    }
    for (let next = index + 1; next < townAnchors.length; next += 1) {
      const end = townAnchors[next];
      if (!end) {
        continue;
      }
      if (Math.hypot(start.x - end.x, start.y - end.y) > maxTownPairDistance) {
        continue;
      }
      townPairSegments.push(
        createRouteConnectionSegment(
          start.x,
          start.y,
          end.x,
          end.y,
          townPairPathTolerance
        )
      );
    }
  }

  const townBridgeSegments = townAnchors.map((townAnchor) => {
    const nearestBridge = findNearestAnchorDistance(
      bridgeAnchors,
      townAnchor.x,
      townAnchor.y
    );
    if (!nearestBridge || nearestBridge.distance > townBridgeMaxDistance) {
      return null;
    }
    return createRouteConnectionSegment(
      townAnchor.x,
      townAnchor.y,
      nearestBridge.anchor.x,
      nearestBridge.anchor.y,
      townBridgePathTolerance
    );
  });

  const resolved = {
    townPairSegments,
    townBridgeSegments,
  };
  setConnectedRouteSegmentCache(townAnchors, bridgeAnchors, cacheKey, resolved);
  return resolved;
}

export function canRouteConnectionSegmentAffectPoint(
  segment: RouteConnectionSegment,
  x: number,
  y: number
): boolean {
  return (
    x >= segment.minX &&
    x <= segment.maxX &&
    y >= segment.minY &&
    y <= segment.maxY
  );
}

export function hasLinearRouteSignal(
  x: number,
  y: number,
  sampleTerrainSignals?: ClassifyOverworldTileContext['sampleTerrainSignals'],
  options: {
    ridgeThreshold?: number;
    ridgeDominanceThreshold?: number;
  } = {}
) {
  if (!sampleTerrainSignals) {
    return false;
  }

  const ridgeThreshold = options.ridgeThreshold ?? 0.9;
  const ridgeDominanceThreshold = options.ridgeDominanceThreshold ?? 0.91;
  const roadSignal = sampleTerrainSignals(x, y).roadSignal;
  if (roadSignal <= ridgeThreshold) {
    return false;
  }

  const north = sampleTerrainSignals(x, y - 1).roadSignal;
  const east = sampleTerrainSignals(x + 1, y).roadSignal;
  const south = sampleTerrainSignals(x, y + 1).roadSignal;
  const west = sampleTerrainSignals(x - 1, y).roadSignal;
  const horizontalRidge =
    roadSignal >= north &&
    roadSignal >= south &&
    roadSignal > ridgeDominanceThreshold;
  const verticalRidge =
    roadSignal >= east &&
    roadSignal >= west &&
    roadSignal > ridgeDominanceThreshold;

  return horizontalRidge || verticalRidge;
}

function hasPredictedRoutePresence({
  x,
  y,
  townAnchors,
  bridgeAnchors,
  sampleTerrainSignals,
  hasConnectedRoutePathAt,
}: {
  x: number;
  y: number;
  townAnchors: OverworldAnchorLike[];
  bridgeAnchors: OverworldAnchorLike[];
  sampleTerrainSignals?: ClassifyOverworldTileContext['sampleTerrainSignals'];
  hasConnectedRoutePathAt?: (x: number, y: number) => boolean;
}) {
  if (
    (hasConnectedRoutePathAt?.(x, y) ??
      hasConnectedRoutePath({ x, y, townAnchors, bridgeAnchors }))
  ) {
    return true;
  }

  return hasLinearRouteSignal(x, y, sampleTerrainSignals);
}

export function createRoadsideRouteProfile({
  x,
  y,
  townAnchors,
  bridgeAnchors,
  sampleTerrainSignals,
  maxRouteSpanDepth = 6,
}: {
  x: number;
  y: number;
  townAnchors: OverworldAnchorLike[];
  bridgeAnchors: OverworldAnchorLike[];
  sampleTerrainSignals?: ClassifyOverworldTileContext['sampleTerrainSignals'];
  maxRouteSpanDepth?: number;
}) {
  const directions = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
  ] as const;
  const cachedSampleTerrainSignals =
    createCachedTerrainSignalSampler(sampleTerrainSignals);
  const hasConnectedRoutePathAt = createConnectedRoutePathResolver({
    townAnchors,
    bridgeAnchors,
  });
  const routePresenceCache = createCoordinateCache<boolean>();
  const hasRouteAt = (targetX: number, targetY: number) =>
    getCachedRoutePresence(routePresenceCache, targetX, targetY, () =>
      hasPredictedRoutePresence({
        x: targetX,
        y: targetY,
        townAnchors,
        bridgeAnchors,
        sampleTerrainSignals: cachedSampleTerrainSignals,
        hasConnectedRoutePathAt,
      })
    );
  const adjacentRouteCells: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < directions.length; index += 1) {
    const direction = directions[index]!;
    const neighborX = x + direction.dx;
    const neighborY = y + direction.dy;
    if (hasRouteAt(neighborX, neighborY)) {
      adjacentRouteCells.push({ x: neighborX, y: neighborY });
    }
  }
  const isRouteJunction = (targetX: number, targetY: number) => {
    const north = hasRouteAt(targetX, targetY - 1);
    const east = hasRouteAt(targetX + 1, targetY);
    const south = hasRouteAt(targetX, targetY + 1);
    const west = hasRouteAt(targetX - 1, targetY);
    let connectedCount = 0;
    if (north) connectedCount += 1;
    if (east) connectedCount += 1;
    if (south) connectedCount += 1;
    if (west) connectedCount += 1;
    const touchesHorizontal = east || west;
    const touchesVertical = north || south;
    return (
      connectedCount >= 3 ||
      (connectedCount >= 2 && touchesHorizontal && touchesVertical)
    );
  };
  const frontier: Array<{ x: number; y: number; depth: number }> = [];
  const visited = createCoordinateCache<boolean>();
  for (let index = 0; index < adjacentRouteCells.length; index += 1) {
    const point = adjacentRouteCells[index]!;
    frontier.push({ x: point.x, y: point.y, depth: 1 });
    visited.set(point.x, point.y, true);
  }
  let routeSpan = 0;

  while (frontier.length > 0) {
    const current = frontier.shift()!;
    routeSpan += 1;
    if (current.depth >= maxRouteSpanDepth) {
      continue;
    }

    for (const direction of directions) {
      const nextX = current.x + direction.dx;
      const nextY = current.y + direction.dy;
      if (visited.has(nextX, nextY) || !hasRouteAt(nextX, nextY)) {
        continue;
      }
      visited.set(nextX, nextY, true);
      frontier.push({ x: nextX, y: nextY, depth: current.depth + 1 });
    }
  }

  return {
    onRoute: hasRouteAt(x, y),
    adjacentRoadCount: adjacentRouteCells.length,
    atJunction:
      isRouteJunction(x, y) ||
      adjacentRouteCells.some(({ x: neighborX, y: neighborY }) =>
        isRouteJunction(neighborX, neighborY)
      ),
    routeSpan,
  };
}

function createCachedTerrainSignalSampler(
  sampleTerrainSignals?: ClassifyOverworldTileContext['sampleTerrainSignals']
): ClassifyOverworldTileContext['sampleTerrainSignals'] {
  if (!sampleTerrainSignals) {
    return sampleTerrainSignals;
  }
  const cache =
    createCoordinateCache<
      ReturnType<NonNullable<typeof sampleTerrainSignals>>
    >();
  return (x: number, y: number) =>
    cache.getOrCreate(x, y, () => sampleTerrainSignals(x, y));
}

function getCachedRoutePresence(
  cache: ReturnType<typeof createCoordinateCache<boolean>>,
  x: number,
  y: number,
  resolve: () => boolean
): boolean {
  const cached = cache.get(x, y);
  if (cached !== undefined) {
    return cached;
  }
  const resolved = resolve();
  cache.set(x, y, resolved);
  return resolved;
}

function createRouteConnectionSegment(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  tolerance: number
): RouteConnectionSegment {
  return {
    startX,
    startY,
    endX,
    endY,
    tolerance,
    minX: Math.min(startX, endX) - tolerance,
    maxX: Math.max(startX, endX) + tolerance,
    minY: Math.min(startY, endY) - tolerance,
    maxY: Math.max(startY, endY) + tolerance,
  };
}

function getConnectedRouteSegmentCache(
  townAnchors: readonly OverworldAnchorLike[],
  bridgeAnchors: readonly OverworldAnchorLike[],
  cacheKey: string
): ConnectedRouteSegments | undefined {
  return connectedRouteSegmentCaches
    .get(townAnchors)
    ?.get(bridgeAnchors)
    ?.get(cacheKey);
}

function setConnectedRouteSegmentCache(
  townAnchors: readonly OverworldAnchorLike[],
  bridgeAnchors: readonly OverworldAnchorLike[],
  cacheKey: string,
  value: ConnectedRouteSegments
): void {
  let bridgeCache = connectedRouteSegmentCaches.get(townAnchors);
  if (!bridgeCache) {
    bridgeCache = new WeakMap();
    connectedRouteSegmentCaches.set(townAnchors, bridgeCache);
  }
  let optionCache = bridgeCache.get(bridgeAnchors);
  if (!optionCache) {
    optionCache = new Map();
    bridgeCache.set(bridgeAnchors, optionCache);
  }
  optionCache.set(cacheKey, value);
}

export function createBoundarySurfaceProfile({
  surfaceHeight,
  boundaryRole,
  underlayKind = null,
  chamferEligible = false,
  boundaryTransition = null,
}: {
  surfaceHeight: number;
  boundaryRole: SurfaceBoundaryRole3D;
  underlayKind?: string | null;
  chamferEligible?: boolean;
  boundaryTransition?: SurfaceBoundaryTransition3D | null;
}): SurfaceProfile3D {
  return {
    surfaceHeight,
    boundaryRole,
    underlayKind,
    chamferEligible,
    boundaryTransition,
  };
}

export function resolveDominantNeighborFloorKind3D(
  context: ResolveFloorKind3DContext,
  options: {
    isExcludedKind?: (kind: Kind) => boolean;
  } = {}
) {
  const candidates = new Map<Kind, number>();

  for (let y = context.tileY - 1; y <= context.tileY + 1; y += 1) {
    for (let x = context.tileX - 1; x <= context.tileX + 1; x += 1) {
      if (x === context.tileX && y === context.tileY) {
        continue;
      }
      const neighborTile = context.state.getCurrentTile(x, y);
      const kind = neighborTile.kind;
      if (options.isExcludedKind?.(kind)) {
        continue;
      }
      candidates.set(kind, (candidates.get(kind) ?? 0) + 1);
    }
  }

  let dominantKind: Kind | null = null;
  let dominantCount = Number.NEGATIVE_INFINITY;
  for (const [kind, count] of candidates.entries()) {
    if (count > dominantCount) {
      dominantKind = kind;
      dominantCount = count;
    }
  }

  return dominantKind;
}

function findNearestAnchorDistance<TAnchor extends { x: number; y: number }>(
  anchors: readonly TAnchor[],
  x: number,
  y: number
): { anchor: TAnchor; distance: number; index: number } | undefined {
  let nearestAnchor: TAnchor | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;
  let nearestIndex = -1;

  for (let index = 0; index < anchors.length; index += 1) {
    const anchor = anchors[index];
    if (!anchor) {
      continue;
    }

    const distance = Math.hypot(x - anchor.x, y - anchor.y);
    if (distance >= nearestDistance) {
      continue;
    }

    nearestAnchor = anchor;
    nearestDistance = distance;
    nearestIndex = index;
  }

  if (!nearestAnchor) {
    return undefined;
  }

  return {
    anchor: nearestAnchor,
    distance: nearestDistance,
    index: nearestIndex,
  };
}

export function createThresholdTerrainClassifier(options: {
  kind: KnownTileKind;
  threshold: number;
  getSignal(context: ClassifyOverworldTileContext): number;
  comparator?: 'gt' | 'gte' | 'lt' | 'lte';
  allowedBaseKinds?: readonly Kind[];
  blockedKinds?: readonly Kind[];
  createTile?(context: ClassifyOverworldTileContext): TileLike | null;
}) {
  const comparator = options.comparator ?? 'gt';
  const allowedBaseKinds: readonly Kind[] = options.allowedBaseKinds ?? [
    'plains',
  ];
  const blockedKinds = new Set<Kind>(options.blockedKinds ?? []);

  return function classifyThresholdTerrainTile(
    context: ClassifyOverworldTileContext
  ): TileLike | null {
    if (!allowedBaseKinds.includes(context.tile.kind)) {
      return null;
    }
    if (blockedKinds.has(context.tile.kind)) {
      return null;
    }

    const signal = options.getSignal(context);
    const passesThreshold =
      comparator === 'gte'
        ? signal >= options.threshold
        : comparator === 'lt'
          ? signal < options.threshold
          : comparator === 'lte'
            ? signal <= options.threshold
            : signal > options.threshold;

    if (!passesThreshold) {
      return null;
    }

    return options.createTile?.(context) ?? { kind: options.kind };
  };
}

export function withTerrainTileClassifier<TTile extends TilePlugin>(
  tile: TTile,
  classifyTerrainTile: NonNullable<TilePlugin['classifyTerrainTile']>
): TTile {
  return {
    ...tile,
    classifyTerrainTile(context: ClassifyOverworldTileContext) {
      return classifyTerrainTile(context);
    },
  };
}
