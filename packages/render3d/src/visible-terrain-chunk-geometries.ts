import type { Kind, Seed } from '@bworlds/plugin-api';
import {
  buildTerrainSplatChunkRenderData,
  type TerrainKindSplatCatalogEntry,
  type TerrainMaterialLayerCatalogEntry,
  type TerrainMaterialLayerId,
  type TerrainSplatChunkRenderDataResult,
  type ResolveTerrainSplatGridTile,
} from '@bworlds/terrain-splat-support';
import { createTerrainChunkBufferGeometry } from '@bworlds/three-support';
import { getTerrainChunkCellBounds } from '@bworlds/worldgen';
import type { TerrainSplatChunkBuildCache } from '../../terrain-splat-support/src/chunk-cache.ts';

import type { VisibleTerrainChunk } from './visible-terrain-chunks.ts';

type TerrainChunkBufferAttributeHostLike = Parameters<
  typeof createTerrainChunkBufferGeometry
>[0];
type TerrainChunkBufferGeometryLike = ReturnType<
  typeof createTerrainChunkBufferGeometry
>;

export type VisibleTerrainChunkGeometry = {
  key: string;
  chunkX: number;
  chunkY: number;
  geometry: TerrainChunkBufferGeometryLike;
  renderData: TerrainSplatChunkRenderDataResult;
};

export function buildVisibleTerrainChunkGeometries(
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
    resolveTile: ResolveTerrainSplatGridTile;
    resolveHeight(position: { x: number; y: number }): number;
    fallbackKind?: Kind;
    fallbackLayerId?: TerrainMaterialLayerId;
    blendWidth?: number;
    lodStepMultiplier?: number;
    budgetMs?: number;
    fallbackLodStepMultiplier?: number;
    normalSampleRing?: number;
    terrainStateRevision?: string | number;
    cache?: TerrainSplatChunkBuildCache<{
      result: TerrainSplatChunkRenderDataResult['result'];
      grid: TerrainSplatChunkRenderDataResult['grid'];
      heightField: TerrainSplatChunkRenderDataResult['heightField'];
      geometryPlan: TerrainSplatChunkRenderDataResult['geometryPlan'];
      attributePlanSet: TerrainSplatChunkRenderDataResult['attributePlanSet'];
    }>;
  }
): VisibleTerrainChunkGeometry[] {
  const results: VisibleTerrainChunkGeometry[] = [];

  for (const chunk of params.visibleChunks) {
    assertVisibleTerrainChunkBounds(chunk.chunkX, chunk.chunkY, chunk.bounds);
    const renderData = buildTerrainSplatChunkRenderData({
      seed: params.seed,
      bounds: chunk.bounds,
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
      cache: params.cache,
    });
    results.push({
      key: chunk.key,
      chunkX: chunk.chunkX,
      chunkY: chunk.chunkY,
      geometry: createTerrainChunkBufferGeometry(three, {
        geometryPlan: renderData.geometryPlan,
        attributePlanSet: renderData.attributePlanSet,
      }),
      renderData,
    });
  }

  return results.sort((left, right) =>
    left.chunkY === right.chunkY
      ? left.chunkX - right.chunkX
      : left.chunkY - right.chunkY
  );
}

function assertVisibleTerrainChunkBounds(
  chunkX: number,
  chunkY: number,
  bounds: VisibleTerrainChunk['bounds']
) {
  const expected = getTerrainChunkCellBounds(chunkX, chunkY);
  if (
    bounds.minX !== expected.minX ||
    bounds.maxX !== expected.maxX ||
    bounds.minY !== expected.minY ||
    bounds.maxY !== expected.maxY
  ) {
    throw new Error(
      `Visible terrain chunk ${chunkX}:${chunkY} bounds ${formatChunkBounds(bounds)} must match authoritative worldgen bounds ${formatChunkBounds(expected)}.`
    );
  }
}

function formatChunkBounds(bounds: VisibleTerrainChunk['bounds']) {
  return `${bounds.minX}:${bounds.minY}..${bounds.maxX}:${bounds.maxY}`;
}
