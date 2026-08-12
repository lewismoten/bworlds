import type { Kind, WorldEnvironmentWeatherConditionLike } from '@bworlds/plugin-api';
import type { TerrainMaterialLayerId } from './index.ts';
import {
  resolveTerrainRouteAppearanceProfile,
  type TerrainRouteAppearanceProfile,
} from './route-appearance-plan.ts';
import {
  createTerrainRouteGeometryPlan,
  type TerrainRouteGeometryPlan,
} from './route-geometry-plan.ts';
import {
  createTerrainRouteSurfacePlan,
  type TerrainRouteSurfaceHint,
  type TerrainRouteSurfacePlan,
} from './route-surface-plan.ts';
import {
  createTerrainRouteWidthPlan,
  type TerrainRouteClass,
  type TerrainRouteWidthPlan,
} from './route-width-plan.ts';

export type TerrainRouteRenderPlanClassification =
  | 'simple-road'
  | 'trail'
  | 'worn-path'
  | 'overlay-trail'
  | 'geometry-fallback'
  | 'none';

export type TerrainRouteRenderPlanMode = 'splat' | 'overlay' | 'geometry' | 'none';

export type TerrainRouteRenderPlan = {
  mode: TerrainRouteRenderPlanMode;
  classification: TerrainRouteRenderPlanClassification;
  removeSeparateRoadMesh: boolean;
  requiresSeparateRouteMesh: boolean;
  widthPlan: TerrainRouteWidthPlan;
  surfacePlan: TerrainRouteSurfacePlan;
  geometryPlan: TerrainRouteGeometryPlan;
  appearanceProfile: TerrainRouteAppearanceProfile;
  reason: string;
};

