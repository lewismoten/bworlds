import { createBoundedCache, type BoundedCache } from '@bworlds/cache-support';
import type { Kind, Seed } from '@bworlds/plugin-api';
import type {
  TerrainKindSplatCatalogEntry,
  TerrainMaterialLayerCatalogEntry,
  TerrainMaterialLayerId,
  TerrainSplatChunkRenderDataResult,
} from '@bworlds/terrain-splat-support';
import type { TerrainSplatChunkBuildCache } from '../../terrain-splat-support/src/chunk-cache.ts';
import type { TerrainTextureArraySource } from '../../terrain-splat-support/src/texture-array-plan.ts';

import {
  buildVisibleTerrainChunkGeometries,
  type VisibleTerrainChunkGeometry,
} from './visible-terrain-chunk-geometries.ts';
import {
  buildVisibleTerrainChunkMaterialPlans,
  collectVisibleTerrainChunkMaterialBuckets,
  type VisibleTerrainChunkMaterialBucket,
  type VisibleTerrainChunkMaterialEntry,
  type VisibleTerrainChunkMaterialPlans,
} from './visible-terrain-chunk-materials.ts';
import type { VisibleTerrainChunk } from './visible-terrain-chunks.ts';

type TerrainChunkBufferAttributeHostLike = Parameters<
  typeof buildVisibleTerrainChunkGeometries
>[0];

export type VisibleTerrainChunkRenderable = VisibleTerrainChunkGeometry &
  Pick<
    VisibleTerrainChunkMaterialEntry,
    'activeLayerIds' | 'bindingPlan' | 'materialPlan'
  > & {
    materialBucketKey: string;
    materialBucketChunkIds: readonly string[];
    cacheKey: string;
  };

export type VisibleTerrainChunkRenderableBuildResult = {
  renderables: readonly VisibleTerrainChunkRenderable[];
  materialPlans: VisibleTerrainChunkMaterialPlans;
  materialBuckets: readonly VisibleTerrainChunkMaterialBucket[];
};

export type VisibleTerrainChunkRenderableCache = BoundedCache<
  string,
  VisibleTerrainChunkRenderable
>;

export function createVisibleTerrainChunkRenderableCache(
  maxEntries = 32
): VisibleTerrainChunkRenderableCache {
  return createBoundedCache<string, VisibleTerrainChunkRenderable>(maxEntries);
}

export function buildVisibleTerrainChunkRenderables(
  three: TerrainChunkBufferAttributeHostLike,
  params: {
    seed: Seed;
    visibleChunks: Iterable<VisibleTerrainChunk>;
    kindCatalog:
      | ReadonlyMap<Kind, TerrainKindSplatCatalogEntry>
      | {
          byKind: ReadonlyMap<Kind, TerrainKindSplatCatalogEntry>;
        };
    layerCatalog:
      | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
      | {
          byId: ReadonlyMap<
            TerrainMaterialLayerId,
            TerrainMaterialLayerCatalogEntry
          >;
        };
    resolveTile: Parameters<
      typeof buildVisibleTerrainChunkGeometries
    >[1]['resolveTile'];
    resolveHeight(position: { x: number; y: number }): number;
    resolveTexture(textureId: string): TerrainTextureArraySource | undefined;
    supportsTextureArrays: boolean;
    fallbackKind?: Kind;
    fallbackLayerId?: TerrainMaterialLayerId;
    blendWidth?: number;
    lodStepMultiplier?: number;
    budgetMs?: number;
    fallbackLodStepMultiplier?: number;
    normalSampleRing?: number;
    terrainStateRevision?: string | number;
    renderDataCache?: TerrainSplatChunkBuildCache<{
      result: TerrainSplatChunkRenderDataResult['result'];
      grid: TerrainSplatChunkRenderDataResult['grid'];
      heightField: TerrainSplatChunkRenderDataResult['heightField'];
      geometryPlan: TerrainSplatChunkRenderDataResult['geometryPlan'];
      attributePlanSet: TerrainSplatChunkRenderDataResult['attributePlanSet'];
    }>;
    renderableCache?: VisibleTerrainChunkRenderableCache;
  }
): VisibleTerrainChunkRenderableBuildResult {
  const geometries = buildVisibleTerrainChunkGeometries(three, {
    seed: params.seed,
    visibleChunks: params.visibleChunks,
    kindCatalog: params.kindCatalog,
    layerCatalog: params.layerCatalog,
    resolveTile: params.resolveTile,
    resolveHeight: params.resolveHeight,
    fallbackKind: params.fallbackKind,
    fallbackLayerId: params.fallbackLayerId,
    blendWidth: params.blendWidth,
    lodStepMultiplier: params.lodStepMultiplier,
    budgetMs: params.budgetMs,
    fallbackLodStepMultiplier: params.fallbackLodStepMultiplier,
    normalSampleRing: params.normalSampleRing,
    terrainStateRevision: params.terrainStateRevision,
    cache: params.renderDataCache,
  });
  const materialPlans = buildVisibleTerrainChunkMaterialPlans({
    visibleChunks: geometries.map((geometry) => ({
      key: geometry.key,
      chunkX: geometry.chunkX,
      chunkY: geometry.chunkY,
      renderData: geometry.renderData,
    })),
    layerCatalog: params.layerCatalog,
    resolveTexture: params.resolveTexture,
    supportsTextureArrays: params.supportsTextureArrays,
  });
  const materialEntriesByKey = new Map(
    materialPlans.entries.map((entry) => [entry.key, entry] as const)
  );
  const materialBuckets = collectVisibleTerrainChunkMaterialBuckets(
    materialPlans.entries
  );
  const materialBucketsByKey = new Map(
    materialBuckets.map((bucket) => [
      `${bucket.materialKey}|${bucket.sharedBindingKey}`,
      bucket,
    ])
  );

  const renderables = geometries.map((geometry) => {
    const materialEntry = materialEntriesByKey.get(geometry.key);
    if (!materialEntry) {
      throw new Error(
        `Visible terrain chunk geometry ${JSON.stringify(geometry.key)} is missing its material entry.`
      );
    }
    const materialBucketKey = `${materialEntry.materialPlan.materialKey}|${materialEntry.bindingPlan.sharedBindingKey}`;
    const materialBucket = materialBucketsByKey.get(materialBucketKey);
    if (!materialBucket) {
      throw new Error(
        `Visible terrain chunk material entry ${JSON.stringify(geometry.key)} is missing its material bucket ${JSON.stringify(materialBucketKey)}.`
      );
    }
    const cacheKey = `${geometry.renderData.cacheKey}|${materialBucketKey}`;
    const create = () =>
      ({
        ...geometry,
        activeLayerIds: materialEntry.activeLayerIds,
        bindingPlan: materialEntry.bindingPlan,
        materialPlan: materialEntry.materialPlan,
        materialBucketKey,
        materialBucketChunkIds: materialBucket.chunkIds,
        cacheKey,
      }) satisfies VisibleTerrainChunkRenderable;
    return params.renderableCache
      ? params.renderableCache.getOrCreate(cacheKey, create)
      : create();
  });

  return {
    renderables,
    materialPlans,
    materialBuckets,
  };
}
