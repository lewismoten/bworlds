import type { Kind, Seed } from '@bworlds/plugin-api';
import type {
  TerrainKindSplatCatalogEntry,
  TerrainMaterialLayerCatalogEntry,
  TerrainMaterialLayerId,
} from './index.ts';
import type { TerrainSplatChunkBuildCache } from './chunk-cache.ts';
import {
  createTerrainSplatChunkStateKey,
  type TerrainSplatChunkStateKeyInput,
} from './chunk-cache.ts';
import type {
  ResolveTerrainSplatGridTile,
  TerrainSplatGridBounds,
} from './sample-grid.ts';
import {
  buildTerrainSplatWorkerResult,
  createTerrainSplatWorkerBuildRequest,
  type TerrainSplatWorkerBuildRequest,
  type TerrainSplatWorkerBuildResult,
} from './worker-contract.ts';

export type TerrainSplatChunkBuildResult = {
  request: TerrainSplatWorkerBuildRequest;
  result: TerrainSplatWorkerBuildResult;
  cacheKey: string;
  fromCache: boolean;
};

export function buildTerrainSplatChunkData(params: {
  seed: Seed;
  bounds: TerrainSplatGridBounds;
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
  fallbackKind?: Kind;
  fallbackLayerId?: TerrainMaterialLayerId;
  blendWidth?: number;
  lodStepMultiplier?: number;
  budgetMs?: number;
  fallbackLodStepMultiplier?: number;
  terrainStateRevision?: string | number;
  cache?: TerrainSplatChunkBuildCache<TerrainSplatWorkerBuildResult>;
  nowMs?: () => number;
}): TerrainSplatChunkBuildResult {
  const request = createTerrainSplatWorkerBuildRequest({
    seed: params.seed,
    bounds: params.bounds,
    resolveTile: params.resolveTile,
    fallbackKind: params.fallbackKind,
    fallbackLayerId: params.fallbackLayerId,
    blendWidth: params.blendWidth,
    lodStepMultiplier: params.lodStepMultiplier,
    budgetMs: params.budgetMs,
    fallbackLodStepMultiplier: params.fallbackLodStepMultiplier,
  });
  const cacheKeyInput: TerrainSplatChunkStateKeyInput = {
    request,
    terrainStateRevision: params.terrainStateRevision,
  };
  const cacheKey = createTerrainSplatChunkStateKey(cacheKeyInput);

  if (params.cache?.has(cacheKey)) {
    const cached = params.cache.get(cacheKey);
    if (cached !== undefined) {
      return {
        request,
        result: cached,
        cacheKey,
        fromCache: true,
      };
    }
  }

  const result = buildTerrainSplatWorkerResult(
    request,
    params.kindCatalog,
    params.layerCatalog,
    {
      nowMs: params.nowMs,
    }
  );
  params.cache?.set(cacheKey, result);

  return {
    request,
    result,
    cacheKey,
    fromCache: false,
  };
}
