import {
  normalizeTerrainSplatSample,
  type TerrainMaterialLayerId,
  type TerrainSplatSample,
} from './index.ts';

export type TerrainRouteEdgeBlendResult = {
  baseSample: TerrainSplatSample;
  routeLayerId: TerrainMaterialLayerId;
  routeWeight: number;
  sample: TerrainSplatSample;
};

export function blendTerrainRouteEdgeIntoSample(params: {
  baseSample: TerrainSplatSample;
  routeLayerId: TerrainMaterialLayerId;
  routeWeight: number;
  fallbackLayerId?: TerrainMaterialLayerId;
}): TerrainRouteEdgeBlendResult {
  const routeWeight = clamp01(params.routeWeight);

  if (!(routeWeight > 0)) {
    return {
      baseSample: params.baseSample,
      routeLayerId: params.routeLayerId,
      routeWeight: 0,
      sample: normalizeTerrainSplatSample(params.baseSample, {
        fallbackLayerId: params.fallbackLayerId,
      }),
    };
  }

  const entries = params.baseSample.entries.map((entry) => ({
    layerId: entry.layerId,
    weight: entry.weight * (1 - routeWeight),
  }));
  entries.push({
    layerId: params.routeLayerId,
    weight: routeWeight,
  });

  return {
    baseSample: params.baseSample,
    routeLayerId: params.routeLayerId,
    routeWeight,
    sample: normalizeTerrainSplatSample(
      { entries },
      {
        fallbackLayerId: params.fallbackLayerId,
      }
    ),
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
