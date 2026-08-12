import type { Kind, Seed } from '@bworlds/plugin-api';
import {
  createTerrainSplatGeometryAttributePlanSetFromWorkerResult,
  type TerrainSplatGeometryAttributePlanSet,
} from './attribute-plan.ts';
import type {
  TerrainKindSplatCatalogEntry,
  TerrainMaterialLayerCatalogEntry,
  TerrainMaterialLayerId,
} from './index.ts';
import type { TerrainSplatChunkBuildCache } from './chunk-cache.ts';
import {
  createTerrainHeightField,
  createTerrainSplatHeightGeometryPlan,
  type TerrainHeightField,
  type TerrainSplatHeightGeometryPlan,
} from './height-field.ts';
import {
  createTerrainSplatChunkStateKey,
  type TerrainSplatChunkStateKeyInput,
} from './chunk-cache.ts';
import type {
  ResolveTerrainSplatGridTile,
  TerrainSplatGridBounds,
  TerrainSplatSampleGrid,
} from './sample-grid.ts';
import { unpackTerrainSplatSampleGrid } from './sample-grid.ts';
import {
  buildTerrainSplatWorkerResult,
  createTerrainSplatWorkerBuildRequest,
  type TerrainSplatWorkerBuildRequest,
  type TerrainSplatWorkerBuildResult,
} from './worker-contract.ts';
import {
  createTerrainSplatWorkerBuildRequestFromTerrainState,
  type TerrainSplatTerrainStateSnapshot,
} from './terrain-state.ts';
import {
  createTerrainSplatWorkerBuildRequestMessage,
  runTerrainSplatWorkerBuild,
  type TerrainSplatWorkerLike,
} from './worker-runtime.ts';

export type TerrainSplatChunkBuildResult = {
  request: TerrainSplatWorkerBuildRequest;
  result: TerrainSplatWorkerBuildResult;
  cacheKey: string;
  fromCache: boolean;
};

export type TerrainSplatChunkRenderDataResult = {
  request: TerrainSplatWorkerBuildRequest;
  result: TerrainSplatWorkerBuildResult;
  grid: TerrainSplatSampleGrid;
  heightField: TerrainHeightField;
  geometryPlan: TerrainSplatHeightGeometryPlan;
  attributePlanSet: TerrainSplatGeometryAttributePlanSet;
  cacheKey: string;
  fromCache: boolean;
};

function toLayerCatalogEntries(
  catalog:
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        byId: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
        entries?: readonly TerrainMaterialLayerCatalogEntry[];
      }
): readonly TerrainMaterialLayerCatalogEntry[] {
  if ('entries' in catalog && Array.isArray(catalog.entries)) {
    return catalog.entries;
  }
  const byId = 'byId' in catalog ? catalog.byId : catalog;
  return [...byId.values()].sort((left, right) => left.index - right.index);
}

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
  return buildTerrainSplatChunkDataFromRequest({
    request,
    terrainStateRevision: params.terrainStateRevision,
    kindCatalog: params.kindCatalog,
    layerCatalog: params.layerCatalog,
    cache: params.cache,
    nowMs: params.nowMs,
  });
}

export function buildTerrainSplatChunkRenderData(params: {
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
  resolveHeight: (position: { x: number; y: number }) => number;
  fallbackKind?: Kind;
  fallbackLayerId?: TerrainMaterialLayerId;
  blendWidth?: number;
  lodStepMultiplier?: number;
  budgetMs?: number;
  fallbackLodStepMultiplier?: number;
  normalSampleRing?: number;
  terrainStateRevision?: string | number;
  cache?: TerrainSplatChunkBuildCache<TerrainSplatChunkRenderCacheValue>;
  nowMs?: () => number;
}): TerrainSplatChunkRenderDataResult {
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
  return buildTerrainSplatChunkRenderDataFromRequest({
    request,
    terrainStateRevision: params.terrainStateRevision,
    kindCatalog: params.kindCatalog,
    layerCatalog: params.layerCatalog,
    resolveHeight: params.resolveHeight,
    normalSampleRing: params.normalSampleRing,
    cache: params.cache,
    nowMs: params.nowMs,
  });
}

export async function buildTerrainSplatChunkDataInWorker(params: {
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
  worker: TerrainSplatWorkerLike;
  fallbackKind?: Kind;
  fallbackLayerId?: TerrainMaterialLayerId;
  blendWidth?: number;
  lodStepMultiplier?: number;
  budgetMs?: number;
  fallbackLodStepMultiplier?: number;
  terrainStateRevision?: string | number;
  cache?: TerrainSplatChunkBuildCache<TerrainSplatWorkerBuildResult>;
}): Promise<TerrainSplatChunkBuildResult> {
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

  const result = await runTerrainSplatWorkerBuild({
    worker: params.worker,
    message: createTerrainSplatWorkerBuildRequestMessage({
      request,
      kindCatalog: params.kindCatalog,
      layerCatalog: params.layerCatalog,
    }),
  });
  params.cache?.set(cacheKey, result);

  return {
    request,
    result,
    cacheKey,
    fromCache: false,
  };
}

