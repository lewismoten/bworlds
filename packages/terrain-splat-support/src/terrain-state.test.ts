import { describe, expect, it } from 'vitest';
import {
  createOverworldTerrainSplatDefinitions,
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
} from './index.ts';
import {
  buildTerrainSplatChunkData,
  buildTerrainSplatChunkDataFromTerrainState,
} from './chunk-build.ts';
import { createTerrainSplatChunkBuildCache } from './chunk-cache.ts';
import { createTerrainSplatGridTileResolver } from './sample-grid.ts';
import {
  createTerrainSplatTerrainStateResolver,
  createTerrainSplatTerrainStateSnapshot,
} from './terrain-state.ts';
import type { TerrainSplatWorkerBuildResult } from './worker-contract.ts';

describe('terrain splat terrain state', () => {
  it('captures terrain state as plain tiles that can be replayed without gameplay callbacks', () => {
    const snapshot = createTerrainSplatTerrainStateSnapshot({
      seed: 'terrain-state-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
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
      terrainStateRevision: 'rev-a',
    });

    const resolveTile = createTerrainSplatTerrainStateResolver(snapshot);

    expect(snapshot.tiles.length).toBeGreaterThan(9);
    expect(resolveTile({ x: 0, y: 0 })).toEqual({
      kind: 'plains',
      signals: {
        moisture: 0.58,
        roadSignal: 0,
        season: 'summer',
        temperature: 0.68,
      },
    });
    expect(resolveTile({ x: 1, y: 2 }).kind).toBe('forest');
  });

  it('builds the same packed chunk data from captured terrain state as from a live resolver', () => {
    const { layerCatalog, kindCatalog } = createTerrainStateCatalogs();
    const resolveTile = createTerrainSplatGridTileResolver(({ x, y }) => ({
      kind: x >= 1 ? 'forest' : y >= 1 ? 'road' : 'plains',
      signals: {
        moisture: 0.58,
        roadSignal: y >= 1 ? 0.8 : 0,
        season: 'summer',
        temperature: 0.68,
      },
    }));

    const live = buildTerrainSplatChunkData({
      seed: 'terrain-state-seed',
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
    });
    const snapshot = createTerrainSplatTerrainStateSnapshot({
      seed: 'terrain-state-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      resolveTile,
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });
    const fromState = buildTerrainSplatChunkDataFromTerrainState({
      terrainState: snapshot,
      kindCatalog,
      layerCatalog,
    });

    expect(fromState.request).toEqual(live.request);
    expect(fromState.result.packedGrid).toEqual(live.result.packedGrid);
    expect(fromState.result.metrics).toEqual(live.result.metrics);
  });

  it('reuses cached chunk builds by terrain-state revision when building from a snapshot', () => {
    const { layerCatalog, kindCatalog } = createTerrainStateCatalogs();
    const cache =
      createTerrainSplatChunkBuildCache<TerrainSplatWorkerBuildResult>(8);
    const tileKinds = new Map<string, 'plains' | 'forest'>([
      ['0:0', 'plains'],
      ['1:0', 'forest'],
      ['2:0', 'forest'],
      ['0:1', 'plains'],
      ['1:1', 'forest'],
      ['2:1', 'forest'],
      ['0:2', 'plains'],
      ['1:2', 'forest'],
      ['2:2', 'forest'],
    ]);
    const resolveTile = createTerrainSplatGridTileResolver(({ x, y }) => ({
      kind: tileKinds.get(`${x}:${y}`) ?? 'plains',
      signals: {
        moisture: 0.6,
      },
    }));

    const snapshot = createTerrainSplatTerrainStateSnapshot({
      seed: 'terrain-state-cache-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      resolveTile,
      fallbackLayerId: 'grass-a',
      terrainStateRevision: 'rev-a',
    });
    tileKinds.set('1:1', 'plains');

    const first = buildTerrainSplatChunkDataFromTerrainState({
      terrainState: snapshot,
      kindCatalog,
      layerCatalog,
      cache,
    });
    const repeated = buildTerrainSplatChunkDataFromTerrainState({
      terrainState: snapshot,
      kindCatalog,
      layerCatalog,
      cache,
    });
    const revised = buildTerrainSplatChunkDataFromTerrainState({
      terrainState: {
        ...snapshot,
        terrainStateRevision: 'rev-b',
      },
      kindCatalog,
      layerCatalog,
      cache,
    });

    expect(first.fromCache).toBe(false);
    expect(repeated.fromCache).toBe(true);
    expect(repeated.result).toBe(first.result);
    expect(revised.fromCache).toBe(false);
    expect(revised.result).not.toBe(first.result);
    expect(cache.size()).toBe(2);
  });
});

function createTerrainStateCatalogs() {
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
      defaultTint: '#8a837a',
      defaultRoughness: 0.74,
    },
  ]);
  const layerSet = {
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
  } as const;

  return {
    layerCatalog,
    kindCatalog: createTerrainKindSplatCatalog(
      createOverworldTerrainSplatDefinitions(layerSet),
      layerCatalog
    ),
  };
}
