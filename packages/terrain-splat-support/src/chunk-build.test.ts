import { describe, expect, it } from 'vitest';
import {
  createOverworldTerrainSplatDefinitions,
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
} from './index.ts';
import {
  buildTerrainSplatChunkData,
  buildTerrainSplatChunkRenderData,
} from './chunk-build.ts';
import { createTerrainSplatChunkBuildCache } from './chunk-cache.ts';
import { createTerrainSplatGridTileResolver } from './sample-grid.ts';
import type { TerrainSplatWorkerBuildResult } from './worker-contract.ts';
import {
  buildTerrainSplatWorkerResponseMessage,
  createTerrainSplatWorkerBuildRequestMessage,
  type TerrainSplatWorkerErrorEvent,
  type TerrainSplatWorkerEvent,
  type TerrainSplatWorkerLike,
  type TerrainSplatWorkerMessage,
} from './worker-runtime.ts';
import { buildTerrainSplatChunkDataInWorker } from './chunk-build.ts';

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

  it('can build chunk splat data through one async worker path', async () => {
    const { layerCatalog, kindCatalog } = createChunkBuildCatalogs();
    const worker = new FakeTerrainSplatWorker();

    const built = await buildTerrainSplatChunkDataInWorker({
      seed: 'chunk-build-worker-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      layerCatalog,
      worker,
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
  });

  it('reuses cached async worker chunk data until the terrain state changes', async () => {
    const { layerCatalog, kindCatalog } = createChunkBuildCatalogs();
    const cache =
      createTerrainSplatChunkBuildCache<TerrainSplatWorkerBuildResult>(8);
    const worker = new FakeTerrainSplatWorker();
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

    const first = await buildTerrainSplatChunkDataInWorker({
      seed: 'chunk-build-worker-cache-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      layerCatalog,
      worker,
      resolveTile,
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
      terrainStateRevision: 'rev-a',
      cache,
    });
    const repeated = await buildTerrainSplatChunkDataInWorker({
      seed: 'chunk-build-worker-cache-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      layerCatalog,
      worker,
      resolveTile,
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
      terrainStateRevision: 'rev-a',
      cache,
    });

    expect(first.fromCache).toBe(false);
    expect(repeated.fromCache).toBe(true);
    expect(repeated.result).toBe(first.result);
    expect(resolveTileCalls).toBeGreaterThan(0);
    expect(cache.size()).toBe(1);
  });

  it('builds render-ready chunk data from shared splat and height inputs', () => {
    const { layerCatalog, kindCatalog } = createChunkBuildCatalogs();

    const built = buildTerrainSplatChunkRenderData({
      seed: 'chunk-render-data-seed',
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
      resolveHeight: ({ x, y }) => x * 0.1 + y * 0.2,
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
      normalSampleRing: 1,
    });

    expect(built.fromCache).toBe(false);
    expect(built.result.packedGrid.width).toBe(3);
    expect(built.grid.width).toBe(3);
    expect(built.grid.samples).toHaveLength(9);
    expect(built.heightField.width).toBe(3);
    expect(built.heightField.normalSampleWidth).toBe(5);
    expect(built.geometryPlan.vertexCount).toBe(9);
    expect(built.geometryPlan.triangleCount).toBe(8);
    expect(built.attributePlanSet.width).toBe(3);
    expect(built.attributePlanSet.height).toBe(3);
    expect(
      built.attributePlanSet.attributes.map((attribute) => attribute.name)
    ).toEqual(['terrainSplatLayerIndices', 'terrainSplatLayerWeights']);
  });

  it('reuses cached render-ready chunk data until the terrain state changes', () => {
    const { layerCatalog, kindCatalog } = createChunkBuildCatalogs();
    const cache = createTerrainSplatChunkBuildCache<{
      result: TerrainSplatWorkerBuildResult;
      grid: ReturnType<typeof buildTerrainSplatChunkRenderData>['grid'];
      heightField: ReturnType<
        typeof buildTerrainSplatChunkRenderData
      >['heightField'];
      geometryPlan: ReturnType<
        typeof buildTerrainSplatChunkRenderData
      >['geometryPlan'];
      attributePlanSet: ReturnType<
        typeof buildTerrainSplatChunkRenderData
      >['attributePlanSet'];
    }>(8);
    let resolveTileCalls = 0;
    let resolveHeightCalls = 0;

    const first = buildTerrainSplatChunkRenderData({
      seed: 'chunk-render-cache-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      layerCatalog,
      resolveTile: createTerrainSplatGridTileResolver(({ x }) => {
        resolveTileCalls += 1;
        return {
          kind: x >= 1 ? 'forest' : 'plains',
          signals: {
            moisture: 0.6,
          },
        };
      }),
      resolveHeight: ({ x, y }) => {
        resolveHeightCalls += 1;
        return x * 0.05 + y * 0.1;
      },
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
      terrainStateRevision: 'rev-a',
      cache,
    });
    const repeated = buildTerrainSplatChunkRenderData({
      seed: 'chunk-render-cache-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      layerCatalog,
      resolveTile: createTerrainSplatGridTileResolver(({ x }) => {
        resolveTileCalls += 1;
        return {
          kind: x >= 1 ? 'forest' : 'plains',
          signals: {
            moisture: 0.6,
          },
        };
      }),
      resolveHeight: ({ x, y }) => {
        resolveHeightCalls += 1;
        return x * 0.05 + y * 0.1;
      },
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
      terrainStateRevision: 'rev-a',
      cache,
    });
    const revised = buildTerrainSplatChunkRenderData({
      seed: 'chunk-render-cache-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      layerCatalog,
      resolveTile: createTerrainSplatGridTileResolver(({ x }) => {
        resolveTileCalls += 1;
        return {
          kind: x >= 1 ? 'forest' : 'plains',
          signals: {
            moisture: 0.6,
          },
        };
      }),
      resolveHeight: ({ x, y }) => {
        resolveHeightCalls += 1;
        return x * 0.05 + y * 0.1;
      },
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
      terrainStateRevision: 'rev-b',
      cache,
    });

    expect(first.fromCache).toBe(false);
    expect(repeated.fromCache).toBe(true);
    expect(repeated.result).toBe(first.result);
    expect(repeated.grid).toBe(first.grid);
    expect(repeated.heightField).toBe(first.heightField);
    expect(repeated.geometryPlan).toBe(first.geometryPlan);
    expect(repeated.attributePlanSet).toBe(first.attributePlanSet);
    expect(revised.fromCache).toBe(false);
    expect(revised.result).not.toBe(first.result);
    expect(cache.size()).toBe(2);
    expect(resolveTileCalls).toBeGreaterThan(0);
    expect(resolveHeightCalls).toBeGreaterThan(0);
  });

  it('keeps render geometry aligned with the packed grid step after coarse lod chunk builds', () => {
    const { layerCatalog, kindCatalog } = createChunkBuildCatalogs();

    const built = buildTerrainSplatChunkRenderData({
      seed: 'chunk-render-lod-seed',
      bounds: {
        minX: 0,
        maxX: 4,
        minY: 0,
        maxY: 4,
      },
      kindCatalog,
      layerCatalog,
      resolveTile: createTerrainSplatGridTileResolver(({ x, y }) => ({
        kind: x + y >= 3 ? 'forest' : 'plains',
        signals: {
          moisture: 0.62,
          elevation: (x + y) / 8,
        },
      })),
      resolveHeight: ({ x, y }) => x * 0.2 + y * 0.15,
      fallbackLayerId: 'grass-a',
      lodStepMultiplier: 2,
    });

    expect(built.result.packedGrid.step).toBe(2);
    expect(built.grid.step).toBe(2);
    expect(built.heightField.step).toBe(2);
    expect(built.geometryPlan.step).toBe(2);
    expect(built.heightField.width).toBe(3);
    expect(built.geometryPlan.width).toBe(3);
    expect(built.attributePlanSet.width).toBe(3);
  });
});

