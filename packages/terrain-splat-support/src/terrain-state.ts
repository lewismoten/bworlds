import type { Kind, Seed } from '@bworlds/plugin-api';
import type {
  TerrainMaterialLayerId,
} from './index.ts';
import type {
  ResolveTerrainSplatGridTile,
  TerrainSplatGridBounds,
} from './sample-grid.ts';
import { createTerrainSplatGridTileResolver } from './sample-grid.ts';
import {
  createTerrainSplatWorkerBuildRequest,
  type TerrainSplatWorkerBuildRequest,
  type TerrainSplatWorkerBuildTile,
} from './worker-contract.ts';

export type TerrainSplatTerrainStateTile = TerrainSplatWorkerBuildTile;

export type TerrainSplatTerrainStateSnapshot = {
  seed: Seed;
  bounds: TerrainSplatGridBounds;
  tiles: readonly TerrainSplatTerrainStateTile[];
  fallbackKind?: Kind;
  fallbackLayerId?: TerrainMaterialLayerId;
  blendWidth?: number;
  lodStepMultiplier?: number;
  budgetMs?: number;
  fallbackLodStepMultiplier?: number;
  terrainStateRevision?: string | number;
};

export function createTerrainSplatTerrainStateSnapshot(params: {
  seed: Seed;
  bounds: TerrainSplatGridBounds;
  resolveTile: ResolveTerrainSplatGridTile;
  fallbackKind?: Kind;
  fallbackLayerId?: TerrainMaterialLayerId;
  blendWidth?: number;
  lodStepMultiplier?: number;
  budgetMs?: number;
  fallbackLodStepMultiplier?: number;
  terrainStateRevision?: string | number;
}): TerrainSplatTerrainStateSnapshot {
  const request = createTerrainSplatWorkerBuildRequest(params);

  return {
    ...request,
    terrainStateRevision: params.terrainStateRevision,
  };
}

export function createTerrainSplatTerrainStateResolver(
  snapshot: TerrainSplatTerrainStateSnapshot
): ResolveTerrainSplatGridTile {
  const tileByPosition = new Map(
    snapshot.tiles.map((tile) => [`${tile.x}:${tile.y}`, tile] as const)
  );

  return createTerrainSplatGridTileResolver(({ x, y }) => {
    const tile = tileByPosition.get(`${x}:${y}`);
    if (!tile) {
      throw new Error(`Missing terrain state tile for ${x}:${y}.`);
    }
    return {
      kind: tile.kind,
      signals: tile.signals,
    };
  });
}

export function createTerrainSplatWorkerBuildRequestFromTerrainState(
  snapshot: TerrainSplatTerrainStateSnapshot
): TerrainSplatWorkerBuildRequest {
  return {
    seed: snapshot.seed,
    bounds: snapshot.bounds,
    tiles: [...snapshot.tiles],
    fallbackKind: snapshot.fallbackKind,
    fallbackLayerId: snapshot.fallbackLayerId,
    blendWidth: snapshot.blendWidth,
    lodStepMultiplier: snapshot.lodStepMultiplier,
    budgetMs: snapshot.budgetMs,
    fallbackLodStepMultiplier: snapshot.fallbackLodStepMultiplier,
  };
}
