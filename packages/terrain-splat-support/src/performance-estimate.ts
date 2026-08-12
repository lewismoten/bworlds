import type {
  TerrainMaterialLayerCatalogEntry,
  TerrainMaterialLayerId,
} from './index.ts';
import {
  createTerrainSplatMaterialPlan,
  summarizeTerrainSplatMaterialReuse,
  type TerrainSplatMaterialReuseSummary,
} from './material-plan.ts';
import type { TerrainSplatSampleGrid } from './sample-grid.ts';
import type { TerrainTextureArraySource } from './texture-array-plan.ts';
import { createTerrainTextureBindingPlanSet } from './texture-array-plan.ts';

export type TerrainSplatChunkPerformanceEstimate = {
  cellCount: number;
  drawCallCount: number;
  materialCount: number;
  programCount: number;
  textureBindingCount: number;
  textureArrayCount: number;
  estimatedTextureMemoryBytes: number;
  estimatedFrameTimeMs: number;
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
    estimatedTextureMemoryBytes: number;
    estimatedFrameTimeMs: number;
  };
  reductionRatios: {
    drawCallCount: number;
    materialCount: number;
    programCount: number;
    textureBindingCount: number;
    estimatedTextureMemoryBytes: number;
    estimatedFrameTimeMs: number;
  };
};

export type TerrainRouteSplatPathPerformanceEstimate = {
  routeCellCount: number;
  drawCallCount: number;
  materialCount: number;
  programCount: number;
  estimatedFrameTimeMs: number;
};

export type TerrainRouteSplatPathPerformanceComparison = {
  legacyMesh: TerrainRouteSplatPathPerformanceEstimate;
  splat: TerrainRouteSplatPathPerformanceEstimate;
  reductions: {
    drawCallCount: number;
    materialCount: number;
    programCount: number;
    estimatedFrameTimeMs: number;
  };
  reductionRatios: {
    drawCallCount: number;
    materialCount: number;
    programCount: number;
    estimatedFrameTimeMs: number;
  };
};

export type TerrainSplatChunkMaterialReuseEstimate = {
  chunkId: string;
  activeLayerIds: readonly TerrainMaterialLayerId[];
  materialKey: string;
  bindingMode: 'texture-array' | 'per-layer-textures';
  estimatedTextureBytes: number;
};

export type TerrainSplatMaterialReuseEstimate =
  TerrainSplatMaterialReuseSummary & {
    chunks: readonly TerrainSplatChunkMaterialReuseEstimate[];
  };

const DEFAULT_TEXTURE_DIMENSION = 256;
const DEFAULT_TEXTURE_BYTES_PER_PIXEL = 4;

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
  const uniqueBaseColorTextureCount = countDistinct(
    activeLayers.map((layer) => layer.baseColorTextureId)
  );
  const uniqueNormalTextureCount = countDistinct(
    activeLayers.map((layer) => layer.normalTextureId)
  );
  const uniqueRoughnessTextureCount = countDistinct(
    activeLayers.map((layer) => layer.roughnessTextureId)
  );

  const legacy = {
    cellCount: grid.samples.length,
    drawCallCount: grid.samples.length,
    materialCount: legacyMaterialSignatures.size,
    programCount: legacyMaterialSignatures.size,
    textureBindingCount,
    textureArrayCount: 0,
    estimatedTextureMemoryBytes:
      textureBindingCount *
      DEFAULT_TEXTURE_DIMENSION *
      DEFAULT_TEXTURE_DIMENSION *
      DEFAULT_TEXTURE_BYTES_PER_PIXEL,
    estimatedFrameTimeMs: estimateTerrainFrameTimeMs({
      drawCallCount: grid.samples.length,
      materialCount: legacyMaterialSignatures.size,
      textureBindingCount,
      cellCount: grid.samples.length,
    }),
    uniqueBaseColorTextureCount,
    uniqueNormalTextureCount,
    uniqueRoughnessTextureCount,
  } satisfies TerrainSplatChunkPerformanceEstimate;

  const splatMaterialCount = activeLayers.length > 0 ? 1 : 0;
  const splatTextureArrayCount =
    (uniqueBaseColorTextureCount > 0 ? 1 : 0) +
    (uniqueNormalTextureCount > 0 ? 1 : 0) +
    (uniqueRoughnessTextureCount > 0 ? 1 : 0);
  const splat = {
    cellCount: grid.samples.length,
    drawCallCount: grid.samples.length > 0 ? 1 : 0,
    materialCount: splatMaterialCount,
    programCount: splatMaterialCount,
    textureBindingCount:
      (uniqueBaseColorTextureCount > 0 ? 1 : 0) +
      (uniqueNormalTextureCount > 0 ? 1 : 0) +
      (uniqueRoughnessTextureCount > 0 ? 1 : 0),
    textureArrayCount: splatTextureArrayCount,
    estimatedTextureMemoryBytes:
      splatTextureArrayCount *
      DEFAULT_TEXTURE_DIMENSION *
      DEFAULT_TEXTURE_DIMENSION *
      Math.max(1, activeLayers.length) *
      DEFAULT_TEXTURE_BYTES_PER_PIXEL,
    estimatedFrameTimeMs: estimateTerrainFrameTimeMs({
      drawCallCount: grid.samples.length > 0 ? 1 : 0,
      materialCount: splatMaterialCount,
      textureBindingCount: splatTextureArrayCount,
      cellCount: grid.samples.length,
    }),
    uniqueBaseColorTextureCount,
    uniqueNormalTextureCount,
    uniqueRoughnessTextureCount,
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
      estimatedTextureMemoryBytes:
        legacy.estimatedTextureMemoryBytes - splat.estimatedTextureMemoryBytes,
      estimatedFrameTimeMs:
        legacy.estimatedFrameTimeMs - splat.estimatedFrameTimeMs,
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
      estimatedTextureMemoryBytes: toReductionRatio(
        legacy.estimatedTextureMemoryBytes,
        splat.estimatedTextureMemoryBytes
      ),
      estimatedFrameTimeMs: toReductionRatio(
        legacy.estimatedFrameTimeMs,
        splat.estimatedFrameTimeMs
      ),
    },
  };
}

