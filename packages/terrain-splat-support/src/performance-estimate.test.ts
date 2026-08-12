import { describe, expect, it } from 'vitest';
import {
  createOverworldTerrainSplatDefinitions,
  createTerrainKindSplatCatalog,
  createTerrainMaterialLayerCatalog,
} from './index.ts';
import {
  compareTerrainSplatChunkPerformance,
  compareTerrainRouteSplatPathPerformance,
  estimateTerrainSplatMaterialReuse,
} from './performance-estimate.ts';
import {
  createTerrainSplatGridTileResolver,
  createTerrainSplatSampleGrid,
} from './sample-grid.ts';

const TERRAIN_SPLAT_PERFORMANCE_LIMITS = {
  maxSplatDrawCalls: 1,
  maxSplatMaterialCount: 1,
  maxSplatProgramCount: 1,
  maxSplatTextureBindingCount: 3,
  maxSplatEstimatedFrameTimeMs: 0.7,
  minDrawCallReductionRatio: 0.9,
  minMaterialReductionRatio: 0.75,
  minProgramReductionRatio: 0.75,
  maxRouteSplatExtraDrawCalls: 0,
} as const;

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

  it('measures estimated texture memory and shows a lower shared-splat frame-time estimate', () => {
    const { grid, layerCatalog } = createComparisonFixture();

    const comparison = compareTerrainSplatChunkPerformance(grid, {
      catalog: layerCatalog,
    });

    expect(comparison.legacy.estimatedTextureMemoryBytes).toBeGreaterThan(0);
    expect(comparison.splat.estimatedTextureMemoryBytes).toBeGreaterThan(0);
    expect(
      comparison.legacy.estimatedTextureMemoryBytes
    ).toBeGreaterThanOrEqual(comparison.splat.estimatedTextureMemoryBytes);
    expect(
      comparison.reductions.estimatedTextureMemoryBytes
    ).toBeGreaterThanOrEqual(0);
    expect(
      comparison.reductionRatios.estimatedTextureMemoryBytes
    ).toBeGreaterThanOrEqual(0);
    expect(comparison.legacy.estimatedFrameTimeMs).toBeGreaterThan(
      comparison.splat.estimatedFrameTimeMs
    );
    expect(comparison.reductions.estimatedFrameTimeMs).toBeGreaterThan(0);
    expect(comparison.reductionRatios.estimatedFrameTimeMs).toBeGreaterThan(0);
  });

  it('tracks one shared splat program count instead of one program per legacy material signature', () => {
    const { grid, layerCatalog } = createComparisonFixture();

    const comparison = compareTerrainSplatChunkPerformance(grid, {
      catalog: layerCatalog,
    });

    expect(comparison.legacy.programCount).toBeGreaterThan(
      comparison.splat.programCount
    );
    expect(comparison.reductions.programCount).toBeGreaterThan(0);
    expect(comparison.reductionRatios.programCount).toBeGreaterThan(0);
  });

  it('compares route splat roads against extra mesh-road draw calls', () => {
    const { grid } = createComparisonFixture();

    const comparison = compareTerrainRouteSplatPathPerformance({
      grid,
      routeLayerIds: ['dirt-road', 'gravel-road'],
    });

    expect(comparison.legacyMesh.routeCellCount).toBeGreaterThan(0);
    expect(comparison.legacyMesh.drawCallCount).toBe(
      comparison.legacyMesh.routeCellCount
    );
    expect(comparison.splat.drawCallCount).toBe(0);
    expect(comparison.reductions.drawCallCount).toBeGreaterThan(0);
    expect(comparison.reductionRatios.drawCallCount).toBe(1);
  });

  it('includes trail splat cells when comparing route overlay draw calls', () => {
    const { grid } = createComparisonFixture({
      bounds: {
        minX: 0,
        maxX: 3,
        minY: 0,
        maxY: 3,
      },
      resolveKind: ({ x, y }) => ({
        kind: y >= 2 ? 'path' : x >= 2 ? 'road' : 'plains',
        signals: {
          moisture: y >= 2 ? 0.46 : 0.52,
          roadSignal: y >= 2 ? 0.12 : x >= 2 ? 0.84 : 0,
          season: 'summer',
          slope: 0.08,
          temperature: 0.68,
        },
      }),
    });

    const comparison = compareTerrainRouteSplatPathPerformance({
      grid,
      routeLayerIds: [
        'dirt-road',
        'gravel-road',
        'dirt-trail',
        'gravel-trail',
        'grass-trail',
      ],
    });

    expect(comparison.legacyMesh.routeCellCount).toBeGreaterThan(0);
    expect(comparison.legacyMesh.materialCount).toBeGreaterThan(0);
    expect(comparison.reductions.programCount).toBeGreaterThan(0);
    expect(comparison.reductions.estimatedFrameTimeMs).toBeGreaterThan(0);
  });

  it('reports shared splat material reuse across compatible chunks', () => {
    const first = createComparisonFixture();
    const second = createComparisonFixture();

    const summary = estimateTerrainSplatMaterialReuse({
      chunks: [
        { chunkId: '0:0', grid: first.grid },
        { chunkId: '1:0', grid: second.grid },
      ],
      catalog: first.layerCatalog,
      resolveTexture: createTextureResolver(),
      supportsTextureArrays: true,
    });

    expect(summary.chunkCount).toBe(2);
    expect(summary.uniqueMaterialCount).toBe(1);
    expect(summary.materialReuseCount).toBe(1);
    expect(summary.chunks).toHaveLength(2);
    expect(summary.chunks[0]?.materialKey).toBe(summary.chunks[1]?.materialKey);
    expect(
      summary.chunks.every((chunk) => chunk.bindingMode === 'texture-array')
    ).toBe(true);
  });

  it('warns when one chunk falls back to a unique per-layer terrain material path', () => {
    const first = createComparisonFixture();
    const second = createComparisonFixture({
      bounds: {
        minX: 0,
        maxX: 3,
        minY: 4,
        maxY: 7,
      },
      resolveKind: ({ x, y }) => ({
        kind: x >= 2 ? 'mountain' : y >= 6 ? 'shore' : 'forest',
        signals: {
          moisture: x >= 2 ? 0.18 : 0.82,
          roadSignal: 0,
          season: 'winter',
          slope: x >= 2 ? 0.72 : 0.18,
          temperature: x >= 2 ? 0.22 : 0.34,
        },
      }),
    });

    const summary = estimateTerrainSplatMaterialReuse({
      chunks: [
        { chunkId: '0:0', grid: first.grid },
        { chunkId: '0:1', grid: second.grid },
      ],
      catalog: first.layerCatalog,
      resolveTexture: createTextureResolver(),
      supportsTextureArrays: false,
    });

    expect(summary.uniqueMaterialCount).toBe(2);
    expect(summary.warnings).toContainEqual({
      code: 'texture-array-fallback',
      message:
        'Terrain texture binding plan is using per-layer texture fallback because texture arrays are unavailable.',
    });
    expect(
      summary.warnings.some(
        (warning) => warning.code === 'unique-splat-material'
      )
    ).toBe(true);
  });

  it('enforces deterministic terrain splat performance limits to catch regressions', () => {
    const { grid, layerCatalog } = createComparisonFixture();

    const terrainComparison = compareTerrainSplatChunkPerformance(grid, {
      catalog: layerCatalog,
    });
    const routeComparison = compareTerrainRouteSplatPathPerformance({
      grid,
      routeLayerIds: ['dirt-road', 'gravel-road'],
    });

    expect(terrainComparison.splat.drawCallCount).toBeLessThanOrEqual(
      TERRAIN_SPLAT_PERFORMANCE_LIMITS.maxSplatDrawCalls
    );
    expect(terrainComparison.splat.materialCount).toBeLessThanOrEqual(
      TERRAIN_SPLAT_PERFORMANCE_LIMITS.maxSplatMaterialCount
    );
    expect(terrainComparison.splat.programCount).toBeLessThanOrEqual(
      TERRAIN_SPLAT_PERFORMANCE_LIMITS.maxSplatProgramCount
    );
    expect(terrainComparison.splat.textureBindingCount).toBeLessThanOrEqual(
      TERRAIN_SPLAT_PERFORMANCE_LIMITS.maxSplatTextureBindingCount
    );
    expect(terrainComparison.splat.estimatedFrameTimeMs).toBeLessThanOrEqual(
      TERRAIN_SPLAT_PERFORMANCE_LIMITS.maxSplatEstimatedFrameTimeMs
    );
    expect(terrainComparison.reductionRatios.drawCallCount).toBeGreaterThanOrEqual(
      TERRAIN_SPLAT_PERFORMANCE_LIMITS.minDrawCallReductionRatio
    );
    expect(terrainComparison.reductionRatios.materialCount).toBeGreaterThanOrEqual(
      TERRAIN_SPLAT_PERFORMANCE_LIMITS.minMaterialReductionRatio
    );
    expect(terrainComparison.reductionRatios.programCount).toBeGreaterThanOrEqual(
      TERRAIN_SPLAT_PERFORMANCE_LIMITS.minProgramReductionRatio
    );
    expect(routeComparison.splat.drawCallCount).toBeLessThanOrEqual(
      TERRAIN_SPLAT_PERFORMANCE_LIMITS.maxRouteSplatExtraDrawCalls
    );
  });
});