export function buildTerrainSplatChunkDataFromTerrainState(params: {
  terrainState: TerrainSplatTerrainStateSnapshot;
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
  cache?: TerrainSplatChunkBuildCache<TerrainSplatWorkerBuildResult>;
  nowMs?: () => number;
}): TerrainSplatChunkBuildResult {
  return buildTerrainSplatChunkDataFromRequest({
    request: createTerrainSplatWorkerBuildRequestFromTerrainState(
      params.terrainState
    ),
    terrainStateRevision: params.terrainState.terrainStateRevision,
    kindCatalog: params.kindCatalog,
    layerCatalog: params.layerCatalog,
    cache: params.cache,
    nowMs: params.nowMs,
  });
}

export function buildTerrainSplatChunkRenderDataFromTerrainState(params: {
  terrainState: TerrainSplatTerrainStateSnapshot;
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
  resolveHeight: (position: { x: number; y: number }) => number;
  normalSampleRing?: number;
  cache?: TerrainSplatChunkBuildCache<TerrainSplatChunkRenderCacheValue>;
  nowMs?: () => number;
}): TerrainSplatChunkRenderDataResult {
  return buildTerrainSplatChunkRenderDataFromRequest({
    request: createTerrainSplatWorkerBuildRequestFromTerrainState(
      params.terrainState
    ),
    terrainStateRevision: params.terrainState.terrainStateRevision,
    kindCatalog: params.kindCatalog,
    layerCatalog: params.layerCatalog,
    resolveHeight: params.resolveHeight,
    normalSampleRing: params.normalSampleRing,
    cache: params.cache,
    nowMs: params.nowMs,
  });
}

function buildTerrainSplatChunkDataFromRequest(params: {
  request: TerrainSplatWorkerBuildRequest;
  terrainStateRevision?: string | number;
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
  cache?: TerrainSplatChunkBuildCache<TerrainSplatWorkerBuildResult>;
  nowMs?: () => number;
}): TerrainSplatChunkBuildResult {
  const cacheKeyInput: TerrainSplatChunkStateKeyInput = {
    request: params.request,
    terrainStateRevision: params.terrainStateRevision,
  };
  const cacheKey = createTerrainSplatChunkStateKey(cacheKeyInput);

  if (params.cache?.has(cacheKey)) {
    const cached = params.cache.get(cacheKey);
    if (cached !== undefined) {
      return {
        request: params.request,
        result: cached,
        cacheKey,
        fromCache: true,
      };
    }
  }

  const result = buildTerrainSplatWorkerResult(
    params.request,
    params.kindCatalog,
    params.layerCatalog,
    {
      nowMs: params.nowMs,
    }
  );
  params.cache?.set(cacheKey, result);

  return {
    request: params.request,
    result,
    cacheKey,
    fromCache: false,
  };
}

type TerrainSplatChunkRenderCacheValue = {
  result: TerrainSplatWorkerBuildResult;
  grid: TerrainSplatSampleGrid;
  heightField: TerrainHeightField;
  geometryPlan: TerrainSplatHeightGeometryPlan;
  attributePlanSet: TerrainSplatGeometryAttributePlanSet;
};

function buildTerrainSplatChunkRenderDataFromRequest(params: {
  request: TerrainSplatWorkerBuildRequest;
  terrainStateRevision?: string | number;
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
  resolveHeight: (position: { x: number; y: number }) => number;
  normalSampleRing?: number;
  cache?: TerrainSplatChunkBuildCache<TerrainSplatChunkRenderCacheValue>;
  nowMs?: () => number;
}): TerrainSplatChunkRenderDataResult {
  const cacheKeyInput: TerrainSplatChunkStateKeyInput = {
    request: params.request,
    terrainStateRevision: params.terrainStateRevision,
  };
  const cacheKey = createTerrainSplatChunkStateKey(cacheKeyInput);
  const cached = params.cache?.get(cacheKey);
  if (cached) {
    return {
      request: params.request,
      result: cached.result,
      grid: cached.grid,
      heightField: cached.heightField,
      geometryPlan: cached.geometryPlan,
      attributePlanSet: cached.attributePlanSet,
      cacheKey,
      fromCache: true,
    };
  }

  const built = buildTerrainSplatChunkDataFromRequest({
    request: params.request,
    terrainStateRevision: params.terrainStateRevision,
    kindCatalog: params.kindCatalog,
    layerCatalog: params.layerCatalog,
    nowMs: params.nowMs,
  });
  const heightField = createTerrainHeightField({
    bounds: {
      minX: built.result.packedGrid.minX,
      maxX: built.result.packedGrid.maxX,
      minY: built.result.packedGrid.minY,
      maxY: built.result.packedGrid.maxY,
      step: built.result.packedGrid.step,
    },
    normalSampleRing: params.normalSampleRing,
    resolveHeight: params.resolveHeight,
  });
  const geometryPlan = createTerrainSplatHeightGeometryPlan({
    grid: built.result.packedGrid,
    heightField,
  });
  const attributePlanSet =
    createTerrainSplatGeometryAttributePlanSetFromWorkerResult(built.result);
  const grid = unpackTerrainSplatSampleGrid(
    built.result.packedGrid,
    toLayerCatalogEntries(params.layerCatalog)
  );
  const renderData = {
    result: built.result,
    grid,
    heightField,
    geometryPlan,
    attributePlanSet,
  };
  params.cache?.set(cacheKey, renderData);

  return {
    request: built.request,
    result: built.result,
    grid,
    heightField,
    geometryPlan,
    attributePlanSet,
    cacheKey,
    fromCache: false,
  };
}
