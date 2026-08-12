import { describe, expect, it } from 'vitest';
import {
  createOverworldTerrainSplatDefinitions,
  createTerrainMaterialLayerCatalog,
  createTerrainKindSplatCatalog,
} from './index.ts';
import {
  createTerrainSplatGridTileResolver,
  createTerrainSplatSampleGrid,
  getTerrainSplatGridSample,
  packTerrainSplatSampleGrid,
  unpackTerrainSplatSampleGrid,
} from './sample-grid.ts';

describe('terrain splat sample grid', () => {
  it('creates deterministic chunk-like splat sample grids', () => {
    const { layerCatalog, kindCatalog } = createGridCatalogs();
    const resolveTile = createTerrainSplatGridTileResolver(({ x, y }) => ({
      kind: x + y > 1 ? 'forest' : 'plains',
      signals: {
        moisture: normalizeSignal(x + y, 0.55),
        elevation: normalizeSignal(x - y, 0.4),
      },
    }));

    const first = createTerrainSplatSampleGrid({
      seed: 'grid-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
    });
    const second = createTerrainSplatSampleGrid({
      seed: 'grid-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
    });

    expect(first).toEqual(second);
    expect(first.samples).toHaveLength(9);
    expect(layerCatalog.entries).toHaveLength(8);
  });

  it('keeps adjacent chunk borders identical when the world inputs match', () => {
    const { kindCatalog } = createGridCatalogs();
    const resolveTile = createTerrainSplatGridTileResolver(({ x, y }) => ({
      kind: x >= 2 ? 'forest' : 'plains',
      signals: {
        moisture: normalizeSignal(x, 0.45),
        elevation: normalizeSignal(y, 0.35),
        roadSignal: x === 2 ? 0.3 : 0,
      },
    }));

    const leftGrid = createTerrainSplatSampleGrid({
      seed: 'border-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 3,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
    });
    const rightGrid = createTerrainSplatSampleGrid({
      seed: 'border-seed',
      bounds: {
        minX: 2,
        maxX: 4,
        minY: 0,
        maxY: 3,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
    });

    for (let row = 0; row < leftGrid.height; row += 1) {
      expect(
        getTerrainSplatGridSample(leftGrid, leftGrid.width - 1, row)
      ).toEqual(getTerrainSplatGridSample(rightGrid, 0, row));
    }
  });

  it('packs and unpacks sample grids into transferable typed arrays', () => {
    const { layerCatalog, kindCatalog } = createGridCatalogs();
    const resolveTile = createTerrainSplatGridTileResolver(({ x, y }) => ({
      kind: x === 1 ? 'road' : y >= 1 ? 'forest' : 'plains',
      signals: {
        moisture: normalizeSignal(y, 0.6),
        elevation: normalizeSignal(x - y, 0.4),
        roadSignal: x === 1 ? 0.8 : 0,
      },
    }));

    const grid = createTerrainSplatSampleGrid({
      seed: 'packed-grid-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
    });
    const packedGrid = packTerrainSplatSampleGrid(grid, layerCatalog, {
      fallbackLayerId: 'grass-a',
    });
    const unpackedGrid = unpackTerrainSplatSampleGrid(
      packedGrid,
      layerCatalog.entries
    );

    expect(packedGrid.layerIndices).toHaveLength(grid.samples.length * 4);
    expect(packedGrid.weights).toHaveLength(grid.samples.length * 4);
    expect(unpackedGrid.samples).toHaveLength(grid.samples.length);

    unpackedGrid.samples.forEach((sample, index) => {
      expect(sample.entries.map((entry) => entry.layerId)).toEqual(
        grid.samples[index].entries.map((entry) => entry.layerId)
      );
      expect(
        sample.entries.reduce((sum, entry) => sum + entry.weight, 0)
      ).toBeCloseTo(1, 6);
      sample.entries.forEach((entry, entryIndex) => {
        expect(entry.weight).toBeCloseTo(
          grid.samples[index].entries[entryIndex]?.weight ?? 0,
          2
        );
      });
    });
  });

  it('rejects chunk bounds that do not divide evenly by the sample step', () => {
    const { kindCatalog } = createGridCatalogs();

    expect(() =>
      createTerrainSplatSampleGrid({
        seed: 'grid-seed',
        bounds: {
          minX: 0,
          maxX: 3,
          minY: 0,
          maxY: 2,
          step: 2,
        },
        kindCatalog,
        resolveTile: () => ({ kind: 'plains' }),
        fallbackLayerId: 'grass-a',
      })
    ).toThrowError(
      'Terrain splat grid x-axis span 3 must divide evenly by step 2.'
    );
  });
});

function createGridCatalogs() {
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
      defaultTint: '#7fa650',
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

function normalizeSignal(value: number, bias = 0.5): number {
  return Math.max(0, Math.min(1, bias + value * 0.1));
}
