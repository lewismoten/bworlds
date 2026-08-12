import { describe, expect, it } from 'vitest';
import {
  createOverworldTerrainSplatDefinitions,
  createTerrainMaterialLayerCatalog,
  createTerrainKindSplatCatalog,
} from './index.ts';
import {
  createAdaptiveTerrainSplatSampleGrid,
  createTerrainSplatChunkPreview,
  createTerrainSplatGridTileResolver,
  createTerrainSplatSampleGridLod,
  createTerrainSplatSampleGrid,
  getTerrainSplatGridSample,
  packTerrainSplatSampleGrid,
  summarizeTerrainSplatSampleGridUsage,
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
    expect(layerCatalog.entries).toHaveLength(15);
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

  it('blends neighboring terrain kinds into deterministic boundary samples', () => {
    const { kindCatalog } = createGridCatalogs();
    const resolveTile = createTerrainSplatGridTileResolver(({ x }) => ({
      kind: x >= 2 ? 'forest' : 'plains',
      signals: {
        moisture: x >= 2 ? 0.95 : 0.55,
        temperature: 0.65,
        season: 'summer',
      },
    }));

    const unblendedGrid = createTerrainSplatSampleGrid({
      seed: 'blend-zone-seed',
      bounds: {
        minX: 0,
        maxX: 3,
        minY: 0,
        maxY: 3,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
    });
    const blendedGrid = createTerrainSplatSampleGrid({
      seed: 'blend-zone-seed',
      bounds: {
        minX: 0,
        maxX: 3,
        minY: 0,
        maxY: 3,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });

    expect(
      getTerrainSplatGridSample(unblendedGrid, 1, 1).entries.map(
        (entry) => entry.layerId
      )
    ).not.toEqual(expect.arrayContaining(['leaf']));
    expect(
      getTerrainSplatGridSample(blendedGrid, 1, 1).entries.map(
        (entry) => entry.layerId
      )
    ).toEqual(expect.arrayContaining(['leaf']));
    expect(
      getTerrainSplatGridSample(blendedGrid, 0, 1).entries.map(
        (entry) => entry.layerId
      )
    ).not.toEqual(expect.arrayContaining(['leaf']));
  });

  it('blends snow coverage gradually from neighboring cold terrain', () => {
    const { kindCatalog } = createGridCatalogs();
    const resolveTile = createTerrainSplatGridTileResolver(({ y }) => ({
      kind: y >= 2 ? 'snow' : 'plains',
      signals: {
        moisture: 0.55,
        temperature: y >= 2 ? 0.2 : 0.7,
        season: y >= 2 ? 'winter' : 'summer',
      },
    }));

    const blendedGrid = createTerrainSplatSampleGrid({
      seed: 'snow-blend-seed',
      bounds: {
        minX: 0,
        maxX: 3,
        minY: 0,
        maxY: 3,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });

    expect(
      getTerrainSplatGridSample(blendedGrid, 1, 1).entries.map(
        (entry) => entry.layerId
      )
    ).toEqual(expect.arrayContaining(['snow']));
  });

  it('blends broad road shoulders into adjacent terrain samples', () => {
    const { kindCatalog } = createGridCatalogs();
    const resolveTile = createTerrainSplatGridTileResolver(({ x }) => ({
      kind: x === 2 ? 'road' : 'plains',
      signals: {
        moisture: 0.5,
        roadSignal: x === 2 ? 0.85 : 0,
      },
    }));

    const unblendedGrid = createTerrainSplatSampleGrid({
      seed: 'road-shoulder-seed',
      bounds: {
        minX: 0,
        maxX: 3,
        minY: 0,
        maxY: 3,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
    });
    const blendedGrid = createTerrainSplatSampleGrid({
      seed: 'road-shoulder-seed',
      bounds: {
        minX: 0,
        maxX: 3,
        minY: 0,
        maxY: 3,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });

    expect(
      getTerrainSplatGridSample(unblendedGrid, 1, 1).entries.map(
        (entry) => entry.layerId
      )
    ).not.toEqual(expect.arrayContaining(['dirt-road']));
    expect(
      getTerrainSplatGridSample(blendedGrid, 1, 1).entries.map(
        (entry) => entry.layerId
      )
    ).toEqual(expect.arrayContaining(['dirt-road']));
    expect(
      getTerrainSplatGridSample(blendedGrid, 0, 1).entries.map(
        (entry) => entry.layerId
      )
    ).not.toEqual(expect.arrayContaining(['dirt-road']));
  });

  it('builds one chunk preview with grass and dirt splat layers', () => {
    const { kindCatalog } = createGridCatalogs();
    const grid = createTerrainSplatSampleGrid({
      seed: 'grass-dirt-chunk-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      resolveTile: createTerrainSplatGridTileResolver(({ x }) => ({
        kind: x >= 1 ? 'dirt' : 'plains',
        signals: {
          moisture: x >= 1 ? 0.64 : 0.74,
        },
      })),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });
    const preview = createTerrainSplatChunkPreview(grid);

    expect(preview.width).toBe(3);
    expect(preview.height).toBe(3);
    expect(preview.activeLayerIds).toEqual(
      expect.arrayContaining(['grass-a', 'dirt'])
    );
    expect(preview.mixedCellCount).toBeGreaterThan(0);
  });

  it('shows mixed terrain cells within one chunk preview', () => {
    const { kindCatalog } = createGridCatalogs();
    const grid = createTerrainSplatSampleGrid({
      seed: 'mixed-chunk-preview-seed',
      bounds: {
        minX: 0,
        maxX: 3,
        minY: 0,
        maxY: 3,
      },
      kindCatalog,
      resolveTile: createTerrainSplatGridTileResolver(({ x, y }) => ({
        kind: x >= 2 ? 'forest' : y >= 2 ? 'road' : 'plains',
        signals: {
          moisture: x >= 2 ? 0.82 : 0.58,
          roadSignal: y >= 2 ? 0.84 : 0,
          temperature: 0.68,
          season: 'summer',
        },
      })),
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });
    const preview = createTerrainSplatChunkPreview(grid);
    const mixedCells = preview.cells.filter((cell) => cell.isMixed);

    expect(preview.activeLayerIds).toEqual(
      expect.arrayContaining(['grass-a', 'leaf', 'dirt-road'])
    );
    expect(preview.mixedCellCount).toBe(mixedCells.length);
    expect(mixedCells.length).toBeGreaterThan(0);
    expect(
      mixedCells.some(
        (cell) =>
          cell.activeLayerIds.includes('dirt-road') &&
          cell.activeLayerIds.includes('grass-a')
      )
    ).toBe(true);
  });

  it('keeps adjacent chunk borders identical when blend zones use world neighbors', () => {
    const { kindCatalog } = createGridCatalogs();
    const resolveTile = createTerrainSplatGridTileResolver(({ x, y }) => ({
      kind: x >= 2 ? 'forest' : y >= 2 ? 'snow' : 'plains',
      signals: {
        moisture: normalizeSignal(x + y, 0.55),
        temperature: y >= 2 ? 0.2 : 0.7,
        season: y >= 2 ? 'winter' : 'summer',
        roadSignal: x === 2 ? 0.4 : 0,
      },
    }));

    const leftGrid = createTerrainSplatSampleGrid({
      seed: 'blended-border-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 3,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });
    const rightGrid = createTerrainSplatSampleGrid({
      seed: 'blended-border-seed',
      bounds: {
        minX: 2,
        maxX: 4,
        minY: 0,
        maxY: 3,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });

    for (let row = 0; row < leftGrid.height; row += 1) {
      expect(
        getTerrainSplatGridSample(leftGrid, leftGrid.width - 1, row)
      ).toEqual(getTerrainSplatGridSample(rightGrid, 0, row));
    }
  });

  it('keeps road splat border weights identical across separately built chunks', () => {
    const { kindCatalog } = createGridCatalogs();
    const resolveTile = createTerrainSplatGridTileResolver(({ x, y }) => ({
      kind: x === 2 ? 'road' : x >= 3 ? 'forest' : 'plains',
      signals: {
        moisture: normalizeSignal(y, 0.58),
        roadSignal: x === 2 ? 0.84 : 0,
        season: 'summer',
        temperature: 0.68,
      },
    }));

    const leftGrid = createTerrainSplatSampleGrid({
      seed: 'route-road-border-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 3,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });
    const rightGrid = createTerrainSplatSampleGrid({
      seed: 'route-road-border-seed',
      bounds: {
        minX: 2,
        maxX: 4,
        minY: 0,
        maxY: 3,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });

    for (let row = 0; row < leftGrid.height; row += 1) {
      expect(
        pickRouteEntries(
          getTerrainSplatGridSample(leftGrid, leftGrid.width - 1, row)
        )
      ).toEqual(pickRouteEntries(getTerrainSplatGridSample(rightGrid, 0, row)));
    }
  });

  it('keeps trail splat border weights identical across stacked chunks', () => {
    const { kindCatalog } = createGridCatalogs();
    const resolveTile = createTerrainSplatGridTileResolver(({ x, y }) => ({
      kind: y === 2 ? 'path' : y >= 3 ? 'forest' : 'plains',
      signals: {
        moisture: normalizeSignal(x, 0.44),
        roadSignal: y === 2 ? 0.12 : 0,
        season: 'summer',
        temperature: 0.68,
      },
    }));

    const topGrid = createTerrainSplatSampleGrid({
      seed: 'route-trail-border-seed',
      bounds: {
        minX: 0,
        maxX: 3,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });
    const bottomGrid = createTerrainSplatSampleGrid({
      seed: 'route-trail-border-seed',
      bounds: {
        minX: 0,
        maxX: 3,
        minY: 2,
        maxY: 4,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });

    for (let column = 0; column < topGrid.width; column += 1) {
      expect(
        pickRouteEntries(
          getTerrainSplatGridSample(topGrid, column, topGrid.height - 1)
        )
      ).toEqual(
        pickRouteEntries(getTerrainSplatGridSample(bottomGrid, column, 0))
      );
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

  it('builds a coarser lod grid while preserving chunk bounds and edge samples', () => {
    const { kindCatalog } = createGridCatalogs();
    const resolveTile = createTerrainSplatGridTileResolver(({ x, y }) => ({
      kind: x >= 4 ? 'forest' : y >= 4 ? 'snow' : 'plains',
      signals: {
        moisture: normalizeSignal(x + y, 0.55),
        temperature: y >= 4 ? 0.18 : 0.68,
        season: y >= 4 ? 'winter' : 'summer',
      },
    }));

    const lodGrid = createTerrainSplatSampleGridLod({
      seed: 'lod-grid-seed',
      bounds: {
        minX: 0,
        maxX: 6,
        minY: 0,
        maxY: 6,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
      lodStepMultiplier: 2,
    });

    expect(lodGrid.minX).toBe(0);
    expect(lodGrid.maxX).toBe(6);
    expect(lodGrid.minY).toBe(0);
    expect(lodGrid.maxY).toBe(6);
    expect(lodGrid.step).toBe(2);
    expect(lodGrid.width).toBe(4);
    expect(lodGrid.height).toBe(4);
    expect(lodGrid.samples).toHaveLength(16);
    expect(
      getTerrainSplatGridSample(lodGrid, lodGrid.width - 1, 0).entries.map(
        (entry) => entry.layerId
      )
    ).toEqual(expect.arrayContaining(['leaf']));
    expect(
      getTerrainSplatGridSample(lodGrid, 0, lodGrid.height - 1).entries.map(
        (entry) => entry.layerId
      )
    ).toEqual(expect.arrayContaining(['snow']));
  });

  it('reports splat generation cost for one chunk build against a budget', () => {
    const { kindCatalog } = createGridCatalogs();
    const nowMs = createMockNowMs([10, 12.75]);

    const result = createAdaptiveTerrainSplatSampleGrid({
      seed: 'generation-budget-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      resolveTile: createTerrainSplatGridTileResolver(({ x, y }) => ({
        kind: x + y >= 2 ? 'forest' : 'plains',
        signals: {
          moisture: normalizeSignal(x + y, 0.6),
        },
      })),
      fallbackLayerId: 'grass-a',
      budgetMs: 4,
      nowMs,
    });

    expect(result.grid.width).toBe(3);
    expect(result.metrics.elapsedMs).toBeCloseTo(2.75, 6);
    expect(result.metrics.budgetMs).toBe(4);
    expect(result.metrics.exceededBudget).toBe(false);
    expect(result.metrics.quality).toBe('full');
    expect(result.metrics.warning).toBeNull();
  });

  it('falls back to a coarser lod grid when splat generation exceeds the budget', () => {
    const { kindCatalog } = createGridCatalogs();
    const nowMs = createMockNowMs([20, 26.5, 30, 31.25]);

    const result = createAdaptiveTerrainSplatSampleGrid({
      seed: 'generation-overload-seed',
      bounds: {
        minX: 0,
        maxX: 6,
        minY: 0,
        maxY: 6,
      },
      kindCatalog,
      resolveTile: createTerrainSplatGridTileResolver(({ x, y }) => ({
        kind: x >= 4 ? 'forest' : y >= 4 ? 'snow' : 'plains',
        signals: {
          moisture: normalizeSignal(x + y, 0.58),
          temperature: y >= 4 ? 0.2 : 0.7,
          season: y >= 4 ? 'winter' : 'summer',
        },
      })),
      fallbackLayerId: 'grass-a',
      budgetMs: 3,
      fallbackLodStepMultiplier: 2,
      nowMs,
    });

    expect(result.grid.step).toBe(2);
    expect(result.metrics.quality).toBe('reduced');
    expect(result.metrics.elapsedMs).toBeCloseTo(1.25, 6);
    expect(result.metrics.budgetMs).toBe(3);
    expect(result.metrics.warning).toContain(
      'fell back to LOD step multiplier 2'
    );
  });

  it('preserves major terrain boundaries across adjacent lod chunk builds', () => {
    const { kindCatalog } = createGridCatalogs();
    const resolveTile = createTerrainSplatGridTileResolver(({ x, y }) => ({
      kind: x >= 4 ? 'forest' : y >= 4 ? 'snow' : 'plains',
      signals: {
        moisture: normalizeSignal(x + y, 0.58),
        temperature: y >= 4 ? 0.22 : 0.7,
        season: y >= 4 ? 'winter' : 'summer',
      },
    }));

    const leftGrid = createTerrainSplatSampleGridLod({
      seed: 'lod-border-seed',
      bounds: {
        minX: 0,
        maxX: 4,
        minY: 0,
        maxY: 6,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
      lodStepMultiplier: 2,
    });
    const rightGrid = createTerrainSplatSampleGridLod({
      seed: 'lod-border-seed',
      bounds: {
        minX: 4,
        maxX: 8,
        minY: 0,
        maxY: 6,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
      lodStepMultiplier: 2,
    });

    for (let row = 0; row < leftGrid.height; row += 1) {
      expect(
        getTerrainSplatGridSample(leftGrid, leftGrid.width - 1, row)
      ).toEqual(getTerrainSplatGridSample(rightGrid, 0, row));
    }
  });

  it('keeps dominant terrain identities stable near major lod boundaries', () => {
    const { kindCatalog } = createGridCatalogs();
    const resolveTile = createTerrainSplatGridTileResolver(({ x, y }) => ({
      kind: x >= 4 ? 'forest' : y >= 4 ? 'snow' : 'plains',
      signals: {
        moisture: x >= 4 ? 0.92 : 0.52,
        temperature: y >= 4 ? 0.18 : 0.68,
        season: y >= 4 ? 'winter' : 'summer',
      },
    }));

    const lodGrid = createTerrainSplatSampleGridLod({
      seed: 'lod-boundary-seed',
      bounds: {
        minX: 0,
        maxX: 6,
        minY: 0,
        maxY: 6,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
      lodStepMultiplier: 2,
    });

    expect(
      getTerrainSplatGridSample(lodGrid, 1, 1).entries.map(
        (entry) => entry.layerId
      )
    ).toEqual(expect.arrayContaining(['grass-a', 'grass-b']));
    expect(
      getTerrainSplatGridSample(lodGrid, 2, 1).entries.map(
        (entry) => entry.layerId
      )
    ).toEqual(expect.arrayContaining(['leaf']));
    expect(
      getTerrainSplatGridSample(lodGrid, 1, 2).entries.map(
        (entry) => entry.layerId
      )
    ).toEqual(expect.arrayContaining(['snow']));
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

  it('summarizes chunk layer usage and identifies unused layers', () => {
    const { layerCatalog, kindCatalog } = createGridCatalogs();
    const grid = createTerrainSplatSampleGrid({
      seed: 'usage-seed',
      bounds: {
        minX: 0,
        maxX: 2,
        minY: 0,
        maxY: 2,
      },
      kindCatalog,
      resolveTile: createTerrainSplatGridTileResolver(({ x, y }) => ({
        kind: x === 1 ? 'road' : y === 2 ? 'shore' : 'plains',
        signals: {
          moisture: normalizeSignal(y, 0.55),
          roadSignal: x === 1 ? 0.9 : 0,
        },
      })),
      fallbackLayerId: 'grass-a',
    });

    const summary = summarizeTerrainSplatSampleGridUsage(grid, layerCatalog, {
      maxActiveLayers: 6,
      maxUniqueLayerCombinations: 4,
    });

    expect(summary.activeLayerIds).toEqual([
      'dirt-road',
      'grass-a',
      'grass-b',
      'gravel-road',
      'sand',
      'soil',
    ]);
    expect(summary.unusedLayerIds).toEqual([
      'dirt',
      'dirt-trail',
      'grass-trail',
      'gravel',
      'gravel-trail',
      'leaf',
      'mud',
      'rock',
      'snow',
    ]);
    expect(summary.dominantLayerId).toBe('dirt-road');
    expect(summary.uniqueLayerCombinationCount).toBeGreaterThan(1);
    expect(summary.perSampleActiveLayerCount).toHaveLength(grid.samples.length);
    expect(summary.hardBoundaryCount).toBe(0);
    expect(summary.warnings).toEqual([]);
  });

  it('warns when one chunk activates too many layers or layer combinations', () => {
    const layerCatalog = createTerrainMaterialLayerCatalog([
      {
        id: 'base-a',
        baseColorTextureId: 'base-a/base',
        normalTextureId: 'base-a/normal',
        roughnessTextureId: 'base-a/roughness',
        textureScale: 3,
        defaultTint: '#888888',
        defaultRoughness: 0.8,
      },
      {
        id: 'base-b',
        baseColorTextureId: 'base-b/base',
        normalTextureId: 'base-b/normal',
        roughnessTextureId: 'base-b/roughness',
        textureScale: 3,
        defaultTint: '#777777',
        defaultRoughness: 0.8,
      },
      {
        id: 'base-c',
        baseColorTextureId: 'base-c/base',
        normalTextureId: 'base-c/normal',
        roughnessTextureId: 'base-c/roughness',
        textureScale: 3,
        defaultTint: '#666666',
        defaultRoughness: 0.8,
      },
      {
        id: 'blend-d',
        baseColorTextureId: 'blend-d/base',
        normalTextureId: 'blend-d/normal',
        roughnessTextureId: 'blend-d/roughness',
        textureScale: 3,
        defaultTint: '#555555',
        defaultRoughness: 0.8,
      },
      {
        id: 'blend-e',
        baseColorTextureId: 'blend-e/base',
        normalTextureId: 'blend-e/normal',
        roughnessTextureId: 'blend-e/roughness',
        textureScale: 3,
        defaultTint: '#444444',
        defaultRoughness: 0.8,
      },
    ]);
    const grid = {
      minX: 0,
      maxX: 1,
      minY: 0,
      maxY: 1,
      step: 1,
      width: 2,
      height: 2,
      samples: [
        {
          entries: [{ layerId: 'base-a', weight: 1 }],
        },
        {
          entries: [
            { layerId: 'base-b', weight: 0.7 },
            { layerId: 'blend-d', weight: 0.3 },
          ],
        },
        {
          entries: [
            { layerId: 'base-c', weight: 0.6 },
            { layerId: 'blend-e', weight: 0.4 },
          ],
        },
        {
          entries: [
            { layerId: 'base-a', weight: 0.5 },
            { layerId: 'blend-d', weight: 0.25 },
            { layerId: 'blend-e', weight: 0.25 },
          ],
        },
      ],
    } as const;

    const summary = summarizeTerrainSplatSampleGridUsage(grid, layerCatalog, {
      maxActiveLayers: 4,
      maxUniqueLayerCombinations: 2,
    });

    expect(summary.activeLayerIds).toEqual([
      'base-a',
      'base-b',
      'base-c',
      'blend-d',
      'blend-e',
    ]);
    expect(summary.warnings.map((warning) => warning.code)).toEqual([
      'too-many-active-layers',
      'too-many-unique-layer-combinations',
    ]);
    expect(summary.hardBoundaryCount).toBe(0);
  });

  it('warns about hard terrain boundaries only when explicitly requested', () => {
    const layerCatalog = createTerrainMaterialLayerCatalog([
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
        id: 'rock',
        baseColorTextureId: 'rock/base',
        normalTextureId: 'rock/normal',
        roughnessTextureId: 'rock/roughness',
        textureScale: 4,
        defaultTint: '#7f7f7f',
        defaultRoughness: 0.7,
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
    ]);
    const grid = {
      minX: 0,
      maxX: 1,
      minY: 0,
      maxY: 1,
      step: 1,
      width: 2,
      height: 2,
      samples: [
        {
          entries: [{ layerId: 'grass', weight: 1 }],
        },
        {
          entries: [{ layerId: 'rock', weight: 1 }],
        },
        {
          entries: [{ layerId: 'soil', weight: 1 }],
        },
        {
          entries: [
            { layerId: 'soil', weight: 0.75 },
            { layerId: 'grass', weight: 0.25 },
          ],
        },
      ],
    } as const;

    const defaultSummary = summarizeTerrainSplatSampleGridUsage(
      grid,
      layerCatalog
    );
    const warningSummary = summarizeTerrainSplatSampleGridUsage(
      grid,
      layerCatalog,
      {
        warnOnHardBoundaries: true,
      }
    );

    expect(defaultSummary.hardBoundaryCount).toBe(0);
    expect(defaultSummary.warnings).toEqual([]);
    expect(warningSummary.hardBoundaryCount).toBe(2);
    expect(warningSummary.warnings.map((warning) => warning.code)).toEqual([
      'hard-boundary-no-blend-zone',
    ]);
  });

  it('reduces hard-boundary warnings once blend zones are generated', () => {
    const layerCatalog = createTerrainMaterialLayerCatalog([
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
        id: 'rock',
        baseColorTextureId: 'rock/base',
        normalTextureId: 'rock/normal',
        roughnessTextureId: 'rock/roughness',
        textureScale: 4,
        defaultTint: '#7f7f7f',
        defaultRoughness: 0.7,
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
    ]);
    const kindCatalog = createTerrainKindSplatCatalog(
      [
        {
          kind: 'plains',
          baseLayerIds: ['grass'],
        },
        {
          kind: 'rocky',
          baseLayerIds: ['rock'],
        },
        {
          kind: 'snow',
          baseLayerIds: ['snow'],
        },
      ],
      layerCatalog
    );
    const resolveTile = createTerrainSplatGridTileResolver(({ x, y }) => ({
      kind: x >= 1 ? 'rocky' : y >= 1 ? 'snow' : 'plains',
    }));

    const unblendedGrid = createTerrainSplatSampleGrid({
      seed: 'hard-boundary-seed',
      bounds: {
        minX: 0,
        maxX: 1,
        minY: 0,
        maxY: 1,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
    });
    const blendedGrid = createTerrainSplatSampleGrid({
      seed: 'hard-boundary-seed',
      bounds: {
        minX: 0,
        maxX: 1,
        minY: 0,
        maxY: 1,
      },
      kindCatalog,
      resolveTile,
      fallbackLayerId: 'grass-a',
      blendWidth: 1,
    });

    const unblendedSummary = summarizeTerrainSplatSampleGridUsage(
      unblendedGrid,
      layerCatalog,
      {
        warnOnHardBoundaries: true,
      }
    );
    const blendedSummary = summarizeTerrainSplatSampleGridUsage(
      blendedGrid,
      layerCatalog,
      {
        warnOnHardBoundaries: true,
      }
    );

    expect(unblendedSummary.hardBoundaryCount).toBeGreaterThan(0);
    expect(blendedSummary.hardBoundaryCount).toBe(0);
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
    {
      id: 'dirt-trail',
      baseColorTextureId: 'dirt-trail/base',
      normalTextureId: 'dirt-trail/normal',
      roughnessTextureId: 'dirt-trail/roughness',
      textureScale: 3.2,
      defaultTint: '#7d674d',
      defaultRoughness: 0.79,
    },
    {
      id: 'gravel-trail',
      baseColorTextureId: 'gravel-trail/base',
      normalTextureId: 'gravel-trail/normal',
      roughnessTextureId: 'gravel-trail/roughness',
      textureScale: 2.8,
      defaultTint: '#90867b',
      defaultRoughness: 0.76,
    },
    {
      id: 'grass-trail',
      baseColorTextureId: 'grass-trail/base',
      normalTextureId: 'grass-trail/normal',
      roughnessTextureId: 'grass-trail/roughness',
      textureScale: 3.5,
      defaultTint: '#739050',
      defaultRoughness: 0.74,
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
      dirtTrailLayerId: 'dirt-trail',
      gravelTrailLayerId: 'gravel-trail',
      grassTrailLayerId: 'grass-trail',
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

function createMockNowMs(values: readonly number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}

function pickRouteEntries(sample: {
  entries: readonly { layerId: string; weight: number }[];
}) {
  return sample.entries.filter(
    (entry) =>
      entry.layerId.endsWith('-road') || entry.layerId.endsWith('-trail')
  );
}
