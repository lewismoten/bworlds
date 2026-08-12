import type { TerrainMaterialLayerId, TerrainSplatSample } from './index.ts';
import type { TerrainSplatSampleGrid } from './sample-grid.ts';
import { getTerrainSplatGridSample } from './sample-grid.ts';

export type TerrainSplatChunkSeamEdge = 'east-west' | 'south-north';

export type TerrainSplatChunkSeamMismatchCode =
  'active-layer-mismatch' | 'weight-mismatch';

export type TerrainSplatChunkSeamMismatch = {
  index: number;
  primaryColumn: number;
  primaryRow: number;
  adjacentColumn: number;
  adjacentRow: number;
  code: TerrainSplatChunkSeamMismatchCode;
  layerId: TerrainMaterialLayerId | null;
  primaryWeight: number | null;
  adjacentWeight: number | null;
};

type TerrainSplatChunkSeamSampleMismatch = Pick<
  TerrainSplatChunkSeamMismatch,
  'code' | 'layerId' | 'primaryWeight' | 'adjacentWeight'
>;

export type TerrainSplatChunkSeamAnalysis = {
  edge: TerrainSplatChunkSeamEdge;
  seamLength: number;
  mismatchCount: number;
  matchesExactly: boolean;
  mismatches: readonly TerrainSplatChunkSeamMismatch[];
};

export function analyzeTerrainSplatChunkSeam(params: {
  primaryGrid: TerrainSplatSampleGrid;
  adjacentGrid: TerrainSplatSampleGrid;
  edge: TerrainSplatChunkSeamEdge;
  weightTolerance?: number;
}): TerrainSplatChunkSeamAnalysis {
  const weightTolerance = params.weightTolerance ?? 0.001;
  if (!(weightTolerance >= 0) || !Number.isFinite(weightTolerance)) {
    throw new Error(
      'Terrain splat chunk seam debug weightTolerance must be a finite non-negative number.'
    );
  }

  const seamLength =
    params.edge === 'east-west'
      ? assertCompatibleEastWestSeam(params.primaryGrid, params.adjacentGrid)
      : assertCompatibleSouthNorthSeam(params.primaryGrid, params.adjacentGrid);
  const mismatches: TerrainSplatChunkSeamMismatch[] = [];

  for (let index = 0; index < seamLength; index += 1) {
    const coordinates =
      params.edge === 'east-west'
        ? {
            primaryColumn: params.primaryGrid.width - 1,
            primaryRow: index,
            adjacentColumn: 0,
            adjacentRow: index,
          }
        : {
            primaryColumn: index,
            primaryRow: params.primaryGrid.height - 1,
            adjacentColumn: index,
            adjacentRow: 0,
          };
    const primarySample = getTerrainSplatGridSample(
      params.primaryGrid,
      coordinates.primaryColumn,
      coordinates.primaryRow
    );
    const adjacentSample = getTerrainSplatGridSample(
      params.adjacentGrid,
      coordinates.adjacentColumn,
      coordinates.adjacentRow
    );
    const comparison = compareTerrainSplatSeamSamples(
      primarySample,
      adjacentSample,
      weightTolerance
    );

    for (const mismatch of comparison) {
      mismatches.push({
        index,
        ...coordinates,
        ...mismatch,
      });
    }
  }

  return {
    edge: params.edge,
    seamLength,
    mismatchCount: mismatches.length,
    matchesExactly: mismatches.length === 0,
    mismatches,
  };
}

function compareTerrainSplatSeamSamples(
  primary: TerrainSplatSample,
  adjacent: TerrainSplatSample,
  weightTolerance: number
): TerrainSplatChunkSeamSampleMismatch[] {
  const mismatches: TerrainSplatChunkSeamSampleMismatch[] = [];
  const primaryWeights = toLayerWeightMap(primary);
  const adjacentWeights = toLayerWeightMap(adjacent);
  const layerIds = [
    ...new Set([...primaryWeights.keys(), ...adjacentWeights.keys()]),
  ].sort();

  for (const layerId of layerIds) {
    const primaryWeight = primaryWeights.get(layerId) ?? null;
    const adjacentWeight = adjacentWeights.get(layerId) ?? null;

    if (primaryWeight === null || adjacentWeight === null) {
      mismatches.push({
        code: 'active-layer-mismatch',
        layerId,
        primaryWeight,
        adjacentWeight,
      });
      continue;
    }

    if (Math.abs(primaryWeight - adjacentWeight) > weightTolerance) {
      mismatches.push({
        code: 'weight-mismatch',
        layerId,
        primaryWeight,
        adjacentWeight,
      });
    }
  }

  return mismatches;
}

function toLayerWeightMap(
  sample: TerrainSplatSample
): ReadonlyMap<TerrainMaterialLayerId, number> {
  const weights = new Map<TerrainMaterialLayerId, number>();
  for (const entry of sample.entries) {
    weights.set(entry.layerId, entry.weight);
  }
  return weights;
}

function assertCompatibleEastWestSeam(
  primary: TerrainSplatSampleGrid,
  adjacent: TerrainSplatSampleGrid
): number {
  if (primary.height !== adjacent.height) {
    throw new Error(
      `Terrain splat chunk seam debug east-west grids must share height; received ${primary.height} and ${adjacent.height}.`
    );
  }
  if (primary.step !== adjacent.step) {
    throw new Error(
      `Terrain splat chunk seam debug east-west grids must share step; received ${primary.step} and ${adjacent.step}.`
    );
  }
  if (primary.maxX !== adjacent.minX) {
    throw new Error(
      `Terrain splat chunk seam debug east-west grids must touch on the same world border; received primary maxX ${primary.maxX} and adjacent minX ${adjacent.minX}.`
    );
  }
  if (primary.minY !== adjacent.minY || primary.maxY !== adjacent.maxY) {
    throw new Error(
      'Terrain splat chunk seam debug east-west grids must share the same y bounds.'
    );
  }
  return primary.height;
}

function assertCompatibleSouthNorthSeam(
  primary: TerrainSplatSampleGrid,
  adjacent: TerrainSplatSampleGrid
): number {
  if (primary.width !== adjacent.width) {
    throw new Error(
      `Terrain splat chunk seam debug south-north grids must share width; received ${primary.width} and ${adjacent.width}.`
    );
  }
  if (primary.step !== adjacent.step) {
    throw new Error(
      `Terrain splat chunk seam debug south-north grids must share step; received ${primary.step} and ${adjacent.step}.`
    );
  }
  if (primary.maxY !== adjacent.minY) {
    throw new Error(
      `Terrain splat chunk seam debug south-north grids must touch on the same world border; received primary maxY ${primary.maxY} and adjacent minY ${adjacent.minY}.`
    );
  }
  if (primary.minX !== adjacent.minX || primary.maxX !== adjacent.maxX) {
    throw new Error(
      'Terrain splat chunk seam debug south-north grids must share the same x bounds.'
    );
  }
  return primary.width;
}
