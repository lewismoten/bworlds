import {
  normalizeTerrainSplatSample,
  type TerrainMaterialLayerId,
  type TerrainSplatSample,
} from './index.ts';
import type { TerrainRouteDistanceFieldContribution } from './route-distance-field.ts';

export type TerrainRouteJunctionBlendContribution =
  TerrainRouteDistanceFieldContribution & {
    routeLayerId: TerrainMaterialLayerId;
  };

export type TerrainRouteJunctionBlendResult = {
  baseSample: TerrainSplatSample;
  combinedRouteWeight: number;
  routeLayerWeights: Readonly<Record<TerrainMaterialLayerId, number>>;
  sample: TerrainSplatSample;
};

export function blendTerrainRouteJunctionIntoSample(params: {
  baseSample: TerrainSplatSample;
  contributions: readonly TerrainRouteJunctionBlendContribution[];
  fallbackLayerId?: TerrainMaterialLayerId;
}): TerrainRouteJunctionBlendResult {
  const relevantContributions = params.contributions.filter(
    (contribution) => contribution.totalRouteWeight > 0
  );
  const combinedRouteWeight = combineWeights(
    relevantContributions.map((contribution) => contribution.totalRouteWeight)
  );

  if (!(combinedRouteWeight > 0)) {
    return {
      baseSample: params.baseSample,
      combinedRouteWeight: 0,
      routeLayerWeights: {},
      sample: normalizeTerrainSplatSample(params.baseSample, {
        fallbackLayerId: params.fallbackLayerId,
      }),
    };
  }

  const routeWeightTotal = relevantContributions.reduce(
    (sum, contribution) => sum + contribution.totalRouteWeight,
    0
  );
  const routeLayerWeights = new Map<TerrainMaterialLayerId, number>();

  for (const contribution of relevantContributions) {
    const nextWeight =
      (contribution.totalRouteWeight / routeWeightTotal) * combinedRouteWeight;
    routeLayerWeights.set(
      contribution.routeLayerId,
      (routeLayerWeights.get(contribution.routeLayerId) ?? 0) + nextWeight
    );
  }

  const entries = params.baseSample.entries.map((entry) => ({
    layerId: entry.layerId,
    weight: entry.weight * (1 - combinedRouteWeight),
  }));
  for (const [layerId, weight] of [...routeLayerWeights.entries()].sort()) {
    entries.push({
      layerId,
      weight,
    });
  }

  const sample = normalizeTerrainSplatSample(
    { entries },
    {
      fallbackLayerId: params.fallbackLayerId,
    }
  );

  const normalizedRouteLayerWeights = Object.fromEntries(
    [...routeLayerWeights.keys()]
      .sort()
      .map((layerId) => [layerId, findEntryWeight(sample, layerId)])
  ) as Readonly<Record<TerrainMaterialLayerId, number>>;

  return {
    baseSample: params.baseSample,
    combinedRouteWeight,
    routeLayerWeights: normalizedRouteLayerWeights,
    sample,
  };
}

function findEntryWeight(
  sample: TerrainSplatSample,
  layerId: TerrainMaterialLayerId
): number {
  return sample.entries.find((entry) => entry.layerId === layerId)?.weight ?? 0;
}

function combineWeights(weights: readonly number[]): number {
  let remaining = 1;
  for (const weight of weights) {
    remaining *= 1 - clamp01(weight);
  }
  return clamp01(1 - remaining);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
