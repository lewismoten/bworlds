import { describe, expect, it } from 'vitest';
import {
  createOverworldTerrainSplatDefinitions,
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
} from './index.ts';
import { createTerrainSplatViewerDebugModel } from './debug-viewer.ts';
import {
  createTerrainSplatGridTileResolver,
  createTerrainSplatSampleGrid,
} from './sample-grid.ts';

describe('terrain splat debug viewer', () => {
  it('exposes stable viewer mode options and selected debug payloads', () => {
    const { layerCatalog, kindCatalog } = createDebugCatalogs();
    const grid = createDebugGrid(kindCatalog);

    const model = createTerrainSplatViewerDebugModel(grid, {
      mode: 'dominant-layer',
      catalog: layerCatalog,
    });

    expect(model.selectedMode).toBe('dominant-layer');
    expect(model.modeOptions.map((option) => option.id)).toEqual([
      'dominant-layer',
      'active-layer-count',
      'layer-weight',
      'blend-color',
      'layer-index',
      'base-color-map',
      'normal-map',
      'roughness-map',
    ]);
    expect(model.view.mode).toBe('dominant-layer');
    expect(model.availableTargetLayerIds.length).toBeGreaterThan(1);
  });

  it('supports viewer layer-weight mode and resolves a valid target layer automatically', () => {
    const { kindCatalog } = createDebugCatalogs();
    const grid = createDebugGrid(kindCatalog);

    const model = createTerrainSplatViewerDebugModel(grid, {
      mode: 'layer-weight',
      targetLayerId: 'missing-layer',
    });

    expect(model.selectedMode).toBe('layer-weight');
    expect(model.selectedTargetLayerId).toBe(model.availableTargetLayerIds[0]);
    expect(model.view.targetLayerId).toBe(model.availableTargetLayerIds[0]);
    expect(model.view.cells.some((cell) => cell.value >= 0)).toBe(true);
  });

  it('falls back to catalog-free modes when viewer requests catalog-only output without a catalog', () => {
    const { kindCatalog } = createDebugCatalogs();
    const grid = createDebugGrid(kindCatalog);

    const model = createTerrainSplatViewerDebugModel(grid, {
      mode: 'base-color-map',
    });

    expect(model.selectedMode).toBe('dominant-layer');
    expect(model.modeOptions.every((option) => option.requiresCatalog === false)).toBe(
      true
    );
    expect(model.view.mode).toBe('dominant-layer');
  });
});

function createDebugGrid(kindCatalog: ReturnType<typeof createDebugCatalogs>['kindCatalog']) {
  return createTerrainSplatSampleGrid({
    seed: 'debug-viewer-seed',
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
}

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
