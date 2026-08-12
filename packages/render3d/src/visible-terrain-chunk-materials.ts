import type { TerrainSplatSampleGrid } from '@bworlds/terrain-splat-support';
import type {
  TerrainMaterialLayerCatalogEntry,
  TerrainMaterialLayerId,
} from '@bworlds/terrain-splat-support';
import {
  createTerrainSplatMaterialPlan,
  summarizeTerrainSplatMaterialReuse,
  type TerrainSplatMaterialPlan,
  type TerrainSplatMaterialReuseSummary,
} from '../../terrain-splat-support/src/material-plan.ts';
import {
  createTerrainTextureBindingRuntimePlan,
  summarizeTerrainTextureBindingReuse,
  type TerrainTextureBindingReuseSummary,
  type TerrainTextureBindingRuntimePlan,
} from '../../terrain-splat-support/src/texture-binding-runtime-plan.ts';
import {
  createTerrainTextureBindingPlanSet,
  type TerrainTextureArraySource,
} from '../../terrain-splat-support/src/texture-array-plan.ts';

export type VisibleTerrainChunkMaterialSource = {
  key: string;
  chunkX: number;
  chunkY: number;
  renderData: Pick<{ grid: TerrainSplatSampleGrid }, 'grid'>;
};

export type VisibleTerrainChunkMaterialEntry = {
  key: string;
  chunkId: string;
  chunkX: number;
  chunkY: number;
  activeLayerIds: readonly TerrainMaterialLayerId[];
  bindingPlan: TerrainTextureBindingRuntimePlan;
  materialPlan: TerrainSplatMaterialPlan;
};

export type VisibleTerrainChunkMaterialBucket = {
  materialKey: string;
  sharedBindingKey: string;
  bindingMode: TerrainTextureBindingRuntimePlan['mode'];
  chunkIds: readonly string[];
  chunkKeys: readonly string[];
  activeLayerIds: readonly TerrainMaterialLayerId[];
  materialPlan: TerrainSplatMaterialPlan;
  bindingPlan: TerrainTextureBindingRuntimePlan;
};

export type VisibleTerrainChunkMaterialPlans = {
  entries: readonly VisibleTerrainChunkMaterialEntry[];
  buckets: readonly VisibleTerrainChunkMaterialBucket[];
  materialReuseSummary: TerrainSplatMaterialReuseSummary;
  bindingReuseSummary: TerrainTextureBindingReuseSummary;
};

export function buildVisibleTerrainChunkMaterialPlans(params: {
  visibleChunks: Iterable<VisibleTerrainChunkMaterialSource>;
  layerCatalog:
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        byId: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
      };
  resolveTexture(textureId: string): TerrainTextureArraySource | undefined;
  supportsTextureArrays: boolean;
}): VisibleTerrainChunkMaterialPlans {
  const entries = [...params.visibleChunks]
    .map((chunk) => {
      const activeLayerIds = collectActiveLayerIds(chunk.renderData.grid);
      const bindingPlan = createTerrainTextureBindingRuntimePlan(
        createTerrainTextureBindingPlanSet({
          catalog: params.layerCatalog,
          activeLayerIds,
          resolveTexture: params.resolveTexture,
          supportsTextureArrays: params.supportsTextureArrays,
        })
      );
      const materialPlan = createTerrainSplatMaterialPlan(
        createTerrainTextureBindingPlanSet({
          catalog: params.layerCatalog,
          activeLayerIds,
          resolveTexture: params.resolveTexture,
          supportsTextureArrays: params.supportsTextureArrays,
        })
      );

      return {
        key: chunk.key,
        chunkId: `${chunk.chunkX}:${chunk.chunkY}`,
        chunkX: chunk.chunkX,
        chunkY: chunk.chunkY,
        activeLayerIds,
        bindingPlan,
        materialPlan,
      } satisfies VisibleTerrainChunkMaterialEntry;
    })
    .sort((left, right) =>
      left.chunkY === right.chunkY
        ? left.chunkX === right.chunkX
          ? left.key.localeCompare(right.key)
          : left.chunkX - right.chunkX
        : left.chunkY - right.chunkY
    );

  return {
    entries,
    buckets: collectVisibleTerrainChunkMaterialBuckets(entries),
    materialReuseSummary: summarizeTerrainSplatMaterialReuse(
      entries.map((entry) => ({
        chunkId: entry.chunkId,
        plan: entry.materialPlan,
      }))
    ),
    bindingReuseSummary: summarizeTerrainTextureBindingReuse(
      entries.map((entry) => ({
        chunkId: entry.chunkId,
        plan: entry.bindingPlan,
      }))
    ),
  };
}

export function collectVisibleTerrainChunkMaterialBuckets(
  entries: Iterable<
    Pick<
      VisibleTerrainChunkMaterialEntry,
      | 'chunkId'
      | 'key'
      | 'chunkX'
      | 'chunkY'
      | 'activeLayerIds'
      | 'bindingPlan'
      | 'materialPlan'
    >
  >
): VisibleTerrainChunkMaterialBucket[] {
  const buckets = new Map<
    string,
    {
      materialKey: string;
      sharedBindingKey: string;
      bindingMode: TerrainTextureBindingRuntimePlan['mode'];
      chunkIds: string[];
      chunkKeys: string[];
      activeLayerIds: Set<TerrainMaterialLayerId>;
      materialPlan: TerrainSplatMaterialPlan;
      bindingPlan: TerrainTextureBindingRuntimePlan;
    }
  >();

  for (const entry of entries) {
    const key = `${entry.materialPlan.materialKey}|${entry.bindingPlan.sharedBindingKey}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        materialKey: entry.materialPlan.materialKey,
        sharedBindingKey: entry.bindingPlan.sharedBindingKey,
        bindingMode: entry.bindingPlan.mode,
        chunkIds: [],
        chunkKeys: [],
        activeLayerIds: new Set<TerrainMaterialLayerId>(),
        materialPlan: entry.materialPlan,
        bindingPlan: entry.bindingPlan,
      };
      buckets.set(key, bucket);
    }
    bucket.chunkIds.push(entry.chunkId);
    bucket.chunkKeys.push(entry.key);
    for (const layerId of entry.activeLayerIds) {
      bucket.activeLayerIds.add(layerId);
    }
  }

  return [...buckets.values()]
    .sort((left, right) => left.materialKey.localeCompare(right.materialKey))
    .map((bucket) => ({
      materialKey: bucket.materialKey,
      sharedBindingKey: bucket.sharedBindingKey,
      bindingMode: bucket.bindingMode,
      chunkIds: [...bucket.chunkIds].sort(),
      chunkKeys: [...bucket.chunkKeys].sort(),
      activeLayerIds: [...bucket.activeLayerIds].sort(),
      materialPlan: bucket.materialPlan,
      bindingPlan: bucket.bindingPlan,
    }));
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
