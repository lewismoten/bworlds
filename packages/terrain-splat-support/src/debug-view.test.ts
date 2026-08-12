import { describe, expect, it } from 'vitest';
import {
  createOverworldTerrainSplatDefinitions,
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
} from './index.ts';
import { createTerrainSplatDebugView } from './debug-view.ts';
import {
  createTerrainSplatGridTileResolver,
  createTerrainSplatSampleGrid,
} from './sample-grid.ts';

describe('terrain splat debug view', () => {
  it('shows dominant terrain layers and active layer ids per cell', () => {
    const { layerCatalog, kindCatalog } = createDebugCatalogs();
    const grid = createTerrainSplatSampleGrid({
      seed: 'debug-view-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      resolveTile: createTerrainSplatGridTileResolver(({ x, y }) => ({
        kind: x >= 1 ? 'forest' : y >= 1 ? 'road' : 'plains',
        signals: {
          moisture: 0.6,
          roadSignal: y >= 1 ? 0.82 : 0,
          season: 'summer',
          temperature: 0.68,
        },
      })),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });

    const debugView = createTerrainSplatDebugView(grid, {
      mode: 'dominant-layer',
      catalog: layerCatalog,
    });

    expect(debugView.cells).toHaveLength(9);
    expect(debugView.totalActiveLayerCount).toBeGreaterThan(1);
    expect(debugView.packedMemoryUsageBytes).toBe(72);
    expect(debugView.cells.some((cell) => cell.activeLayerIds.length > 1)).toBe(
      true
    );
    expect(
      debugView.cells.some((cell) => cell.dominantLayerId === 'dirt-road')
    ).toBe(true);
  });

  it('supports one-layer weight views and blend-color debug output', () => {
    const { kindCatalog } = createDebugCatalogs();
    const grid = createTerrainSplatSampleGrid({
      seed: 'debug-weight-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      resolveTile: createTerrainSplatGridTileResolver(({ x }) => ({
        kind: x >= 1 ? 'forest' : 'plains',
        signals: {
          moisture: x >= 1 ? 0.9 : 0.58,
          season: 'summer',
          temperature: 0.7,
        },
      })),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });

    const layerWeightView = createTerrainSplatDebugView(grid, {
      mode: 'layer-weight',
      targetLayerId: 'leaf',
    });
    const blendColorView = createTerrainSplatDebugView(grid, {
      mode: 'blend-color',
    });

    expect(layerWeightView.targetLayerId).toBe('leaf');
    expect(layerWeightView.cells.some((cell) => cell.value > 0)).toBe(true);
    expect(
      blendColorView.cells.every((cell) => /^#[0-9a-f]{6}$/u.test(cell.colorHex))
    ).toBe(true);
  });

  it('shows texture-array indices and active-layer-count debug values', () => {
    const { layerCatalog, kindCatalog } = createDebugCatalogs();
    const grid = createTerrainSplatSampleGrid({
      seed: 'debug-index-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      resolveTile: createTerrainSplatGridTileResolver(({ x, y }) => ({
        kind: x >= 1 ? 'shore' : y >= 1 ? 'road' : 'plains',
        signals: {
          biome: x >= 1 ? 'shore' : 'plains',
          moisture: 0.58,
          roadSignal: y >= 1 ? 0.82 : 0,
          season: 'summer',
          temperature: 0.68,
        },
      })),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });

    const layerIndexView = createTerrainSplatDebugView(grid, {
      mode: 'layer-index',
      catalog: layerCatalog,
    });
    const activeLayerCountView = createTerrainSplatDebugView(grid, {
      mode: 'active-layer-count',
    });

    expect(
      layerIndexView.cells.some((cell) => cell.layerIndices.length > 0)
    ).toBe(true);
    expect(activeLayerCountView.cells.some((cell) => cell.value > 1)).toBe(
      true
    );
  });
});

function createDebugCatalogs() {
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
