import type {
  ClassifyOverworldTileContext,
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
