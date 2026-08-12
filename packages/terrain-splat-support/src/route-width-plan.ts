import type { Kind } from '@bworlds/plugin-api';

export type TerrainRouteClass =
  'trail' | 'local-road' | 'main-road' | 'highway';

export type TerrainRouteWidthPlan = {
  routeClass: TerrainRouteClass | null;
  surfaceWidth: number;
  shoulderWidth: number;
  totalWidth: number;
  reason: string;
};

export function createTerrainRouteWidthPlan(params: {
  kind: Kind;
  roadSignal?: number;
  routeClass?: TerrainRouteClass;
  trafficIntensity?: number;
}): TerrainRouteWidthPlan {
  if (params.kind === 'path') {
    const routeClass = params.routeClass ?? 'trail';
    const trafficIntensity = clamp01(
      params.trafficIntensity ?? params.roadSignal ?? 0
    );
    const surfaceWidth = lerp(0.14, 0.22, trafficIntensity);
    const shoulderWidth = lerp(0.06, 0.12, trafficIntensity);
    return {
      routeClass,
      surfaceWidth,
      shoulderWidth,
      totalWidth: surfaceWidth + shoulderWidth * 2,
      reason: 'trail width comes from trail metadata and traffic intensity',
    };
  }

  if (params.kind === 'road') {
    const routeClass =
      params.routeClass ?? resolveRoadRouteClass(params.roadSignal);
    const trafficIntensity = clamp01(
      params.trafficIntensity ?? params.roadSignal ?? 0.5
    );
    const baseSurfaceWidth = resolveRoadBaseSurfaceWidth(routeClass);
    const extraSurfaceWidth = resolveRoadExtraSurfaceWidth(routeClass);
    const baseShoulderWidth = resolveRoadBaseShoulderWidth(routeClass);
    const extraShoulderWidth = resolveRoadExtraShoulderWidth(routeClass);
    const surfaceWidth =
      baseSurfaceWidth + extraSurfaceWidth * trafficIntensity;
    const shoulderWidth =
      baseShoulderWidth + extraShoulderWidth * trafficIntensity;
    return {
      routeClass,
      surfaceWidth,
      shoulderWidth,
      totalWidth: surfaceWidth + shoulderWidth * 2,
      reason:
        'road width comes from route class metadata and traffic intensity',
    };
  }

  return {
    routeClass: null,
    surfaceWidth: 0,
    shoulderWidth: 0,
    totalWidth: 0,
    reason: 'terrain kind does not require a route width plan',
  };
}

function resolveRoadRouteClass(
  roadSignal: number | undefined
): TerrainRouteClass {
  const normalized = clamp01(roadSignal ?? 0);
  if (normalized >= 0.9) {
    return 'highway';
  }
  if (normalized >= 0.65) {
    return 'main-road';
  }
  return 'local-road';
}

function resolveRoadBaseSurfaceWidth(routeClass: TerrainRouteClass): number {
  switch (routeClass) {
    case 'highway':
      return 0.34;
    case 'main-road':
      return 0.28;
    case 'local-road':
      return 0.22;
    case 'trail':
      return 0.18;
  }
}

function resolveRoadExtraSurfaceWidth(routeClass: TerrainRouteClass): number {
  switch (routeClass) {
    case 'highway':
      return 0.12;
    case 'main-road':
      return 0.08;
    case 'local-road':
      return 0.06;
    case 'trail':
      return 0.04;
  }
}

function resolveRoadBaseShoulderWidth(routeClass: TerrainRouteClass): number {
  switch (routeClass) {
    case 'highway':
      return 0.14;
    case 'main-road':
      return 0.1;
    case 'local-road':
      return 0.08;
    case 'trail':
      return 0.06;
  }
}

function resolveRoadExtraShoulderWidth(routeClass: TerrainRouteClass): number {
  switch (routeClass) {
    case 'highway':
      return 0.08;
    case 'main-road':
      return 0.06;
    case 'local-road':
      return 0.04;
    case 'trail':
      return 0.02;
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * clamp01(amount);
}