export function compareTerrainRouteSplatPathPerformance(params: {
  grid: TerrainSplatSampleGrid;
  routeLayerIds: readonly TerrainMaterialLayerId[];
}): TerrainRouteSplatPathPerformanceComparison {
  const routeLayerIdSet = new Set(params.routeLayerIds);
  const routeSignatures = new Set<string>();
  let routeCellCount = 0;

  for (const sample of params.grid.samples) {
    const routeEntries = sample.entries
      .filter((entry) => routeLayerIdSet.has(entry.layerId))
      .sort((left, right) => left.layerId.localeCompare(right.layerId));
    if (routeEntries.length === 0) {
      continue;
    }
    routeCellCount += 1;
    routeSignatures.add(
      routeEntries
        .map((entry) => `${entry.layerId}@${entry.weight.toFixed(3)}`)
        .join('|')
    );
  }

  const legacyMesh = {
    routeCellCount,
    drawCallCount: routeCellCount,
    materialCount: routeSignatures.size,
    programCount: routeSignatures.size,
    estimatedFrameTimeMs: estimateTerrainFrameTimeMs({
      drawCallCount: routeCellCount,
      materialCount: routeSignatures.size,
      textureBindingCount: routeSignatures.size,
      cellCount: routeCellCount,
    }),
  } satisfies TerrainRouteSplatPathPerformanceEstimate;

  const splat = {
    routeCellCount,
    drawCallCount: 0,
    materialCount: 0,
    programCount: 0,
    estimatedFrameTimeMs: 0,
  } satisfies TerrainRouteSplatPathPerformanceEstimate;

  return {
    legacyMesh,
    splat,
    reductions: {
      drawCallCount: legacyMesh.drawCallCount - splat.drawCallCount,
      materialCount: legacyMesh.materialCount - splat.materialCount,
      programCount: legacyMesh.programCount - splat.programCount,
      estimatedFrameTimeMs:
        legacyMesh.estimatedFrameTimeMs - splat.estimatedFrameTimeMs,
    },
    reductionRatios: {
      drawCallCount: toReductionRatio(
        legacyMesh.drawCallCount,
        splat.drawCallCount
      ),
      materialCount: toReductionRatio(
        legacyMesh.materialCount,
        splat.materialCount
      ),
      programCount: toReductionRatio(
        legacyMesh.programCount,
        splat.programCount
      ),
      estimatedFrameTimeMs: toReductionRatio(
        legacyMesh.estimatedFrameTimeMs,
        splat.estimatedFrameTimeMs
      ),
    },
  };
}

export function estimateTerrainSplatMaterialReuse(params: {
  chunks: readonly {
    chunkId: string;
    grid: TerrainSplatSampleGrid;
  }[];
  catalog:
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        byId: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
      };
  resolveTexture: (textureId: string) => TerrainTextureArraySource | undefined;
  supportsTextureArrays: boolean;
}): TerrainSplatMaterialReuseEstimate {
  const chunks = params.chunks.map(({ chunkId, grid }) => {
    const activeLayerIds = collectActiveLayerIds(grid);
    const plan = createTerrainSplatMaterialPlan(
      createTerrainTextureBindingPlanSet({
        catalog: params.catalog,
        activeLayerIds,
        resolveTexture: params.resolveTexture,
        supportsTextureArrays: params.supportsTextureArrays,
      })
    );

    return {
      chunkId,
      activeLayerIds,
      materialKey: plan.materialKey,
      bindingMode: plan.bindingMode,
      estimatedTextureBytes: plan.estimatedTextureBytes,
      plan,
    };
  });
  const summary = summarizeTerrainSplatMaterialReuse(
    chunks.map(({ chunkId, plan }) => ({
      chunkId,
      plan,
    }))
  );

  return {
    ...summary,
    chunks: chunks.map(
      ({
        chunkId,
        activeLayerIds,
        materialKey,
        bindingMode,
        estimatedTextureBytes,
      }) => ({
        chunkId,
        activeLayerIds,
        materialKey,
        bindingMode,
        estimatedTextureBytes,
      })
    ),
  };
}

function countDistinct(values: readonly string[]): number {
  return new Set(values.filter((value) => value.length > 0)).size;
}

function collectActiveLayerIds(
  grid: TerrainSplatSampleGrid
): readonly TerrainMaterialLayerId[] {
  const activeLayerIds = new Set<TerrainMaterialLayerId>();
  for (const sample of grid.samples) {
    for (const entry of sample.entries) {
      activeLayerIds.add(entry.layerId);
    }
  }
  return [...activeLayerIds].sort();
}

function toReductionRatio(before: number, after: number): number {
  if (before <= 0) {
    return 0;
  }
  return (before - after) / before;
}

function estimateTerrainFrameTimeMs(params: {
  drawCallCount: number;
  materialCount: number;
  textureBindingCount: number;
  cellCount: number;
}): number {
  return roundMetric(
    params.drawCallCount * 0.045 +
      params.materialCount * 0.012 +
      params.textureBindingCount * 0.004 +
      params.cellCount * 0.0008
  );
}

function roundMetric(value: number): number {
  return Math.round(value * 1000) / 1000;
}