export function createTerrainRouteRenderPlan(params: {
  kind: Kind;
  roadSignal?: number;
  trafficIntensity?: number;
  routeClass?: TerrainRouteClass;
  routeSurface?: TerrainRouteSurfaceHint;
  sustainedWetness?: number;
  snowAccumulation?: number;
  snowMelt?: number;
  weather?: Pick<
    WorldEnvironmentWeatherConditionLike,
    'kind' | 'intensity' | 'precipitation' | 'temperature'
  >;
  prefersOverlay?: boolean;
  prefersSplat?: boolean;
  bridgeLike?: boolean;
  tunnelLike?: boolean;
  raisedCausewayLike?: boolean;
  requiresSteps?: boolean;
  retainingWallHeight?: number;
  surfaceHeightDelta?: number;
  unsupportedShape?: boolean;
  dirtRoadLayerId: TerrainMaterialLayerId;
  gravelRoadLayerId: TerrainMaterialLayerId;
  stoneRoadLayerId?: TerrainMaterialLayerId;
  muddyRoadLayerId?: TerrainMaterialLayerId;
  dirtTrailLayerId?: TerrainMaterialLayerId;
  gravelTrailLayerId?: TerrainMaterialLayerId;
  grassTrailLayerId?: TerrainMaterialLayerId;
}): TerrainRouteRenderPlan {
  const widthPlan = createTerrainRouteWidthPlan({
    kind: params.kind,
    roadSignal: params.roadSignal,
    routeClass: params.routeClass,
    trafficIntensity: params.trafficIntensity,
  });
  const geometryPlan = createTerrainRouteGeometryPlan({
    kind: params.kind,
    bridgeLike: params.bridgeLike,
    tunnelLike: params.tunnelLike,
    raisedCausewayLike: params.raisedCausewayLike,
    requiresSteps: params.requiresSteps,
    retainingWallHeight: params.retainingWallHeight,
    surfaceHeightDelta: params.surfaceHeightDelta,
    unsupportedShape: params.unsupportedShape,
  });
  const prefersSplat =
    params.prefersSplat ??
    shouldPreferSplatForPath({
      kind: params.kind,
      routeSurface: params.routeSurface,
      roadSignal: params.roadSignal,
      trafficIntensity: params.trafficIntensity,
    });
  const surfacePlan = createTerrainRouteSurfacePlan({
    kind: params.kind,
    roadSignal: params.roadSignal,
    trafficIntensity: params.trafficIntensity,
    routeClass: params.routeClass,
    routeSurface: params.routeSurface,
    prefersOverlay: params.prefersOverlay,
    prefersSplat,
    dirtRoadLayerId: params.dirtRoadLayerId,
    gravelRoadLayerId: params.gravelRoadLayerId,
    stoneRoadLayerId: params.stoneRoadLayerId,
    muddyRoadLayerId: params.muddyRoadLayerId,
    dirtTrailLayerId: params.dirtTrailLayerId,
    gravelTrailLayerId: params.gravelTrailLayerId,
    grassTrailLayerId: params.grassTrailLayerId,
  });
  const appearanceProfile = resolveTerrainRouteAppearanceProfile({
    kind: params.kind,
    surfaceType: surfacePlan.surfaceType,
    trafficIntensity: params.trafficIntensity,
    roadSignal: params.roadSignal,
    weather: params.weather,
    sustainedWetness: params.sustainedWetness,
    snowAccumulation: params.snowAccumulation,
    snowMelt: params.snowMelt,
  });

  if (geometryPlan.mode === 'geometry') {
    return {
      mode: 'geometry',
      classification: params.kind === 'road' || params.kind === 'path'
        ? 'geometry-fallback'
        : 'none',
      removeSeparateRoadMesh: false,
      requiresSeparateRouteMesh: true,
      widthPlan,
      surfacePlan,
      geometryPlan,
      appearanceProfile,
      reason: `route keeps separate geometry because ${geometryPlan.reason}`,
    };
  }

  if (surfacePlan.mode === 'overlay') {
    return {
      mode: 'overlay',
      classification: params.kind === 'path' ? 'overlay-trail' : 'none',
      removeSeparateRoadMesh: false,
      requiresSeparateRouteMesh: true,
      widthPlan,
      surfacePlan,
      geometryPlan,
      appearanceProfile,
      reason: `route keeps an overlay because ${surfacePlan.reason}`,
    };
  }

  if (surfacePlan.mode === 'splat') {
    const classification = classifySplatRoute({
      kind: params.kind,
      appearanceProfile,
    });
    return {
      mode: 'splat',
      classification,
      removeSeparateRoadMesh:
        classification === 'simple-road' ||
        classification === 'trail' ||
        classification === 'worn-path',
      requiresSeparateRouteMesh: false,
      widthPlan,
      surfacePlan,
      geometryPlan,
      appearanceProfile,
      reason: createSplatReason(classification, surfacePlan.reason),
    };
  }

  return {
    mode: 'none',
    classification: 'none',
    removeSeparateRoadMesh: false,
    requiresSeparateRouteMesh: false,
    widthPlan,
    surfacePlan,
    geometryPlan,
    appearanceProfile,
    reason: 'terrain kind does not require route splat or mesh planning',
  };
}

function shouldPreferSplatForPath(params: {
  kind: Kind;
  routeSurface?: TerrainRouteSurfaceHint;
  roadSignal?: number;
  trafficIntensity?: number;
}): boolean {
  if (params.kind !== 'path') {
    return false;
  }
  const trafficIntensity = clamp01(
    params.trafficIntensity ?? params.roadSignal ?? 0
  );
  if (params.routeSurface === 'grass' || params.routeSurface === 'dirt') {
    return true;
  }
  return trafficIntensity <= 0.32;
}

function classifySplatRoute(params: {
  kind: Kind;
  appearanceProfile: TerrainRouteAppearanceProfile;
}): TerrainRouteRenderPlanClassification {
  if (params.kind === 'road') {
    return 'simple-road';
  }
  if (params.kind === 'path') {
    if (params.appearanceProfile.wornCenterStrength >= 0.22) {
      return 'worn-path';
    }
    return 'trail';
  }
  return 'none';
}

function createSplatReason(
  classification: TerrainRouteRenderPlanClassification,
  surfaceReason: string
): string {
  switch (classification) {
    case 'simple-road':
      return `simple roads stay on terrain splat layers so separate road meshes can be removed when no structure fallback is needed; ${surfaceReason}`;
    case 'trail':
      return `light trails can stay on terrain splat layers instead of separate trail meshes; ${surfaceReason}`;
    case 'worn-path':
      return `worn paths can stay on terrain splat layers and express wear through appearance weights instead of separate meshes; ${surfaceReason}`;
    default:
      return surfaceReason;
  }
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
