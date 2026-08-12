import { describe, expect, it } from 'vitest';
import {
  createOverworldTerrainSplatDefinitions,
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
} from './index.ts';
import { createTerrainSplatWorkerBuildRequest } from './worker-contract.ts';
import {
  buildTerrainSplatWorkerResponseMessage,
  createTerrainSplatWorkerBuildRequestMessage,
  listTerrainSplatWorkerMessageTransferables,
  runTerrainSplatWorkerBuild,
  type TerrainSplatWorkerErrorEvent,
  type TerrainSplatWorkerEvent,
  type TerrainSplatWorkerLike,
  type TerrainSplatWorkerMessage,
} from './worker-runtime.ts';
import { createTerrainSplatGridTileResolver } from './sample-grid.ts';

describe('terrain splat worker runtime', () => {
  it('serializes catalogs into one worker build request message', () => {
    const { kindCatalog, layerCatalog } = createWorkerRuntimeCatalogs();
    const request = createTerrainSplatWorkerBuildRequest({
      seed: 'worker-runtime-message-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      resolveTile: createTerrainSplatGridTileResolver(() => ({
        kind: 'plains',
      })),
      fallbackLayerId: 'grass-a',
    });

    const message = createTerrainSplatWorkerBuildRequestMessage({
      request,
      kindCatalog,
      layerCatalog,
      jobId: 'job-1',
    });

    expect(message).toMatchObject({
      type: 'terrain-splat-build-request',
      jobId: 'job-1',
    });
    expect(message.kindCatalogEntries.length).toBeGreaterThan(0);
    expect(message.layerCatalogEntries.length).toBeGreaterThan(0);
  });

  it('runs one worker build and resolves the packed result from the worker reply', async () => {
    const { kindCatalog, layerCatalog } = createWorkerRuntimeCatalogs();
    const worker = new FakeTerrainSplatWorker();
    const request = createTerrainSplatWorkerBuildRequest({
      seed: 'worker-runtime-run-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      resolveTile: createTerrainSplatGridTileResolver(({ x, y }) => ({
        kind: x >= 1 ? 'road' : y >= 1 ? 'forest' : 'plains',
        signals: {
          roadSignal: x >= 1 ? 0.82 : 0,
          moisture: 0.6,
          season: 'summer',
          temperature: 0.68,
        },
      })),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });

    const result = await runTerrainSplatWorkerBuild({
      worker,
      message: createTerrainSplatWorkerBuildRequestMessage({
        request,
        kindCatalog,
        layerCatalog,
        jobId: 'job-2',
      }),
    });

    expect(result.packedGrid.width).toBe(3);
    expect(result.packedGrid.height).toBe(3);
    expect(result.metrics).toBeNull();
  });

  it('surfaces worker-side build errors as rejected promises', async () => {
    const worker = new FakeTerrainSplatWorker({
      handleMessage: (message) => {
        void message;
        return {
          type: 'terrain-splat-build-error',
          jobId: 'job-3',
          error: 'synthetic worker failure',
        };
      },
    });

    await expect(
      runTerrainSplatWorkerBuild({
        worker,
        message: {
          type: 'terrain-splat-build-request',
          jobId: 'job-3',
          request: {
            seed: 'worker-runtime-error-seed',
            bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
            tiles: [],
          },
          kindCatalogEntries: [],
          layerCatalogEntries: [],
        },
      })
    ).rejects.toThrow('synthetic worker failure');
  });

  it('lists packed array buffers as worker message transferables', () => {
    const { kindCatalog, layerCatalog } = createWorkerRuntimeCatalogs();
    const response = buildTerrainSplatWorkerResponseMessage(
      createTerrainSplatWorkerBuildRequestMessage({
        request: createTerrainSplatWorkerBuildRequest({
          seed: 'worker-runtime-transferable-seed',
          bounds: {
            minX: 0,
            maxX: 2,
            minY: 0,
            maxY: 2,
          },
          resolveTile: createTerrainSplatGridTileResolver(() => ({
            kind: 'plains',
          })),
          fallbackLayerId: 'grass-a',
        }),
        kindCatalog,
        layerCatalog,
        jobId: 'job-4',
      })
    );

    expect(response.type).toBe('terrain-splat-build-result');
    const transferables = listTerrainSplatWorkerMessageTransferables(response);
    expect(transferables).toHaveLength(2);
  });
});

type FakeTerrainSplatWorkerOptions = {
  handleMessage?: (
    message: TerrainSplatWorkerMessage
  ) => TerrainSplatWorkerMessage;
};

class FakeTerrainSplatWorker implements TerrainSplatWorkerLike {
  private readonly messageListeners = new Set<
    (event: TerrainSplatWorkerEvent) => void
  >();
  private readonly errorListeners = new Set<
    (event: TerrainSplatWorkerErrorEvent) => void
  >();

  constructor(private readonly options: FakeTerrainSplatWorkerOptions = {}) {}

  postMessage(message: TerrainSplatWorkerMessage): void {
    queueMicrotask(() => {
      try {
        const response =
          this.options.handleMessage?.(message) ??
          buildTerrainSplatWorkerResponseMessage(
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

function createWorkerRuntimeCatalogs() {
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
