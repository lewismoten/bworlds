import type {
  ClassifyOverworldTileContext,
  OverworldAnchorLike,
  ResolveFloorKind3DContext,
  SurfaceBoundaryRole3D,
  SurfaceBoundaryTransition3D,
  SurfaceProfile3D,
  TileLike,
  TilePlugin,
  TraversalProfile3D,
} from '@bworlds/plugin-api';

export function createRouteTraversalProfile(
  overrides: Partial<TraversalProfile3D> = {}
): TraversalProfile3D {
  return {
    travelGroup: 'route',
    ...overrides,
  };
}

export const DEFAULT_ROUTE_TERMINAL_KINDS = new Set([
  'sign',
  'town',
  'cave',
  'dungeon',
]);

export const DEFAULT_BRIDGE_WATER_KINDS = new Set(['river', 'ocean']);
export const DEFAULT_WATER_KINDS = new Set(['river', 'ocean']);
export const DEFAULT_WATER_OR_CROSSING_KINDS = new Set([
  ...DEFAULT_WATER_KINDS,
  'bridge',
]);

export function isRouteTerminalKind(
  kind: string,
  terminalKinds: ReadonlySet<string> = DEFAULT_ROUTE_TERMINAL_KINDS
) {
  return terminalKinds.has(kind);
}

export function isBridgeWaterKind(
  kind: string,
  waterKinds: ReadonlySet<string> = DEFAULT_BRIDGE_WATER_KINDS
) {
  return waterKinds.has(kind);
}

export function isWaterKind(
  kind: string,
  waterKinds: ReadonlySet<string> = DEFAULT_WATER_KINDS
) {
  return waterKinds.has(kind);
}

export function isWaterOrCrossingKind(
  kind: string,
  kinds: ReadonlySet<string> = DEFAULT_WATER_OR_CROSSING_KINDS
) {
  return kinds.has(kind);
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
  const nearestTown = townAnchors
    .map((anchor) => ({
      anchor,
      distance: Math.hypot(x - anchor.x, y - anchor.y),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (
    nearestTown &&
    nearestTown.distance < townAnchorSnapDistance &&
    (Math.abs(x - nearestTown.anchor.x) < townAnchorAxisTolerance ||
      Math.abs(y - nearestTown.anchor.y) < townAnchorAxisTolerance)
  ) {
    return true;
  }

  for (let index = 0; index < townAnchors.length; index += 1) {
    for (let next = index + 1; next < townAnchors.length; next += 1) {
      const a = townAnchors[index];
      const b = townAnchors[next];
      if (Math.hypot(a.x - b.x, a.y - b.y) > maxTownPairDistance) {
        continue;
      }
      if (distanceToLineSegment(x, y, a.x, a.y, b.x, b.y) < townPairPathTolerance) {
        return true;
      }
    }
  }

  if (nearestTown) {
    const nearestBridge = bridgeAnchors
      .map((anchor) => ({
        anchor,
        distance: Math.hypot(
          nearestTown.anchor.x - anchor.x,
          nearestTown.anchor.y - anchor.y
        ),
      }))
      .sort((left, right) => left.distance - right.distance)[0];

    if (
      nearestBridge &&
      nearestBridge.distance <= townBridgeMaxDistance &&
      distanceToLineSegment(
        x,
        y,
        nearestTown.anchor.x,
        nearestTown.anchor.y,
        nearestBridge.anchor.x,
        nearestBridge.anchor.y
      ) < townBridgePathTolerance
    ) {
      return true;
    }
  }

  return bridgeAnchors.some(
    (bridge) => Math.hypot(x - bridge.x, y - bridge.y) < bridgeAnchorSnapDistance
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
}: {
  x: number;
  y: number;
  townAnchors: OverworldAnchorLike[];
  bridgeAnchors: OverworldAnchorLike[];
  sampleTerrainSignals?: ClassifyOverworldTileContext['sampleTerrainSignals'];
}) {
  if (hasConnectedRoutePath({ x, y, townAnchors, bridgeAnchors })) {
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
  ];
  const hasRouteAt = (targetX: number, targetY: number) =>
    hasPredictedRoutePresence({
      x: targetX,
      y: targetY,
      townAnchors,
      bridgeAnchors,
      sampleTerrainSignals,
    });
  const adjacentRouteCells = directions
    .map(({ dx, dy }) => ({ x: x + dx, y: y + dy }))
    .filter(({ x: neighborX, y: neighborY }) => hasRouteAt(neighborX, neighborY));
  const isRouteJunction = (targetX: number, targetY: number) => {
    const north = hasRouteAt(targetX, targetY - 1);
    const east = hasRouteAt(targetX + 1, targetY);
    const south = hasRouteAt(targetX, targetY + 1);
    const west = hasRouteAt(targetX - 1, targetY);
    const connectedCount = [north, east, south, west].filter(Boolean).length;
    const touchesHorizontal = east || west;
    const touchesVertical = north || south;
    return (
      connectedCount >= 3 ||
      (connectedCount >= 2 && touchesHorizontal && touchesVertical)
    );
  };
  const frontier = adjacentRouteCells.map((point) => ({ ...point, depth: 1 }));
  const visited = new Set(frontier.map((point) => `${point.x}:${point.y}`));
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
      const key = `${nextX}:${nextY}`;
      if (visited.has(key) || !hasRouteAt(nextX, nextY)) {
        continue;
      }
      visited.add(key);
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
    isExcludedKind?: (kind: string) => boolean;
  } = {}
) {
  const candidates = new Map<string, number>();

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

  return [...candidates.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

export function createThresholdTerrainClassifier(options: {
  kind: string;
  threshold: number;
  getSignal(context: ClassifyOverworldTileContext): number;
  comparator?: 'gt' | 'gte' | 'lt' | 'lte';
  allowedBaseKinds?: readonly string[];
  blockedKinds?: readonly string[];
  createTile?(
    context: ClassifyOverworldTileContext
  ): TileLike | null;
}) {
  const comparator = options.comparator ?? 'gt';
  const allowedBaseKinds = options.allowedBaseKinds ?? ['plains'];
  const blockedKinds = new Set(options.blockedKinds ?? []);

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