function createComparisonFixture(
  options: {
    bounds?: {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
    };
    resolveKind?: (coords: { x: number; y: number }) => {
      kind: string;
      signals: {
        moisture: number;
        roadSignal: number;
        season: 'summer' | 'winter';
        slope: number;
        temperature: number;
      };
    };
  } = {}
) {
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
  const grid = createTerrainSplatSampleGrid({
    seed: 'terrain-splat-performance-seed',
    bounds: options.bounds ?? {
      minX: 0,
      maxX: 3,
      minY: 0,
      maxY: 3,
    },
    kindCatalog,
    resolveTile: createTerrainSplatGridTileResolver(
      options.resolveKind ??
        (({ x, y }) => ({
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
        }))
    ),
    fallbackLayerId: 'grass-a',
    blendWidth: 1,
  });

  return {
    grid,
    layerCatalog,
  };
}

function createTextureResolver() {
  const descriptors = {
    'grass-a/base': createTextureSource('grass-a/base'),
    'grass-a/normal': createTextureSource('grass-a/normal'),
    'grass-a/roughness': createTextureSource('grass-a/roughness'),
    'grass-b/base': createTextureSource('grass-b/base'),
    'grass-b/normal': createTextureSource('grass-b/normal'),
    'grass-b/roughness': createTextureSource('grass-b/roughness'),
    'soil/base': createTextureSource('soil/base'),
    'soil/normal': createTextureSource('soil/normal'),
    'soil/roughness': createTextureSource('soil/roughness'),
    'leaf/base': createTextureSource('leaf/base'),
    'leaf/normal': createTextureSource('leaf/normal'),
    'leaf/roughness': createTextureSource('leaf/roughness'),
    'rock/base': createTextureSource('rock/base'),
    'rock/normal': createTextureSource('rock/normal'),
    'rock/roughness': createTextureSource('rock/roughness'),
    'sand/base': createTextureSource('sand/base'),
    'sand/normal': createTextureSource('sand/normal'),
    'sand/roughness': createTextureSource('sand/roughness'),
    'dirt/base': createTextureSource('dirt/base'),
    'dirt/normal': createTextureSource('dirt/normal'),
    'dirt/roughness': createTextureSource('dirt/roughness'),
    'gravel/base': createTextureSource('gravel/base'),
    'gravel/normal': createTextureSource('gravel/normal'),
    'gravel/roughness': createTextureSource('gravel/roughness'),
    'mud/base': createTextureSource('mud/base'),
    'mud/normal': createTextureSource('mud/normal'),
    'mud/roughness': createTextureSource('mud/roughness'),
    'snow/base': createTextureSource('snow/base'),
    'snow/normal': createTextureSource('snow/normal'),
    'snow/roughness': createTextureSource('snow/roughness'),
    'dirt-road/base': createTextureSource('dirt-road/base'),
    'dirt-road/normal': createTextureSource('dirt-road/normal'),
    'dirt-road/roughness': createTextureSource('dirt-road/roughness'),
    'gravel-road/base': createTextureSource('gravel-road/base'),
    'gravel-road/normal': createTextureSource('gravel-road/normal'),
    'gravel-road/roughness': createTextureSource('gravel-road/roughness'),
    'dirt-trail/base': createTextureSource('dirt-trail/base'),
    'dirt-trail/normal': createTextureSource('dirt-trail/normal'),
    'dirt-trail/roughness': createTextureSource('dirt-trail/roughness'),
    'gravel-trail/base': createTextureSource('gravel-trail/base'),
    'gravel-trail/normal': createTextureSource('gravel-trail/normal'),
    'gravel-trail/roughness': createTextureSource('gravel-trail/roughness'),
    'grass-trail/base': createTextureSource('grass-trail/base'),
    'grass-trail/normal': createTextureSource('grass-trail/normal'),
    'grass-trail/roughness': createTextureSource('grass-trail/roughness'),
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
