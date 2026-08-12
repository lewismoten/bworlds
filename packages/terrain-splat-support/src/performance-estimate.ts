import type {
  TerrainMaterialLayerCatalogEntry,
  TerrainMaterialLayerId,
} from './index.ts';
import type { TerrainSplatSampleGrid } from './sample-grid.ts';

export type TerrainSplatChunkPerformanceEstimate = {
  cellCount: number;
  drawCallCount: number;
  materialCount: number;
  programCount: number;
  textureBindingCount: number;
  textureArrayCount: number;
  uniqueBaseColorTextureCount: number;
  uniqueNormalTextureCount: number;
  uniqueRoughnessTextureCount: number;
};

export type TerrainSplatChunkPerformanceComparison = {
  legacy: TerrainSplatChunkPerformanceEstimate;
  splat: TerrainSplatChunkPerformanceEstimate;
  reductions: {
    drawCallCount: number;
    materialCount: number;
    programCount: number;
    textureBindingCount: number;
  };
  reductionRatios: {
    drawCallCount: number;
    materialCount: number;
    programCount: number;
    textureBindingCount: number;
  };
};

export function compareTerrainSplatChunkPerformance(
  grid: TerrainSplatSampleGrid,
  options: {
    catalog:
      | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
      | {
          byId: ReadonlyMap<
            TerrainMaterialLayerId,
            TerrainMaterialLayerCatalogEntry
          >;
        };
  }
): TerrainSplatChunkPerformanceComparison {
  const layerMap =
    'byId' in options.catalog ? options.catalog.byId : options.catalog;
  const legacyMaterialSignatures = new Set<string>();
  const activeLayerIds = new Set<TerrainMaterialLayerId>();

  for (const sample of grid.samples) {
    const signatureEntries = [...sample.entries]
      .sort((left, right) => left.layerId.localeCompare(right.layerId))
      .map((entry) => {
        activeLayerIds.add(entry.layerId);
        const layer = layerMap.get(entry.layerId);
        return [
          entry.layerId,
          entry.weight.toFixed(3),
          layer?.baseColorTextureId ?? '',
          layer?.normalTextureId ?? '',
          layer?.roughnessTextureId ?? '',
        ].join('@');
      });
    legacyMaterialSignatures.add(signatureEntries.join('|'));
  }

  const activeLayers = [...activeLayerIds]
    .map((layerId) => layerMap.get(layerId))
    .filter(
      (layer): layer is TerrainMaterialLayerCatalogEntry => layer !== undefined
    );
  const textureBindingCount =
    countDistinct(activeLayers.map((layer) => layer.baseColorTextureId)) +
    countDistinct(activeLayers.map((layer) => layer.normalTextureId)) +
    countDistinct(activeLayers.map((layer) => layer.roughnessTextureId));

  const legacy = {
    cellCount: grid.samples.length,
    drawCallCount: grid.samples.length,
    materialCount: legacyMaterialSignatures.size,
    programCount: legacyMaterialSignatures.size,
    textureBindingCount,
    textureArrayCount: 0,
    uniqueBaseColorTextureCount: countDistinct(
      activeLayers.map((layer) => layer.baseColorTextureId)
    ),
    uniqueNormalTextureCount: countDistinct(
      activeLayers.map((layer) => layer.normalTextureId)
    ),
    uniqueRoughnessTextureCount: countDistinct(
      activeLayers.map((layer) => layer.roughnessTextureId)
    ),
  } satisfies TerrainSplatChunkPerformanceEstimate;

  const splatMaterialCount = activeLayers.length > 0 ? 1 : 0;
  const splat = {
    cellCount: grid.samples.length,
    drawCallCount: grid.samples.length > 0 ? 1 : 0,
    materialCount: splatMaterialCount,
    programCount: splatMaterialCount,
    textureBindingCount:
      (legacy.uniqueBaseColorTextureCount > 0 ? 1 : 0) +
      (legacy.uniqueNormalTextureCount > 0 ? 1 : 0) +
      (legacy.uniqueRoughnessTextureCount > 0 ? 1 : 0),
    textureArrayCount:
      (legacy.uniqueBaseColorTextureCount > 0 ? 1 : 0) +
      (legacy.uniqueNormalTextureCount > 0 ? 1 : 0) +
      (legacy.uniqueRoughnessTextureCount > 0 ? 1 : 0),
    uniqueBaseColorTextureCount: legacy.uniqueBaseColorTextureCount,
    uniqueNormalTextureCount: legacy.uniqueNormalTextureCount,
    uniqueRoughnessTextureCount: legacy.uniqueRoughnessTextureCount,
  } satisfies TerrainSplatChunkPerformanceEstimate;

  return {
    legacy,
    splat,
    reductions: {
      drawCallCount: legacy.drawCallCount - splat.drawCallCount,
      materialCount: legacy.materialCount - splat.materialCount,
      programCount: legacy.programCount - splat.programCount,
      textureBindingCount:
        legacy.textureBindingCount - splat.textureBindingCount,
    },
    reductionRatios: {
      drawCallCount: toReductionRatio(
        legacy.drawCallCount,
        splat.drawCallCount
      ),
      materialCount: toReductionRatio(
        legacy.materialCount,
        splat.materialCount
      ),
      programCount: toReductionRatio(legacy.programCount, splat.programCount),
      textureBindingCount: toReductionRatio(
        legacy.textureBindingCount,
        splat.textureBindingCount
      ),
    },
  };
}

function countDistinct(values: readonly string[]): number {
  return new Set(values.filter((value) => value.length > 0)).size;
}

function toReductionRatio(before: number, after: number): number {
  if (before <= 0) {
    return 0;
  }
  return (before - after) / before;
}
