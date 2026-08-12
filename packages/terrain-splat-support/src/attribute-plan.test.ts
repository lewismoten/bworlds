import { describe, expect, it } from 'vitest';
import {
  createOverworldTerrainSplatDefinitions,
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
} from './index.ts';
import {
  createTerrainSplatGeometryAttributePlanSet,
  createTerrainSplatGeometryAttributePlanSetFromChunkBuild,
  createTerrainSplatGeometryAttributePlanSetFromWorkerResult,
} from './attribute-plan.ts';
import { buildTerrainSplatChunkData } from './chunk-build.ts';
import {
  createTerrainSplatGridTileResolver,
  createTerrainSplatSampleGrid,
  packTerrainSplatSampleGrid,
} from './sample-grid.ts';
import { buildTerrainSplatWorkerResult } from './worker-contract.ts';

describe('terrain splat geometry attribute plan', () => {
  it('creates stable geometry attributes from one packed splat grid', () => {
    const { layerCatalog, kindCatalog } = createCatalogs();
    const grid = createTerrainSplatSampleGrid({
      seed: 'attribute-plan-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      resolveTile: createTerrainSplatGridTileResolver(({ x, y }) => ({
        kind: x >= 1 ? 'forest' : y >= 1 ? 'road' : 'plains',
        signals: {
          moisture: 0.58,
          roadSignal: y >= 1 ? 0.8 : 0,
          season: 'summer',
          temperature: 0.68,
        },
      })),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });

    const plan = createTerrainSplatGeometryAttributePlanSet(
      packTerrainSplatSampleGrid(grid, layerCatalog, {
        fallbackLayerId: 'grass-a',
      })
    );

    expect(plan.width).toBe(3);
    expect(plan.height).toBe(3);
    expect(plan.sampleCount).toBe(9);
    expect(plan.packedMemoryUsageBytes).toBe(72);
    expect(plan.attributes).toEqual([
      expect.objectContaining({
        name: 'terrainSplatLayerIndices',
        itemSize: 4,
        normalized: false,
        componentType: 'uint8',
        count: 9,
        byteLength: 36,
      }),
      expect.objectContaining({
        name: 'terrainSplatLayerWeights',
        itemSize: 4,
        normalized: true,
        componentType: 'uint8',
        count: 9,
        byteLength: 36,
      }),
    ]);
  });

  it('can derive the same attribute plan from worker and chunk-build outputs', () => {
    const { layerCatalog, kindCatalog } = createCatalogs();
    const built = buildTerrainSplatChunkData({
      seed: 'attribute-plan-chunk-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      layerCatalog,
      resolveTile: createTerrainSplatGridTileResolver(({ x }) => ({
        kind: x >= 1 ? 'forest' : 'plains',
        signals: {
          moisture: 0.62,
          season: 'summer',
          temperature: 0.7,
        },
      })),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });
    const workerResult = buildTerrainSplatWorkerResult(
      built.request,
      kindCatalog,
      layerCatalog
    );

    const fromChunkBuild =
      createTerrainSplatGeometryAttributePlanSetFromChunkBuild(built);
    const fromWorkerResult =
      createTerrainSplatGeometryAttributePlanSetFromWorkerResult(workerResult);

    expect(fromChunkBuild).toEqual(fromWorkerResult);
    expect(fromChunkBuild.attributes[0]?.array).toBe(built.result.packedGrid.layerIndices);
    expect(fromChunkBuild.attributes[1]?.array).toBe(built.result.packedGrid.weights);
  });

  it('rejects packed grids whose attribute buffers do not match the sample count', () => {
    expect(() =>
      createTerrainSplatGeometryAttributePlanSet({
        minX: 0,
        maxX: 1,
        minY: 0,
        maxY: 1,
        step: 1,
        width: 2,
        height: 2,
        layerIndices: new Uint8Array(8),
        weights: new Uint8Array(16),
      })
    ).toThrow(
      'Packed terrain splat grid layerIndices length 8 must equal 16 for 4 sample(s).'
    );
  });
});

