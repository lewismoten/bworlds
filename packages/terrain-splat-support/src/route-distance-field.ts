import type { TerrainRouteWidthPlan } from './route-width-plan.ts';
import { resolveTerrainRouteShoulderWeights } from './route-shoulder-weight.ts';

export type TerrainRouteWorldPoint = {
  x: number;
  z: number;
};

export type TerrainRouteDistanceFieldRoute = {
  routeId: string;
  points: readonly TerrainRouteWorldPoint[];
  widthPlan: Pick<TerrainRouteWidthPlan, 'surfaceWidth' | 'shoulderWidth'>;
  weightScale?: number;
};

export type TerrainRouteDistanceFieldContribution = {
  routeId: string;
  distanceFromCenter: number;
  nearestPoint: TerrainRouteWorldPoint;
  segmentIndex: number;
  surfaceWeight: number;
  shoulderWeight: number;
  totalRouteWeight: number;
};

export type TerrainRouteDistanceFieldSample = {
  samplePoint: TerrainRouteWorldPoint;
  nearestDistance: number;
  nearestPoint: TerrainRouteWorldPoint | null;
  nearestRouteId: string | null;
  totalRouteWeight: number;
  combinedSurfaceWeight: number;
  combinedShoulderWeight: number;
  intersectionCount: number;
  contributions: readonly TerrainRouteDistanceFieldContribution[];
};

export function sampleTerrainRouteDistanceField(params: {
  samplePoint: TerrainRouteWorldPoint;
  routes: readonly TerrainRouteDistanceFieldRoute[];
}): TerrainRouteDistanceFieldSample {
  const contributions: TerrainRouteDistanceFieldContribution[] = [];

  for (const route of params.routes) {
    const contribution = sampleRouteContribution(params.samplePoint, route);
    if (contribution === null || !(contribution.totalRouteWeight > 0)) {
      continue;
    }
    contributions.push(contribution);
  }

  contributions.sort((left, right) => {
    if (left.totalRouteWeight !== right.totalRouteWeight) {
      return right.totalRouteWeight - left.totalRouteWeight;
    }
    if (left.distanceFromCenter !== right.distanceFromCenter) {
      return left.distanceFromCenter - right.distanceFromCenter;
    }
    return left.routeId.localeCompare(right.routeId);
  });

  const combinedSurfaceWeight = combineWeights(
    contributions.map((contribution) => contribution.surfaceWeight)
  );
  const combinedShoulderWeight = combineWeights(
    contributions.map((contribution) => contribution.shoulderWeight)
  );
  const totalRouteWeight = combineWeights(
    contributions.map((contribution) => contribution.totalRouteWeight)
  );
  const nearest = resolveNearestContribution(contributions);

  return {
    samplePoint: params.samplePoint,
    nearestDistance: nearest?.distanceFromCenter ?? Number.POSITIVE_INFINITY,
    nearestPoint: nearest?.nearestPoint ?? null,
    nearestRouteId: nearest?.routeId ?? null,
    totalRouteWeight,
    combinedSurfaceWeight,
    combinedShoulderWeight,
    intersectionCount: contributions.length,
    contributions,
  };
}

function sampleRouteContribution(
  samplePoint: TerrainRouteWorldPoint,
  route: TerrainRouteDistanceFieldRoute
): TerrainRouteDistanceFieldContribution | null {
  if (route.points.length < 2) {
    return null;
  }

  let nearestDistance = Number.POSITIVE_INFINITY;
  let nearestPoint: TerrainRouteWorldPoint | null = null;
  let nearestSegmentIndex = -1;

  for (let index = 0; index < route.points.length - 1; index += 1) {
    const start = route.points[index]!;
    const end = route.points[index + 1]!;
    const projected = projectPointOntoSegment(samplePoint, start, end);
    const distance = distanceBetween(samplePoint, projected);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestPoint = projected;
      nearestSegmentIndex = index;
    }
  }

  if (nearestPoint === null || nearestSegmentIndex < 0) {
    return null;
  }

  const weightScale = clamp01(route.weightScale ?? 1);
  const weights = resolveTerrainRouteShoulderWeights({
    distanceFromCenter: nearestDistance,
    widthPlan: route.widthPlan,
  });

  return {
    routeId: route.routeId,
    distanceFromCenter: nearestDistance,
    nearestPoint,
    segmentIndex: nearestSegmentIndex,
    surfaceWeight: weights.surfaceWeight * weightScale,
    shoulderWeight: weights.shoulderWeight * weightScale,
    totalRouteWeight: weights.totalRouteWeight * weightScale,
  };
}

function resolveNearestContribution(
  contributions: readonly TerrainRouteDistanceFieldContribution[]
): TerrainRouteDistanceFieldContribution | null {
  let nearest: TerrainRouteDistanceFieldContribution | null = null;
  for (const contribution of contributions) {
    if (
      nearest === null ||
      contribution.distanceFromCenter < nearest.distanceFromCenter ||
      (contribution.distanceFromCenter === nearest.distanceFromCenter &&
        contribution.routeId.localeCompare(nearest.routeId) < 0)
    ) {
      nearest = contribution;
    }
  }
  return nearest;
}

function combineWeights(weights: readonly number[]): number {
  let remaining = 1;
  for (const weight of weights) {
    remaining *= 1 - clamp01(weight);
  }
  return clamp01(1 - remaining);
}

function projectPointOntoSegment(
  point: TerrainRouteWorldPoint,
  start: TerrainRouteWorldPoint,
  end: TerrainRouteWorldPoint
): TerrainRouteWorldPoint {
  const deltaX = end.x - start.x;
  const deltaZ = end.z - start.z;
  const lengthSquared = deltaX * deltaX + deltaZ * deltaZ;

  if (!(lengthSquared > 0)) {
    return { x: start.x, z: start.z };
  }

  const projection = clamp01(
    ((point.x - start.x) * deltaX + (point.z - start.z) * deltaZ) /
      lengthSquared
  );

  return {
    x: start.x + deltaX * projection,
    z: start.z + deltaZ * projection,
  };
}

function distanceBetween(
  left: TerrainRouteWorldPoint,
  right: TerrainRouteWorldPoint
): number {
  return Math.hypot(left.x - right.x, left.z - right.z);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
