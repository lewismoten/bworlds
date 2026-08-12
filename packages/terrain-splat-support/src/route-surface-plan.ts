import type { Kind } from '@bworlds/plugin-api';
import type { TerrainMaterialLayerId } from './index.ts';
import type { TerrainRouteClass } from './route-width-plan.ts';

export type TerrainRouteSurfaceMode = 'splat' | 'overlay' | 'none';
export type TerrainRouteSurfaceHint =
  | 'dirt'
  | 'gravel'
  | 'stone'
  | 'grass'
  | 'mud';
export type TerrainRouteSurfaceType =
  | 'broad-dirt-road'
  | 'broad-gravel-road'
  | 'broad-stone-road'
  | 'broad-muddy-road'
  | 'narrow-dirt-trail'
  | 'narrow-gravel-trail'
  | 'narrow-grass-trail'
  | 'none';

export type TerrainRouteSurfacePlan = {
  mode: TerrainRouteSurfaceMode;
  surfaceType: TerrainRouteSurfaceType;
  layerId: TerrainMaterialLayerId | null;
  overlayWidth: number;
  shoulderBlendWidth: number;
  reason: string;
};

export function createTerrainRouteSurfacePlan(params: {
  kind: Kind;
  roadSignal?: number;
  trafficIntensity?: number;
  routeClass?: TerrainRouteClass;
  routeSurface?: TerrainRouteSurfaceHint;
  prefersOverlay?: boolean;
  prefersSplat?: boolean;
  dirtRoadLayerId: TerrainMaterialLayerId;
  gravelRoadLayerId: TerrainMaterialLayerId;
  stoneRoadLayerId?: TerrainMaterialLayerId;
  muddyRoadLayerId?: TerrainMaterialLayerId;
  dirtTrailLayerId?: TerrainMaterialLayerId;
  gravelTrailLayerId?: TerrainMaterialLayerId;
  grassTrailLayerId?: TerrainMaterialLayerId;
}): TerrainRouteSurfacePlan {
  const roadSignal = clamp01(params.roadSignal ?? 0);
  const trafficIntensity = clamp01(params.trafficIntensity ?? roadSignal);

  if (params.kind === 'road') {
    const roadSurface = resolveRoadSurfaceHint({
      roadSignal,
      routeSurface: params.routeSurface,
      routeClass: params.routeClass,
      trafficIntensity,
    });
    const resolved = resolveRoadSurfaceLayer(roadSurface, params);
    return {
      mode: params.prefersOverlay ? 'overlay' : 'splat',
      surfaceType: resolved.surfaceType,
      layerId: resolved.layerId,
      overlayWidth: params.prefersOverlay ? 0.3 : 0,
      shoulderBlendWidth: params.prefersOverlay ? 0.18 : 0.32,
      reason: params.prefersOverlay
        ? `road requested overlay rendering explicitly using the ${roadSurface} route surface`
        : `broad roads stay in terrain splats by default using the ${roadSurface} route surface`,
    };
  }

  if (params.kind === 'path') {
    const trailSurface = resolveTrailSurfaceHint({
      roadSignal,
      routeSurface: params.routeSurface,
      trafficIntensity,
    });
    const resolved = resolveTrailSurfaceLayer(trailSurface, params);
    const prefersSplat = params.prefersSplat === true;
    const isGrassTrail = trailSurface === 'grass';
    return {
      mode: prefersSplat ? 'splat' : 'overlay',
      surfaceType: resolved.surfaceType,
      layerId: resolved.layerId,
      overlayWidth: prefersSplat ? 0 : isGrassTrail ? 0.14 : 0.18,
      shoulderBlendWidth: isGrassTrail ? 0.08 : 0.1,
      reason: prefersSplat
        ? `trail requested splat rendering using the ${trailSurface} route surface`
        : `narrow trails render as overlays with tighter blend zones using the ${trailSurface} route surface`,
    };
  }

  return {
    mode: 'none',
    surfaceType: 'none',
    layerId: null,
    overlayWidth: 0,
    shoulderBlendWidth: 0,
    reason: 'terrain kind does not require a route surface plan',
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function resolveRoadSurfaceHint(params: {
  roadSignal: number;
  trafficIntensity: number;
  routeClass?: TerrainRouteClass;
  routeSurface?: TerrainRouteSurfaceHint;
}): TerrainRouteSurfaceHint {
  if (params.routeSurface) {
    return params.routeSurface;
  }
  if (params.trafficIntensity >= 0.85) {
    return 'stone';
  }
  if (params.roadSignal >= 0.28) {
    return 'gravel';
  }
  if (params.routeClass === 'trail') {
    return 'dirt';
  }
  return 'dirt';
}

function resolveTrailSurfaceHint(params: {
  roadSignal: number;
  trafficIntensity: number;
  routeSurface?: TerrainRouteSurfaceHint;
}): TerrainRouteSurfaceHint {
  if (params.routeSurface) {
    return params.routeSurface;
  }
  if (params.trafficIntensity <= 0.16) {
    return 'grass';
  }
  if (params.roadSignal >= 0.42) {
    return 'gravel';
  }
  return 'dirt';
}

function resolveRoadSurfaceLayer(
  routeSurface: TerrainRouteSurfaceHint,
  params: {
    dirtRoadLayerId: TerrainMaterialLayerId;
    gravelRoadLayerId: TerrainMaterialLayerId;
    stoneRoadLayerId?: TerrainMaterialLayerId;
    muddyRoadLayerId?: TerrainMaterialLayerId;
  }
): Pick<TerrainRouteSurfacePlan, 'surfaceType' | 'layerId'> {
  switch (routeSurface) {
    case 'stone':
      return {
        surfaceType: 'broad-stone-road',
        layerId: params.stoneRoadLayerId ?? params.gravelRoadLayerId,
      };
    case 'mud':
      return {
        surfaceType: 'broad-muddy-road',
        layerId: params.muddyRoadLayerId ?? params.dirtRoadLayerId,
      };
    case 'gravel':
      return {
        surfaceType: 'broad-gravel-road',
        layerId: params.gravelRoadLayerId,
      };
    case 'grass':
    case 'dirt':
      return {
        surfaceType: 'broad-dirt-road',
        layerId: params.dirtRoadLayerId,
      };
  }
}

function resolveTrailSurfaceLayer(
  routeSurface: TerrainRouteSurfaceHint,
  params: {
    dirtRoadLayerId: TerrainMaterialLayerId;
    gravelRoadLayerId: TerrainMaterialLayerId;
    dirtTrailLayerId?: TerrainMaterialLayerId;
    gravelTrailLayerId?: TerrainMaterialLayerId;
    grassTrailLayerId?: TerrainMaterialLayerId;
  }
): Pick<TerrainRouteSurfacePlan, 'surfaceType' | 'layerId'> {
  switch (routeSurface) {
    case 'grass':
      return {
        surfaceType: 'narrow-grass-trail',
        layerId: params.grassTrailLayerId ?? params.dirtTrailLayerId ?? params.dirtRoadLayerId,
      };
    case 'stone':
    case 'gravel':
      return {
        surfaceType: 'narrow-gravel-trail',
        layerId: params.gravelTrailLayerId ?? params.gravelRoadLayerId,
      };
    case 'mud':
    case 'dirt':
      return {
        surfaceType: 'narrow-dirt-trail',
        layerId: params.dirtTrailLayerId ?? params.dirtRoadLayerId,
      };
  }
}