function createCatalogs() {
  const layerCatalog = createTerrainMaterialLayerCatalog([
    {
      id: 'grass-a',
      baseColorTextureId: 'grass-a/base',
      normalTextureId: 'grass-a/normal',
      roughnessTextureId: 'grass-a/roughness',
      textureScale: 3,
      defaultTint: '#88aa55',
      defaultRoughness: 0.9,
    },
    {
      id: 'grass-b',
      baseColorTextureId: 'grass-b/base',
      normalTextureId: 'grass-b/normal',
      roughnessTextureId: 'grass-b/roughness',
      textureScale: 3,
      defaultTint: '#7ea24a',
      defaultRoughness: 0.88,
    },
    {
      id: 'soil',
      baseColorTextureId: 'soil/base',
      normalTextureId: 'soil/normal',
      roughnessTextureId: 'soil/roughness',
      textureScale: 2,
      defaultTint: '#7b5a3d',
      defaultRoughness: 0.8,
    },
    {
      id: 'leaf',
      baseColorTextureId: 'leaf/base',
      normalTextureId: 'leaf/normal',
      roughnessTextureId: 'leaf/roughness',
      textureScale: 2,
      defaultTint: '#5f6f31',
      defaultRoughness: 0.92,
    },
    {
      id: 'rock',
      baseColorTextureId: 'rock/base',
      normalTextureId: 'rock/normal',
      roughnessTextureId: 'rock/roughness',
      textureScale: 4,
      defaultTint: '#7f7f7f',
      defaultRoughness: 0.7,
    },
    {
      id: 'sand',
      baseColorTextureId: 'sand/base',
      normalTextureId: 'sand/normal',
      roughnessTextureId: 'sand/roughness',
      textureScale: 4,
      defaultTint: '#c9bb82',
      defaultRoughness: 0.65,
    },
    {
      id: 'dirt',
      baseColorTextureId: 'dirt/base',
      normalTextureId: 'dirt/normal',
      roughnessTextureId: 'dirt/roughness',
      textureScale: 3,
      defaultTint: '#876748',
      defaultRoughness: 0.82,
    },
    {
      id: 'gravel',
      baseColorTextureId: 'gravel/base',
      normalTextureId: 'gravel/normal',
      roughnessTextureId: 'gravel/roughness',
      textureScale: 3,
      defaultTint: '#8f8a80',
      defaultRoughness: 0.76,
    },
    {
      id: 'mud',
      baseColorTextureId: 'mud/base',
      normalTextureId: 'mud/normal',
      roughnessTextureId: 'mud/roughness',
      textureScale: 3,
      defaultTint: '#6c533f',
      defaultRoughness: 0.58,
    },
    {
      id: 'snow',
      baseColorTextureId: 'snow/base',
      normalTextureId: 'snow/normal',
      roughnessTextureId: 'snow/roughness',
      textureScale: 4,
      defaultTint: '#eef2f6',
      defaultRoughness: 0.42,
    },
    {
      id: 'dirt-road',
      baseColorTextureId: 'dirt-road/base',
      normalTextureId: 'dirt-road/normal',
      roughnessTextureId: 'dirt-road/roughness',
      textureScale: 3,
      defaultTint: '#7a6245',
      defaultRoughness: 0.78,
    },
    {
      id: 'gravel-road',
      baseColorTextureId: 'gravel-road/base',
      normalTextureId: 'gravel-road/normal',
      roughnessTextureId: 'gravel-road/roughness',
      textureScale: 3,
      defaultTint: '#8d897f',
      defaultRoughness: 0.72,
    },
  ]);
  const kindCatalog = createTerrainKindSplatCatalog(
    createOverworldTerrainSplatDefinitions({
      grassLayerIds: ['grass-a', 'grass-b'],
      soilLayerId: 'soil',
      leafLayerId: 'leaf',
      rockLayerId: 'rock',
      sandLayerId: 'sand',
      dirtLayerId: 'dirt',
      gravelLayerId: 'gravel',
      mudLayerId: 'mud',
      snowLayerId: 'snow',
      dirtRoadLayerId: 'dirt-road',
      gravelRoadLayerId: 'gravel-road',
    }),
    layerCatalog
  );

  return {
    layerCatalog,
    kindCatalog,
  };
}
