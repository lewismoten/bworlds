import type { TerrainSplatChunkBuildResult } from './chunk-build.ts';
import type { PackedTerrainSplatSampleGrid } from './sample-grid.ts';
import type { TerrainSplatWorkerBuildResult } from './worker-contract.ts';

export type TerrainSplatGeometryAttributeName =
  | 'terrainSplatLayerIndices'
  | 'terrainSplatLayerWeights';

export type TerrainSplatGeometryAttributePlan = {
  name: TerrainSplatGeometryAttributeName;
  itemSize: 4;
  normalized: boolean;
  componentType: 'uint8';
  count: number;
  byteLength: number;
  array: Uint8Array;
};

export type TerrainSplatGeometryAttributePlanSet = {
  width: number;
  height: number;
  sampleCount: number;
  step: number;
  packedMemoryUsageBytes: number;
  attributes: readonly TerrainSplatGeometryAttributePlan[];
};

export function createTerrainSplatGeometryAttributePlanSet(
  grid: PackedTerrainSplatSampleGrid
): TerrainSplatGeometryAttributePlanSet {
  const sampleCount = grid.width * grid.height;
  assertPackedGridAttributeLength(grid.layerIndices, sampleCount, 'layerIndices');
  assertPackedGridAttributeLength(grid.weights, sampleCount, 'weights');

  return {
    width: grid.width,
    height: grid.height,
    sampleCount,
    step: grid.step,
    packedMemoryUsageBytes: grid.layerIndices.byteLength + grid.weights.byteLength,
    attributes: [
      {
        name: 'terrainSplatLayerIndices',
        itemSize: 4,
        normalized: false,
        componentType: 'uint8',
        count: sampleCount,
        byteLength: grid.layerIndices.byteLength,
        array: grid.layerIndices,
      },
      {
        name: 'terrainSplatLayerWeights',
        itemSize: 4,
        normalized: true,
        componentType: 'uint8',
        count: sampleCount,
        byteLength: grid.weights.byteLength,
        array: grid.weights,
      },
    ],
  };
}

export function createTerrainSplatGeometryAttributePlanSetFromWorkerResult(
  result: TerrainSplatWorkerBuildResult
): TerrainSplatGeometryAttributePlanSet {
  return createTerrainSplatGeometryAttributePlanSet(result.packedGrid);
}

export function createTerrainSplatGeometryAttributePlanSetFromChunkBuild(
  built: Pick<TerrainSplatChunkBuildResult, 'result'>
): TerrainSplatGeometryAttributePlanSet {
  return createTerrainSplatGeometryAttributePlanSetFromWorkerResult(built.result);
}

function assertPackedGridAttributeLength(
  array: Uint8Array,
  sampleCount: number,
  label: 'layerIndices' | 'weights'
): void {
  const expectedLength = sampleCount * 4;
  if (array.length !== expectedLength) {
    throw new Error(
      `Packed terrain splat grid ${label} length ${array.length} must equal ${expectedLength} for ${sampleCount} sample(s).`
    );
  }
}
