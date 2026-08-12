import { describe, expect, it } from 'vitest';
import {
  createOverworldTerrainSplatDefinitions,
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
} from './index.ts';
import { createTerrainSplatGridTileResolver } from './sample-grid.ts';
import {
  buildTerrainSplatWorkerResult,
  createTerrainSplatWorkerBuildRequest,
  listTerrainSplatWorkerResultTransferables,
} from './worker-contract.ts';

describe('terrain splat worker contract', () => {
  it('serializes chunk tile inputs into a stable worker build request', () => {
    const request = createTerrainSplatWorkerBuildRequest({
      seed: 'worker-request-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      resolveTile: createTerrainSplatGridTileResolver(({ x, y }) => ({
        kind: x >= 1 ? 'forest' : 'plains',
        signals: {
          moisture: 0.55 + y * 0.1,
        },
      })),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });

    expect(request.tiles).toHaveLength(25);
    expect(request.tiles[0]).toMatchObject({
      x: -1,
      y: -1,
      kind: 'plains',
    });
    expect(request.tiles[12]).toMatchObject({
      x: 1,
      y: 1,
      kind: 'forest',
    });
  });

  it('builds a packed worker result and exposes transferable buffers', () => {
    const { layerCatalog, kindCatalog } = createWorkerCatalogs();
    const request = createTerrainSplatWorkerBuildRequest({
      seed: 'worker-result-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      resolveTile: createTerrainSplatGridTileResolver(({ x, y }) => ({
        kind: x >= 1 ? 'road' : y >= 1 ? 'forest' : 'plains',
        signals: {
          moisture: 0.6,
          roadSignal: x >= 1 ? 0.82 : 0,
          season: 'summer',
          temperature: 0.7,
        },
      })),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });

    const result = buildTerrainSplatWorkerResult(
      request,
      kindCatalog,
      layerCatalog
    );
    const transferables = listTerrainSplatWorkerResultTransferables(result);

    expect(result.packedGrid.width).toBe(3);
    expect(result.packedGrid.height).toBe(3);
    expect(result.metrics).toBeNull();
    expect(transferables).toHaveLength(2);
    expect(transferables[0]).toBe(result.packedGrid.layerIndices.buffer);
    expect(transferables[1]).toBe(result.packedGrid.weights.buffer);
  });

  it('supports adaptive worker builds with budget-driven fallback metrics', () => {
    const { layerCatalog, kindCatalog } = createWorkerCatalogs();
    const request = createTerrainSplatWorkerBuildRequest({
      seed: 'worker-adaptive-seed',
      bounds: {
        minX: 0,
        maxX: 6,
        minY: 0,
        maxY: 6,
      },
      resolveTile: createTerrainSplatGridTileResolver(({ x, y }) => ({
        kind: x >= 4 ? 'forest' : y >= 4 ? 'snow' : 'plains',
        signals: {
          moisture: 0.58,
          temperature: y >= 4 ? 0.18 : 0.68,
          season: y >= 4 ? 'winter' : 'summer',
        },
      })),
      fallbackLayerId: 'grass-a',
      budgetMs: 3,
      fallbackLodStepMultiplier: 2,
    });

    const result = buildTerrainSplatWorkerResult(
      request,
      kindCatalog,
      layerCatalog,
      {
        nowMs: createMockNowMs([10, 15, 20, 21]),
      }
    );

    expect(result.packedGrid.step).toBe(2);
    expect(result.metrics).toMatchObject({
      budgetMs: 3,
      quality: 'reduced',
    });
    expect(result.metrics?.warning).toContain(
      'fell back to LOD step multiplier 2'
    );
  });
});

function createWorkerCatalogs() {
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

function createMockNowMs(values: readonly number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}
