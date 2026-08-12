import { describe, expect, it } from 'vitest';
import {
  createOverworldTerrainSplatDefinitions,
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
} from '@bworlds/terrain-splat-support';
import { createTerrainSplatChunkBuildCache } from '../../terrain-splat-support/src/chunk-cache.ts';

import {
  buildVisibleTerrainChunkRenderables,
  createVisibleTerrainChunkRenderableCache,
} from './visible-terrain-chunk-renderables.ts';

describe('visible terrain chunk renderables', () => {
  it('builds renderables that pair chunk geometry with shared material buckets', () => {
    class FakeBufferAttribute {
      constructor(
        public values: ArrayLike<number> | number[],
        public itemSize: number,
        public normalized = false
      ) {}
    }

    class FakeFloat32BufferAttribute extends FakeBufferAttribute {}

    class FakeBufferGeometry {
      attributes = new Map<string, FakeBufferAttribute>();
      index: unknown = null;

      computeVertexNormals() {}

      setAttribute(name: string, attribute: unknown) {
        this.attributes.set(name, attribute as FakeBufferAttribute);
        return this;
      }

      setIndex(index: unknown) {
        this.index = index;
        return this;
      }
    }

    const { kindCatalog, layerCatalog } = createTestCatalogs();
    const result = buildVisibleTerrainChunkRenderables(
      {
        BufferGeometry: FakeBufferGeometry,
        Float32BufferAttribute: FakeFloat32BufferAttribute,
        BufferAttribute: FakeBufferAttribute,
      },
      {
        seed: 'visible-terrain-chunk-renderables-seed',
        visibleChunks: [
          createVisibleChunk('0:0', 0, 0),
          createVisibleChunk('1:0', 1, 0),
        ],
        kindCatalog,
        layerCatalog,
        resolveTile({ x, y }) {
          return {
            kind: x >= 16 ? 'shore' : x + y >= 8 ? 'forest' : 'plains',
            signals: {
              moisture: x >= 16 ? 0.85 : 0.58,
              riverSignal: x >= 16 ? 0.7 : 0.1,
              season: 'summer',
              temperature: 0.68,
            },
          };
        },
        resolveHeight({ x, y }) {
          return x * 0.02 + y * 0.04;
        },
        resolveTexture: createTextureResolver(),
        supportsTextureArrays: true,
        fallbackLayerId: 'grass-a',
        blendWidth: 1,
        normalSampleRing: 1,
      }
    );

    expect(result.renderables).toHaveLength(2);
    expect(result.renderables[0]?.materialBucketKey).toBe(
      result.renderables[1]?.materialBucketKey
    );
    expect(result.renderables[0]?.materialBucketChunkIds).toEqual([
      '0:0',
      '1:0',
    ]);
    expect(result.materialPlans.materialReuseSummary.uniqueMaterialCount).toBe(
      1
    );
    expect(result.materialBuckets).toEqual([
      expect.objectContaining({
        chunkIds: ['0:0', '1:0'],
        bindingMode: 'texture-array',
      }),
    ]);
  });

  it('reuses unchanged renderables from cache and invalidates them when terrain state changes', () => {
    class FakeBufferAttribute {
      constructor(
        public values: ArrayLike<number> | number[],
        public itemSize: number,
        public normalized = false
      ) {}
    }

    class FakeFloat32BufferAttribute extends FakeBufferAttribute {}

    class FakeBufferGeometry {
      attributes = new Map<string, FakeBufferAttribute>();
      index: unknown = null;

      computeVertexNormals() {}

      setAttribute(name: string, attribute: unknown) {
        this.attributes.set(name, attribute as FakeBufferAttribute);
        return this;
      }

      setIndex(index: unknown) {
        this.index = index;
        return this;
      }
    }

    const { kindCatalog, layerCatalog } = createTestCatalogs();
    const renderDataCache = createTerrainSplatChunkBuildCache<{
      result: ReturnType<
        typeof buildVisibleTerrainChunkRenderables
      >['materialPlans']['entries'][number]['bindingPlan'] extends never
        ? never
        : never;
      grid: never;
      heightField: never;
      geometryPlan: never;
      attributePlanSet: never;
    }>(8);
    const typedRenderDataCache = createTerrainSplatChunkBuildCache<{
      result: import('@bworlds/terrain-splat-support').TerrainSplatChunkRenderDataResult['result'];
      grid: import('@bworlds/terrain-splat-support').TerrainSplatChunkRenderDataResult['grid'];
      heightField: import('@bworlds/terrain-splat-support').TerrainSplatChunkRenderDataResult['heightField'];
      geometryPlan: import('@bworlds/terrain-splat-support').TerrainSplatChunkRenderDataResult['geometryPlan'];
      attributePlanSet: import('@bworlds/terrain-splat-support').TerrainSplatChunkRenderDataResult['attributePlanSet'];
    }>(8);
    void renderDataCache;
    const renderableCache = createVisibleTerrainChunkRenderableCache(8);
    const host = {
      BufferGeometry: FakeBufferGeometry,
      Float32BufferAttribute: FakeFloat32BufferAttribute,
      BufferAttribute: FakeBufferAttribute,
    };
    const build = (terrainStateRevision: string) =>
      buildVisibleTerrainChunkRenderables(host, {
        seed: 'visible-terrain-chunk-renderables-cache-seed',
        visibleChunks: [createVisibleChunk('0:0', 0, 0)],
        kindCatalog,
        layerCatalog,
        resolveTile({ x, y }) {
          return {
            kind: x + y >= 8 ? 'forest' : 'plains',
            signals: {
              moisture: 0.58,
              season: 'summer',
              temperature: 0.68,
            },
          };
        },
        resolveHeight({ x, y }) {
          return x * 0.02 + y * 0.04;
        },
        resolveTexture: createTextureResolver(),
        supportsTextureArrays: true,
        fallbackLayerId: 'grass-a',
        blendWidth: 1,
        normalSampleRing: 1,
        terrainStateRevision,
        renderDataCache: typedRenderDataCache,
        renderableCache,
      });

    const first = build('rev-a');
    const repeated = build('rev-a');
    const revised = build('rev-b');

    expect(repeated.renderables[0]).toBe(first.renderables[0]);
    expect(revised.renderables[0]).not.toBe(first.renderables[0]);
    expect(renderableCache.size()).toBe(2);
  });
});

