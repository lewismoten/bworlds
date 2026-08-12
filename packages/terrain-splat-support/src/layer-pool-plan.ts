import type { TerrainMaterialLayerId } from './index.ts';
import type { TerrainSplatGridUsageSummary } from './sample-grid.ts';

export type TerrainSplatNeighborhoodLayerPoolMember = {
  id: string;
  usage: TerrainSplatGridUsageSummary;
};

export type TerrainSplatNeighborhoodLayerPoolWarningCode =
  'shared-layer-budget-exceeded' | 'chunk-requires-unshared-layers';

export type TerrainSplatNeighborhoodLayerPoolWarning = {
  code: TerrainSplatNeighborhoodLayerPoolWarningCode;
  message: string;
};

export type TerrainSplatNeighborhoodLayerPoolPlan = {
  activeLayerIds: readonly TerrainMaterialLayerId[];
  excludedLayerIds: readonly TerrainMaterialLayerId[];
  layerUseCounts: Readonly<Record<TerrainMaterialLayerId, number>>;
  layerPresenceCounts: Readonly<Record<TerrainMaterialLayerId, number>>;
  chunkCoverage: Readonly<
    Record<
      string,
      {
        coveredLayerIds: readonly TerrainMaterialLayerId[];
        missingLayerIds: readonly TerrainMaterialLayerId[];
      }
    >
  >;
  warnings: readonly TerrainSplatNeighborhoodLayerPoolWarning[];
};

export function planTerrainSplatNeighborhoodLayerPool(params: {
  members: readonly TerrainSplatNeighborhoodLayerPoolMember[];
  maxActiveLayers: number;
}): TerrainSplatNeighborhoodLayerPoolPlan {
  if (!Number.isFinite(params.maxActiveLayers) || params.maxActiveLayers <= 0) {
    throw new Error(
      'Terrain splat neighborhood layer pools must use a positive finite maxActiveLayers.'
    );
  }

  const layerUseCounts = new Map<TerrainMaterialLayerId, number>();
  const layerPresenceCounts = new Map<TerrainMaterialLayerId, number>();

  for (const member of params.members) {
    const seenLayerIds = new Set<TerrainMaterialLayerId>();
    for (const [layerId, count] of Object.entries(
      member.usage.activeLayerCounts
    )) {
      layerUseCounts.set(layerId, (layerUseCounts.get(layerId) ?? 0) + count);
      if (seenLayerIds.has(layerId)) {
        continue;
      }
      seenLayerIds.add(layerId);
      layerPresenceCounts.set(
        layerId,
        (layerPresenceCounts.get(layerId) ?? 0) + 1
      );
    }
  }

  const rankedLayerIds = [...layerUseCounts.keys()].sort((left, right) => {
    const rightPresence = layerPresenceCounts.get(right) ?? 0;
    const leftPresence = layerPresenceCounts.get(left) ?? 0;
    if (rightPresence !== leftPresence) {
      return rightPresence - leftPresence;
    }

    const rightUsage = layerUseCounts.get(right) ?? 0;
    const leftUsage = layerUseCounts.get(left) ?? 0;
    if (rightUsage !== leftUsage) {
      return rightUsage - leftUsage;
    }

    return left.localeCompare(right);
  });

  const activeLayerIds = rankedLayerIds.slice(0, params.maxActiveLayers);
  const activeLayerIdSet = new Set(activeLayerIds);
  const excludedLayerIds = rankedLayerIds
    .slice(params.maxActiveLayers)
    .sort((left, right) => left.localeCompare(right));
  const warnings: TerrainSplatNeighborhoodLayerPoolWarning[] = [];
  const chunkCoverage = Object.fromEntries(
    params.members.map((member) => {
      const coveredLayerIds = member.usage.activeLayerIds.filter((layerId) =>
        activeLayerIdSet.has(layerId)
      );
      const missingLayerIds = member.usage.activeLayerIds.filter(
        (layerId) => !activeLayerIdSet.has(layerId)
      );

      return [
        member.id,
        {
          coveredLayerIds,
          missingLayerIds,
        },
      ] as const;
    })
  );

  if (excludedLayerIds.length > 0) {
    warnings.push({
      code: 'shared-layer-budget-exceeded',
      message: `Terrain splat neighborhood requires ${rankedLayerIds.length} active layers, exceeding the shared budget ${params.maxActiveLayers}.`,
    });
  }

  for (const member of params.members) {
    const coverage = chunkCoverage[member.id];
    if (coverage.missingLayerIds.length === 0) {
      continue;
    }
    warnings.push({
      code: 'chunk-requires-unshared-layers',
      message: `Terrain splat chunk ${JSON.stringify(member.id)} still requires ${coverage.missingLayerIds.length} unshared layer(s): ${coverage.missingLayerIds.join(', ')}.`,
    });
  }

  return {
    activeLayerIds,
    excludedLayerIds,
    layerUseCounts: Object.freeze(Object.fromEntries(layerUseCounts)),
    layerPresenceCounts: Object.freeze(Object.fromEntries(layerPresenceCounts)),
    chunkCoverage: Object.freeze(chunkCoverage),
    warnings,
  };
}
