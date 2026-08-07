import type {
  ClassifyOverworldTileContext,
  ResolveFloorKind3DContext,
  SurfaceBoundaryRole3D,
  SurfaceBoundaryTransition3D,
  SurfaceProfile3D,
  TileLike,
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
