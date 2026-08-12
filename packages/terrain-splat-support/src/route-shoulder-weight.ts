import type { TerrainRouteWidthPlan } from './route-width-plan.ts';

export type TerrainRouteShoulderWeights = {
  distanceFromCenter: number;
  surfaceWeight: number;
  shoulderWeight: number;
  totalRouteWeight: number;
};

export function resolveTerrainRouteShoulderWeights(params: {
  distanceFromCenter: number;
  widthPlan: Pick<TerrainRouteWidthPlan, 'surfaceWidth' | 'shoulderWidth'>;
}): TerrainRouteShoulderWeights {
  const distanceFromCenter = Math.abs(params.distanceFromCenter);
  const halfSurfaceWidth = params.widthPlan.surfaceWidth * 0.5;
  const shoulderWidth = Math.max(0, params.widthPlan.shoulderWidth);

  if (distanceFromCenter <= halfSurfaceWidth) {
    return {
      distanceFromCenter,
      surfaceWeight: 1,
      shoulderWeight: 0,
      totalRouteWeight: 1,
    };
  }

  if (shoulderWidth <= 0) {
    return {
      distanceFromCenter,
      surfaceWeight: 0,
      shoulderWeight: 0,
      totalRouteWeight: 0,
    };
  }

  const shoulderDistance = distanceFromCenter - halfSurfaceWidth;
  const shoulderWeight = clamp01(1 - shoulderDistance / shoulderWidth);

  return {
    distanceFromCenter,
    surfaceWeight: 0,
    shoulderWeight,
    totalRouteWeight: shoulderWeight,
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