class FakeTerrainSplatWorker implements TerrainSplatWorkerLike {
  private readonly messageListeners = new Set<
    (event: TerrainSplatWorkerEvent) => void
  >();
  private readonly errorListeners = new Set<
    (event: TerrainSplatWorkerErrorEvent) => void
  >();

  postMessage(message: TerrainSplatWorkerMessage): void {
    queueMicrotask(() => {
      try {
        const response = buildTerrainSplatWorkerResponseMessage(
          message as ReturnType<
            typeof createTerrainSplatWorkerBuildRequestMessage
          >
        );
        this.messageListeners.forEach((listener) =>
          listener({ data: response })
        );
      } catch (error) {
        this.errorListeners.forEach((listener) =>
          listener({
            error,
            message: error instanceof Error ? error.message : String(error),
          })
        );
      }
    });
  }

  addEventListener(
    type: 'message' | 'error',
    listener:
      | ((event: TerrainSplatWorkerEvent) => void)
      | ((event: TerrainSplatWorkerErrorEvent) => void)
  ): void {
    if (type === 'message') {
      this.messageListeners.add(
        listener as (event: TerrainSplatWorkerEvent) => void
      );
      return;
    }
    this.errorListeners.add(
      listener as (event: TerrainSplatWorkerErrorEvent) => void
    );
  }

  removeEventListener(
    type: 'message' | 'error',
    listener:
      | ((event: TerrainSplatWorkerEvent) => void)
      | ((event: TerrainSplatWorkerErrorEvent) => void)
  ): void {
    if (type === 'message') {
      this.messageListeners.delete(
        listener as (event: TerrainSplatWorkerEvent) => void
      );
      return;
    }
    this.errorListeners.delete(
      listener as (event: TerrainSplatWorkerErrorEvent) => void
    );
  }
}

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
