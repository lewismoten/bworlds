import { describe, expect, it } from 'vitest';
import {
  createOverworldTerrainSplatDefinitions,
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
} from './index.ts';
import { buildTerrainSplatChunkData } from './chunk-build.ts';
import { createTerrainSplatChunkBuildCache } from './chunk-cache.ts';
import { createTerrainSplatGridTileResolver } from './sample-grid.ts';
import type { TerrainSplatWorkerBuildResult } from './worker-contract.ts';

describe('terrain splat chunk build', () => {
  it('builds packed splat chunk data from one tile resolver', () => {
    const { layerCatalog, kindCatalog } = createChunkBuildCatalogs();

    const built = buildTerrainSplatChunkData({
      seed: 'chunk-build-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      layerCatalog,
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

    expect(built.fromCache).toBe(false);
    expect(built.request.tiles.length).toBeGreaterThan(9);
    expect(built.result.packedGrid.width).toBe(3);
    expect(built.result.packedGrid.height).toBe(3);
    expect(built.result.packedGrid.layerIndices).toHaveLength(36);
    expect(built.result.metrics).toBeNull();
  });

  it('reuses cached chunk splat data until the terrain state changes', () => {
    const { layerCatalog, kindCatalog } = createChunkBuildCatalogs();
    const cache =
      createTerrainSplatChunkBuildCache<TerrainSplatWorkerBuildResult>(8);
    let resolveTileCalls = 0;
    const resolveTile = createTerrainSplatGridTileResolver(({ x }) => {
      resolveTileCalls += 1;
      return {
        kind: x >= 1 ? 'forest' : 'plains',
        signals: {
          moisture: 0.6,
        },
      };
    });

    const first = buildTerrainSplatChunkData({
      seed: 'chunk-build-cache-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      layerCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
      terrainStateRevision: 'rev-a',
      cache,
    });
    const repeated = buildTerrainSplatChunkData({
      seed: 'chunk-build-cache-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      layerCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
      terrainStateRevision: 'rev-a',
      cache,
    });
    const revised = buildTerrainSplatChunkData({
      seed: 'chunk-build-cache-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      layerCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
      terrainStateRevision: 'rev-b',
      cache,
    });

    expect(first.fromCache).toBe(false);
    expect(repeated.fromCache).toBe(true);
    expect(repeated.result).toBe(first.result);
    expect(revised.fromCache).toBe(false);
    expect(revised.result).not.toBe(first.result);
    expect(resolveTileCalls).toBeGreaterThan(0);
    expect(cache.size()).toBe(2);
  });
});

function createChunkBuildCatalogs() {
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
