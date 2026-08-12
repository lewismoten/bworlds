import { describe, expect, it } from 'vitest';
import {
  createOverworldTerrainSplatDefinitions,
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
} from './index.ts';
import { compareTerrainSplatChunkPerformance } from './performance-estimate.ts';
import {
  createTerrainSplatGridTileResolver,
  createTerrainSplatSampleGrid,
} from './sample-grid.ts';

describe('terrain splat performance estimate', () => {
  it('shows that one shared splat path reduces terrain material count', () => {
    const { grid, layerCatalog } = createComparisonFixture();

    const comparison = compareTerrainSplatChunkPerformance(grid, {
      catalog: layerCatalog,
    });

    expect(comparison.legacy.materialCount).toBeGreaterThan(
      comparison.splat.materialCount
    );
    expect(comparison.reductions.materialCount).toBeGreaterThan(0);
    expect(comparison.reductionRatios.materialCount).toBeGreaterThan(0);
  });

  it('shows that one shared splat path reduces terrain draw calls', () => {
    const { grid, layerCatalog } = createComparisonFixture();

    const comparison = compareTerrainSplatChunkPerformance(grid, {
      catalog: layerCatalog,
    });

    expect(comparison.legacy.drawCallCount).toBeGreaterThan(
      comparison.splat.drawCallCount
    );
    expect(comparison.reductions.drawCallCount).toBeGreaterThan(0);
    expect(comparison.reductionRatios.drawCallCount).toBeGreaterThan(0.8);
  });
});

function createComparisonFixture() {
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
  const grid = createTerrainSplatSampleGrid({
    seed: 'terrain-splat-performance-seed',
    bounds: {
      minX: 0,
      maxX: 3,
      minY: 0,
      maxY: 3,
    },
    kindCatalog,
    resolveTile: createTerrainSplatGridTileResolver(({ x, y }) => ({
      kind:
        x >= 2 && y <= 1
          ? 'forest'
          : y >= 2
            ? 'road'
            : x === 1
              ? 'shore'
              : 'plains',
      signals: {
        moisture: x === 1 ? 0.72 : 0.45,
        roadSignal: y >= 2 ? 0.85 : 0,
        season: 'summer',
        slope: x >= 2 ? 0.42 : 0.08,
        temperature: 0.68,
      },
    })),
    fallbackLayerId: 'grass-a',
    blendWidth: 1,
  });

  return {
    grid,
    layerCatalog,
  };
}
