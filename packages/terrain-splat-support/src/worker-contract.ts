import type { Kind, Seed } from '@bworlds/plugin-api';
import type {
  TerrainKindSplatCatalogEntry,
  TerrainMaterialLayerCatalogEntry,
  TerrainMaterialLayerId,
} from './index.ts';
import {
  createAdaptiveTerrainSplatSampleGrid,
  createTerrainSplatGridTileResolver,
  createTerrainSplatSampleGrid,
  createTerrainSplatSampleGridLod,
  packTerrainSplatSampleGrid,
  type PackedTerrainSplatSampleGrid,
  type ResolveTerrainSplatGridTile,
  type TerrainSplatGridBounds,
  type TerrainSplatGridBuildMetrics,
  type TerrainSplatGridTile,
} from './sample-grid.ts';

export type TerrainSplatWorkerBuildTile = TerrainSplatGridTile & {
  x: number;
  y: number;
};

export type TerrainSplatWorkerBuildRequest = {
  seed: Seed;
  bounds: TerrainSplatGridBounds;
  tiles: readonly TerrainSplatWorkerBuildTile[];
  fallbackKind?: Kind;
  fallbackLayerId?: TerrainMaterialLayerId;
  blendWidth?: number;
  lodStepMultiplier?: number;
  budgetMs?: number;
  fallbackLodStepMultiplier?: number;
};

export type TerrainSplatWorkerBuildResult = {
  packedGrid: PackedTerrainSplatSampleGrid;
  metrics: TerrainSplatGridBuildMetrics | null;
};

export function createTerrainSplatWorkerBuildRequest(params: {
  seed: Seed;
  bounds: TerrainSplatGridBounds;
  resolveTile: ResolveTerrainSplatGridTile;
  fallbackKind?: Kind;
  fallbackLayerId?: TerrainMaterialLayerId;
  blendWidth?: number;
  lodStepMultiplier?: number;
  budgetMs?: number;
  fallbackLodStepMultiplier?: number;
}): TerrainSplatWorkerBuildRequest {
  const tiles: TerrainSplatWorkerBuildTile[] = [];
  const step = params.bounds.step ?? 1;
  const tileMargin = resolveTerrainSplatWorkerTileMargin(params);

  for (
    let y = params.bounds.minY - tileMargin * step;
    y <= params.bounds.maxY + tileMargin * step;
    y += step
  ) {
    for (
      let x = params.bounds.minX - tileMargin * step;
      x <= params.bounds.maxX + tileMargin * step;
      x += step
    ) {
      const tile = params.resolveTile({ x, y });
      tiles.push({
        x,
        y,
        kind: tile.kind,
        signals: tile.signals,
      });
    }
  }

  return {
    seed: params.seed,
    bounds: params.bounds,
    tiles,
    fallbackKind: params.fallbackKind,
    fallbackLayerId: params.fallbackLayerId,
    blendWidth: params.blendWidth,
    lodStepMultiplier: params.lodStepMultiplier,
    budgetMs: params.budgetMs,
    fallbackLodStepMultiplier: params.fallbackLodStepMultiplier,
  };
}

export function buildTerrainSplatWorkerResult(
  request: TerrainSplatWorkerBuildRequest,
  kindCatalog:
    | ReadonlyMap<Kind, TerrainKindSplatCatalogEntry>
    | {
        byKind: ReadonlyMap<Kind, TerrainKindSplatCatalogEntry>;
      },
  layerCatalog:
    | ReadonlyMap<TerrainMaterialLayerId, TerrainMaterialLayerCatalogEntry>
    | {
        byId: ReadonlyMap<
          TerrainMaterialLayerId,
          TerrainMaterialLayerCatalogEntry
        >;
      },
  options: {
    nowMs?: () => number;
  } = {}
): TerrainSplatWorkerBuildResult {
  const tileByPosition = new Map(
    request.tiles.map((tile) => [`${tile.x}:${tile.y}`, tile] as const)
  );
  const resolveTile = createTerrainSplatGridTileResolver(({ x, y }) => {
    const tile = tileByPosition.get(`${x}:${y}`);
    if (!tile) {
      throw new Error(`Missing terrain splat worker tile input for ${x}:${y}.`);
    }
    return {
      kind: tile.kind,
      signals: tile.signals,
    };
  });

  const gridResult = shouldUseAdaptiveGridBuild(request)
    ? createAdaptiveTerrainSplatSampleGrid({
        seed: request.seed,
        bounds: request.bounds,
        kindCatalog,
        resolveTile,
        fallbackKind: request.fallbackKind,
        fallbackLayerId: request.fallbackLayerId,
        blendWidth: request.blendWidth,
        lodStepMultiplier: request.lodStepMultiplier,
        budgetMs: request.budgetMs,
        fallbackLodStepMultiplier: request.fallbackLodStepMultiplier,
        nowMs: options.nowMs,
      })
    : {
        grid: buildTerrainSplatGridFromWorkerRequest(
          request,
          kindCatalog,
          resolveTile
        ),
        metrics: null,
      };

  return {
    packedGrid: packTerrainSplatSampleGrid(gridResult.grid, layerCatalog, {
      fallbackLayerId: request.fallbackLayerId,
    }),
    metrics: gridResult.metrics,
  };
}

export function listTerrainSplatWorkerResultTransferables(
  result: TerrainSplatWorkerBuildResult
): Transferable[] {
  return [
    result.packedGrid.layerIndices.buffer,
    result.packedGrid.weights.buffer,
  ];
}

function shouldUseAdaptiveGridBuild(
  request: TerrainSplatWorkerBuildRequest
): boolean {
  return (
    request.budgetMs !== undefined ||
    request.fallbackLodStepMultiplier !== undefined
  );
}

function buildTerrainSplatGridFromWorkerRequest(
  request: TerrainSplatWorkerBuildRequest,
  kindCatalog:
    | ReadonlyMap<Kind, TerrainKindSplatCatalogEntry>
    | {
        byKind: ReadonlyMap<Kind, TerrainKindSplatCatalogEntry>;
      },
  resolveTile: ResolveTerrainSplatGridTile
) {
  if (
    typeof request.lodStepMultiplier === 'number' &&
    request.lodStepMultiplier > 1
  ) {
    return createTerrainSplatSampleGridLod({
      seed: request.seed,
      bounds: request.bounds,
      kindCatalog,
      resolveTile,
      fallbackKind: request.fallbackKind,
      fallbackLayerId: request.fallbackLayerId,
      blendWidth: request.blendWidth,
      lodStepMultiplier: request.lodStepMultiplier,
    });
  }

  return createTerrainSplatSampleGrid({
    seed: request.seed,
    bounds: request.bounds,
    kindCatalog,
    resolveTile,
    fallbackKind: request.fallbackKind,
    fallbackLayerId: request.fallbackLayerId,
    blendWidth: request.blendWidth,
  });
}

function resolveTerrainSplatWorkerTileMargin(params: {
  blendWidth?: number;
  lodStepMultiplier?: number;
  fallbackLodStepMultiplier?: number;
}): number {
  const blendMargin =
    typeof params.blendWidth === 'number' && params.blendWidth > 0
      ? Math.floor(params.blendWidth)
      : 0;
  const lodMargin = Math.max(
    0,
    typeof params.lodStepMultiplier === 'number'
      ? Math.floor(params.lodStepMultiplier) - 1
      : 0,
    typeof params.fallbackLodStepMultiplier === 'number'
      ? Math.floor(params.fallbackLodStepMultiplier) - 1
      : 0
  );
  return Math.max(blendMargin, lodMargin);
}
