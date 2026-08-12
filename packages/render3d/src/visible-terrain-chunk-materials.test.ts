import { describe, expect, it } from 'vitest';
import { createTerrainMaterialLayerCatalog } from '@bworlds/terrain-splat-support';

import {
  buildVisibleTerrainChunkMaterialPlans,
  collectVisibleTerrainChunkMaterialBuckets,
} from './visible-terrain-chunk-materials.ts';

describe('visible terrain chunk materials', () => {
  it('reuses one shared terrain chunk material plan for compatible visible chunks', () => {
    const result = buildVisibleTerrainChunkMaterialPlans({
      visibleChunks: [
        createVisibleChunk('0:0', 0, 0, [
          [
            { layerId: 'grass', weight: 0.8 },
            { layerId: 'soil', weight: 0.2 },
          ],
          [{ layerId: 'grass', weight: 1 }],
        ]),
        createVisibleChunk('1:0', 1, 0, [
          [
            { layerId: 'soil', weight: 0.7 },
            { layerId: 'grass', weight: 0.3 },
          ],
          [{ layerId: 'grass', weight: 1 }],
        ]),
      ],
      layerCatalog: createCatalog(),
      resolveTexture: createTextureResolver(),
      supportsTextureArrays: true,
    });

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0]?.materialPlan.materialKey).toBe(
      result.entries[1]?.materialPlan.materialKey
    );
    expect(result.entries[0]?.bindingPlan.sharedBindingKey).toBe(
      result.entries[1]?.bindingPlan.sharedBindingKey
    );
    expect(result.materialReuseSummary.uniqueMaterialCount).toBe(1);
    expect(result.bindingReuseSummary.uniqueBindingCount).toBe(1);
    expect(result.buckets).toEqual([
      expect.objectContaining({
        bindingMode: 'texture-array',
        chunkIds: ['0:0', '1:0'],
        chunkKeys: ['0:0', '1:0'],
        activeLayerIds: ['grass', 'soil'],
      }),
    ]);
  });

  it('separates incompatible chunks into distinct material buckets and preserves fallback warnings', () => {
    const result = buildVisibleTerrainChunkMaterialPlans({
      visibleChunks: [
        createVisibleChunk('0:0', 0, 0, [[{ layerId: 'grass', weight: 1 }]]),
        createVisibleChunk('9:9', 9, 9, [[{ layerId: 'rock', weight: 1 }]]),
      ],
      layerCatalog: createCatalog(),
      resolveTexture: createTextureResolver(),
      supportsTextureArrays: false,
    });

    expect(result.materialReuseSummary.uniqueMaterialCount).toBe(2);
    expect(result.bindingReuseSummary.uniqueBindingCount).toBe(2);
    expect(result.materialReuseSummary.warnings).toContainEqual({
      code: 'texture-array-fallback',
      message:
        'Terrain texture binding plan is using per-layer texture fallback because texture arrays are unavailable.',
    });
    expect(result.materialReuseSummary.warnings).toContainEqual(
      expect.objectContaining({
        code: 'unique-splat-material',
      })
    );
    expect(
      collectVisibleTerrainChunkMaterialBuckets(result.entries).map(
        (bucket) => bucket.chunkIds
      )
    ).toEqual([['0:0'], ['9:9']]);
  });
});

function createVisibleChunk(
  key: string,
  chunkX: number,
  chunkY: number,
  samples: Array<Array<{ layerId: string; weight: number }>>
) {
  return {
    key,
    chunkX,
    chunkY,
    renderData: {
      grid: {
        minX: chunkX * 16,
        maxX: chunkX * 16 + 15,
        minY: chunkY * 16,
        maxY: chunkY * 16 + 15,
        step: 1,
        width: samples.length,
        height: 1,
        samples: samples.map((entries) => ({ entries })),
      },
    },
  };
}

function createCatalog() {
  return createTerrainMaterialLayerCatalog([
    {
      id: 'grass',
      baseColorTextureId: 'grass/base',
      normalTextureId: 'grass/normal',
      roughnessTextureId: 'grass/roughness',
      textureScale: 3,
      defaultTint: '#88aa55',
      defaultRoughness: 0.9,
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
      id: 'rock',
      baseColorTextureId: 'rock/base',
      normalTextureId: 'rock/normal',
      roughnessTextureId: 'rock/roughness',
      textureScale: 4,
      defaultTint: '#7f7f7f',
      defaultRoughness: 0.7,
    },
  ]);
}

function createTextureResolver() {
  const descriptors = {
    'grass/base': createTextureSource('grass/base'),
    'grass/normal': createTextureSource('grass/normal'),
    'grass/roughness': createTextureSource('grass/roughness'),
    'soil/base': createTextureSource('soil/base'),
    'soil/normal': createTextureSource('soil/normal'),
    'soil/roughness': createTextureSource('soil/roughness'),
    'rock/base': createTextureSource('rock/base'),
    'rock/normal': createTextureSource('rock/normal'),
    'rock/roughness': createTextureSource('rock/roughness'),
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
