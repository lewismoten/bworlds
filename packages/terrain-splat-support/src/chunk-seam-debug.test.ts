import { describe, expect, it } from 'vitest';
import {
  analyzeTerrainSplatChunkSeam,
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
} from './index.ts';
import { createTerrainSplatSampleGrid } from './sample-grid.ts';

describe('terrain splat chunk seam debug', () => {
  it('reports no mismatches when adjacent east-west chunk borders resolve the same samples', () => {
    const left = createGridFromSamples({
      minX: 0,
      maxX: 2,
      minY: 0,
      maxY: 2,
      samples: [
        [{ layerId: 'grass-a', weight: 1 }],
        [{ layerId: 'grass-a', weight: 1 }],
        [
          { layerId: 'grass-a', weight: 0.75 },
          { layerId: 'soil', weight: 0.25 },
        ],
        [{ layerId: 'grass-a', weight: 1 }],
        [{ layerId: 'grass-a', weight: 1 }],
        [
          { layerId: 'grass-a', weight: 0.6 },
          { layerId: 'leaf', weight: 0.4 },
        ],
        [{ layerId: 'grass-a', weight: 1 }],
        [{ layerId: 'grass-a', weight: 1 }],
        [
          { layerId: 'grass-a', weight: 0.55 },
          { layerId: 'soil', weight: 0.15 },
          { layerId: 'leaf', weight: 0.3 },
        ],
      ],
    });
    const right = createGridFromSamples({
      minX: 2,
      maxX: 4,
      minY: 0,
      maxY: 2,
      samples: [
        [
          { layerId: 'grass-a', weight: 0.75 },
          { layerId: 'soil', weight: 0.25 },
        ],
        [{ layerId: 'grass-a', weight: 1 }],
        [{ layerId: 'grass-a', weight: 1 }],
        [
          { layerId: 'grass-a', weight: 0.6 },
          { layerId: 'leaf', weight: 0.4 },
        ],
        [{ layerId: 'grass-a', weight: 1 }],
        [{ layerId: 'grass-a', weight: 1 }],
        [
          { layerId: 'grass-a', weight: 0.55 },
          { layerId: 'soil', weight: 0.15 },
          { layerId: 'leaf', weight: 0.3 },
        ],
        [{ layerId: 'grass-a', weight: 1 }],
        [{ layerId: 'grass-a', weight: 1 }],
      ],
    });

    expect(
      analyzeTerrainSplatChunkSeam({
        primaryGrid: left,
        adjacentGrid: right,
        edge: 'east-west',
      })
    ).toEqual(
      expect.objectContaining({
        seamLength: 3,
        mismatchCount: 0,
        matchesExactly: true,
        mismatches: [],
      })
    );
  });

  it('reports layer-weight mismatches on adjacent south-north borders', () => {
    const primary = createGridFromSamples({
      minX: 0,
      maxX: 1,
      minY: 0,
      maxY: 1,
      samples: [
        [{ layerId: 'grass-a', weight: 1 }],
        [
          { layerId: 'grass-a', weight: 0.8 },
          { layerId: 'soil', weight: 0.2 },
        ],
        [
          { layerId: 'grass-a', weight: 0.7 },
          { layerId: 'soil', weight: 0.3 },
        ],
        [{ layerId: 'grass-a', weight: 1 }],
      ],
    });
    const adjacent = createGridFromSamples({
      minX: 0,
      maxX: 1,
      minY: 1,
      maxY: 2,
      samples: [
        [
          { layerId: 'grass-a', weight: 0.75 },
          { layerId: 'soil', weight: 0.25 },
        ],
        [{ layerId: 'grass-a', weight: 1 }],
        [{ layerId: 'grass-a', weight: 1 }],
        [{ layerId: 'grass-a', weight: 1 }],
      ],
    });

    expect(
      analyzeTerrainSplatChunkSeam({
        primaryGrid: primary,
        adjacentGrid: adjacent,
        edge: 'south-north',
      })
    ).toEqual(
      expect.objectContaining({
        seamLength: 2,
        mismatchCount: 2,
        matchesExactly: false,
        mismatches: [
          expect.objectContaining({
            index: 0,
            code: 'weight-mismatch',
            layerId: 'grass-a',
            primaryWeight: 0.7,
            adjacentWeight: 0.75,
          }),
          expect.objectContaining({
            index: 0,
            code: 'weight-mismatch',
            layerId: 'soil',
            primaryWeight: 0.3,
            adjacentWeight: 0.25,
          }),
        ],
      })
    );
  });

  it('rejects seam comparisons when adjacent grids do not share the same world border', () => {
    const { kindCatalog } = createSeamCatalogs();
    const left = createTerrainSplatSampleGrid({
      seed: 'chunk-seam-debug-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      resolveTile: () => ({
        kind: 'plains',
      }),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });
    const shifted = createTerrainSplatSampleGrid({
      seed: 'chunk-seam-debug-seed',
      bounds: {
        minX: 3,
        maxX: 5,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      resolveTile: () => ({
        kind: 'plains',
      }),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });

    expect(() =>
      analyzeTerrainSplatChunkSeam({
        primaryGrid: left,
        adjacentGrid: shifted,
        edge: 'east-west',
      })
    ).toThrow(
      'Terrain splat chunk seam debug east-west grids must touch on the same world border; received primary maxX 2 and adjacent minX 3.'
    );
  });
});

function createSeamCatalogs() {
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
  ]);

  return {
    kindCatalog: createTerrainKindSplatCatalog(
      [
        {
          kind: 'plains',
          baseLayerIds: ['grass-a'],
        },
        {
          kind: 'forest',
          baseLayerIds: ['grass-a'],
          blends: [
            {
              layerId: 'leaf',
              weight: 0.18,
            },
            {
              layerId: 'soil',
              weight: 0.22,
            },
          ],
        },
      ],
      layerCatalog
    ),
  };
}

function createGridFromSamples(params: {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  samples: Array<Array<{ layerId: string; weight: number }>>;
}) {
  const width = params.maxX - params.minX + 1;
  const height = params.maxY - params.minY + 1;
  return {
    minX: params.minX,
    maxX: params.maxX,
    minY: params.minY,
    maxY: params.maxY,
    step: 1,
    width,
    height,
    samples: params.samples.map((entries) => ({ entries })),
  };
}