function createVisibleChunk(key: string, chunkX: number, chunkY: number) {
  return {
    key,
    chunkX,
    chunkY,
    bounds: {
      minX: chunkX * 16,
      minY: chunkY * 16,
      maxX: chunkX * 16 + 15,
      maxY: chunkY * 16 + 15,
    },
    cells: [],
    floorKinds: ['plains'],
    tilePluginOwnerLabels: ['tile-plains'],
  };
}

function createTestCatalogs() {
  const layerCatalog = createTerrainMaterialLayerCatalog([
    {
      id: 'grass-a',
      baseColorTextureId: 'grass-a-base',
      normalTextureId: 'grass-a-normal',
      roughnessTextureId: 'grass-a-roughness',
      textureScale: 4,
      defaultTint: '#6aa84f',
      defaultRoughness: 0.9,
    },
    {
      id: 'leaf-litter',
      baseColorTextureId: 'leaf-litter-base',
      normalTextureId: 'leaf-litter-normal',
      roughnessTextureId: 'leaf-litter-roughness',
      textureScale: 4,
      defaultTint: '#7d5a3c',
      defaultRoughness: 0.95,
    },
    {
      id: 'sand-a',
      baseColorTextureId: 'sand-a-base',
      normalTextureId: 'sand-a-normal',
      roughnessTextureId: 'sand-a-roughness',
      textureScale: 4,
      defaultTint: '#d0b37a',
      defaultRoughness: 0.92,
    },
    {
      id: 'dirt-road',
      baseColorTextureId: 'dirt-road-base',
      normalTextureId: 'dirt-road-normal',
      roughnessTextureId: 'dirt-road-roughness',
      textureScale: 4,
      defaultTint: '#8a5a19',
      defaultRoughness: 0.94,
    },
    {
      id: 'mud-a',
      baseColorTextureId: 'mud-a-base',
      normalTextureId: 'mud-a-normal',
      roughnessTextureId: 'mud-a-roughness',
      textureScale: 4,
      defaultTint: '#5a432c',
      defaultRoughness: 0.98,
    },
    {
      id: 'snow-a',
      baseColorTextureId: 'snow-a-base',
      normalTextureId: 'snow-a-normal',
      roughnessTextureId: 'snow-a-roughness',
      textureScale: 4,
      defaultTint: '#f5f7fa',
      defaultRoughness: 0.88,
    },
  ]);
  const kindCatalog = createTerrainKindSplatCatalog(
    createOverworldTerrainSplatDefinitions({
      grassLayerIds: ['grass-a'],
      soilLayerId: 'grass-a',
      leafLayerId: 'leaf-litter',
      rockLayerId: 'grass-a',
      sandLayerId: 'sand-a',
      dirtLayerId: 'grass-a',
      gravelLayerId: 'sand-a',
      mudLayerId: 'mud-a',
      snowLayerId: 'snow-a',
      dirtRoadLayerId: 'dirt-road',
      gravelRoadLayerId: 'sand-a',
    }),
    layerCatalog
  );
  return { kindCatalog, layerCatalog };
}

function createTextureResolver() {
  const descriptors = {
    'grass-a-base': createTextureSource('grass-a-base'),
    'grass-a-normal': createTextureSource('grass-a-normal'),
    'grass-a-roughness': createTextureSource('grass-a-roughness'),
    'leaf-litter-base': createTextureSource('leaf-litter-base'),
    'leaf-litter-normal': createTextureSource('leaf-litter-normal'),
    'leaf-litter-roughness': createTextureSource('leaf-litter-roughness'),
    'sand-a-base': createTextureSource('sand-a-base'),
    'sand-a-normal': createTextureSource('sand-a-normal'),
    'sand-a-roughness': createTextureSource('sand-a-roughness'),
    'dirt-road-base': createTextureSource('dirt-road-base'),
    'dirt-road-normal': createTextureSource('dirt-road-normal'),
    'dirt-road-roughness': createTextureSource('dirt-road-roughness'),
    'mud-a-base': createTextureSource('mud-a-base'),
    'mud-a-normal': createTextureSource('mud-a-normal'),
    'mud-a-roughness': createTextureSource('mud-a-roughness'),
    'snow-a-base': createTextureSource('snow-a-base'),
    'snow-a-normal': createTextureSource('snow-a-normal'),
    'snow-a-roughness': createTextureSource('snow-a-roughness'),
  } as const;

  return (textureId: string) =>
    descriptors[textureId as keyof typeof descriptors];
}

function createTextureSource(id: string) {
  return {
    id,
    width: 256,
    height: 256,
    format: 'rgba8',
    bytesPerPixel: 4,
  };
}
