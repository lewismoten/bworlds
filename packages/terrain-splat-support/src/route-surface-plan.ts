import type { Kind } from '@bworlds/plugin-api';
import type { TerrainMaterialLayerId } from './index.ts';

export type TerrainRouteSurfaceMode = 'splat' | 'overlay' | 'none';
export type TerrainRouteSurfaceType =
  | 'broad-dirt-road'
  | 'broad-gravel-road'
  | 'narrow-dirt-trail'
  | 'narrow-gravel-trail'
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
  prefersOverlay?: boolean;
  dirtRoadLayerId: TerrainMaterialLayerId;
  gravelRoadLayerId: TerrainMaterialLayerId;
  dirtTrailLayerId?: TerrainMaterialLayerId;
  gravelTrailLayerId?: TerrainMaterialLayerId;
}): TerrainRouteSurfacePlan {
  const roadSignal = clamp01(params.roadSignal ?? 0);

  if (params.kind === 'road') {
    const useGravel = roadSignal >= 0.28;
    return {
      mode: params.prefersOverlay ? 'overlay' : 'splat',
      surfaceType: useGravel ? 'broad-gravel-road' : 'broad-dirt-road',
      layerId: useGravel ? params.gravelRoadLayerId : params.dirtRoadLayerId,
      overlayWidth: params.prefersOverlay ? 0.3 : 0,
      shoulderBlendWidth: params.prefersOverlay ? 0.18 : 0.32,
      reason: params.prefersOverlay
        ? 'road requested overlay rendering explicitly'
        : 'broad roads stay in terrain splats by default',
    };
  }

  if (params.kind === 'path') {
    const useGravel = roadSignal >= 0.42;
    const fallbackLayerId = useGravel
      ? (params.gravelTrailLayerId ?? params.gravelRoadLayerId)
      : (params.dirtTrailLayerId ?? params.dirtRoadLayerId);
    return {
      mode: 'overlay',
      surfaceType: useGravel ? 'narrow-gravel-trail' : 'narrow-dirt-trail',
      layerId: fallbackLayerId,
      overlayWidth: 0.18,
      shoulderBlendWidth: 0.12,
      reason:
        'narrow trails render as overlays to avoid over-widening terrain splats',
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
