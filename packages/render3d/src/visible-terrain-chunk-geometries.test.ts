import { describe, expect, it } from 'vitest';
import {
  createOverworldTerrainSplatDefinitions,
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
} from '@bworlds/terrain-splat-support';

import { buildVisibleTerrainChunkGeometries } from './visible-terrain-chunk-geometries.ts';

describe('visible terrain chunk geometries', () => {
  it('builds one buffer geometry per visible terrain chunk from shared render data', () => {
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
    const built = buildVisibleTerrainChunkGeometries(
      {
        BufferGeometry: FakeBufferGeometry,
        Float32BufferAttribute: FakeFloat32BufferAttribute,
        BufferAttribute: FakeBufferAttribute,
      },
      {
        seed: 'visible-terrain-chunk-geometries-seed',
        visibleChunks: [
          {
            key: '0:0',
            chunkX: 0,
            chunkY: 0,
            bounds: {
              minX: 0,
              minY: 0,
              maxX: 15,
              maxY: 15,
            },
            cells: [],
            floorKinds: ['plains', 'forest'],
            tilePluginOwnerLabels: ['tile-forest', 'tile-plains'],
          },
          {
            key: '1:0',
            chunkX: 1,
            chunkY: 0,
            bounds: {
              minX: 16,
              minY: 0,
              maxX: 31,
              maxY: 15,
            },
            cells: [],
            floorKinds: ['shore'],
            tilePluginOwnerLabels: ['tile-water'],
          },
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
        fallbackLayerId: 'grass-a',
        blendWidth: 1,
        normalSampleRing: 1,
      }
    );

    expect(built).toHaveLength(2);
    expect(built.map((entry) => entry.key)).toEqual(['0:0', '1:0']);
    expect(built[0]?.renderData.geometryPlan.width).toBe(16);
    expect(built[0]?.renderData.geometryPlan.height).toBe(16);
    expect(built[0]?.renderData.geometryPlan.vertexCount).toBe(256);
    expect(built[0]?.renderData.geometryPlan.triangleCount).toBe(450);
    expect(built[0]?.renderData.attributePlanSet.attributes).toHaveLength(2);
    expect(built[0]?.geometry).toBeInstanceOf(FakeBufferGeometry);
    expect(
      Array.from(
        (built[0]?.geometry as unknown as FakeBufferGeometry).attributes.keys()
      )
    ).toEqual([
      'position',
      'normal',
      'uv',
      'terrainSplatLayerIndices',
      'terrainSplatLayerWeights',
    ]);
    expect(
      (built[1]?.geometry as unknown as FakeBufferGeometry).attributes.get(
        'terrainSplatLayerWeights'
      )
    ).toEqual(
      expect.objectContaining({
        itemSize: 4,
        normalized: true,
      })
    );
  });

  it('rejects visible chunks whose bounds do not match the worldgen chunk contract', () => {
    const { kindCatalog, layerCatalog } = createTestCatalogs();

    expect(() =>
      buildVisibleTerrainChunkGeometries(
        {
          BufferGeometry: class FakeBufferGeometry {
            computeVertexNormals() {}

            setAttribute() {
              return this;
            }

            setIndex() {
              return this;
            }
          },
          Float32BufferAttribute: class FakeFloat32BufferAttribute {
            constructor(
              public values: ArrayLike<number> | number[],
              public itemSize: number
            ) {
              void values;
              void itemSize;
            }
          },
          BufferAttribute: class FakeBufferAttribute {
            constructor(
              public values: ArrayLike<number> | number[],
              public itemSize: number,
              public normalized = false
            ) {
              void values;
              void itemSize;
              void normalized;
            }
          },
        },
        {
          seed: 'visible-terrain-chunk-geometry-invalid-bounds',
          visibleChunks: [
            {
              key: '0:0',
              chunkX: 0,
              chunkY: 0,
              bounds: {
                minX: 1,
                minY: 0,
                maxX: 16,
                maxY: 15,
              },
              cells: [],
              floorKinds: ['plains'],
              tilePluginOwnerLabels: ['tile-plains'],
            },
          ],
          kindCatalog,
          layerCatalog,
          resolveTile() {
            return { kind: 'plains' };
          },
          resolveHeight() {
            return 0;
          },
          fallbackLayerId: 'grass-a',
        }
      )
    ).toThrow(
      'Visible terrain chunk 0:0 bounds 1:0..16:15 must match authoritative worldgen bounds 0:0..15:15.'
    );
  });
});

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
