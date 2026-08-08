import { describe, expect, it } from 'vitest';
import {
  buildDebugMarkup,
  formatPerformanceTierLabel,
  getMaterialGrowthWarning,
  getSceneBudgetWarnings,
  getDebugSignature,
  getTargetFrameMs,
  normalizeWorldSeed,
  recordMaterialGrowthSample,
  resolvePerformanceTier,
} from './debug-panel.ts';

describe('debug panel', () => {
  it('normalizes world seeds with a fallback', () => {
    expect(normalizeWorldSeed('  alpha  ', 'fallback')).toBe('alpha');
    expect(normalizeWorldSeed('   ', 'fallback')).toBe('fallback');
    expect(normalizeWorldSeed(undefined, 'fallback')).toBe('fallback');
  });

  it('builds stable signatures and markup for debug snapshots', () => {
    const snapshot = {
      fps: 58.2,
      frameMs: 17.2,
      targetFps: 60 as const,
      performanceTier: 'healthy' as const,
      playerLevel: 4,
      visibilityRadius: 18,
      drawCalls: 42,
      triangles: 2048,
      points: 96,
      lines: 18,
      sceneChildCount: 7,
      visibleTileCount: 112,
      visibleTreeCount: 27,
      pendingTileCount: 6,
      averageTileBuildMs: 2.45,
      maxTileBuildMs: 6.75,
      tileNodeBuildsPerSecond: 17,
      tileBuildsPerSecond: 14,
      lodChecksPerSecond: 5,
      lodReplacementsPerSecond: 3,
      object3dCount: 318,
      groupCount: 54,
      meshCount: 180,
      pointsCount: 5,
      spriteCount: 9,
      lightCount: 12,
      materialCount: 24,
      geometryCount: 61,
      geometryMemoryCount: 63,
      treeObjectCount: 216,
      treeMeshCount: 135,
      treeMaterialRefCount: 135,
      visibleTileKindSummary: 'forest:48, plains:32, river:12, town:4',
      textureCount: 7,
      programCount: 12,
      latitude: 32.1234,
      longitude: -81.5678,
      gridX: 14,
      gridY: -9,
      worldSeed: 'alpha',
      heapUsedMb: 48.4,
      heapLimitMb: 128,
      resourceWarnings: [
        'Objects per visible tile is high (18.5 > 18).',
        'Material count keeps climbing while moving (24 -> 39).',
      ],
    };

    expect(getDebugSignature(snapshot)).toBe(getDebugSignature({ ...snapshot }));
    expect(buildDebugMarkup(snapshot)).toContain('GPU Draws');
    expect(buildDebugMarkup(snapshot)).toContain('Frame Target');
    expect(buildDebugMarkup(snapshot)).toContain('Perf Tier');
    expect(buildDebugMarkup(snapshot)).toContain('Level');
    expect(buildDebugMarkup(snapshot)).toContain('GPU Points');
    expect(buildDebugMarkup(snapshot)).toContain('GPU Geometries');
    expect(buildDebugMarkup(snapshot)).toContain('Scene Roots');
    expect(buildDebugMarkup(snapshot)).toContain('Visible Trees');
    expect(buildDebugMarkup(snapshot)).toContain('Avg Tile Build');
    expect(buildDebugMarkup(snapshot)).toContain('Max Tile Build');
    expect(buildDebugMarkup(snapshot)).toContain('Tile Nodes/s');
    expect(buildDebugMarkup(snapshot)).toContain('Tile Builds/s');
    expect(buildDebugMarkup(snapshot)).toContain('LOD Checks/s');
    expect(buildDebugMarkup(snapshot)).toContain('LOD Swaps/s');
    expect(buildDebugMarkup(snapshot)).toContain('Points Nodes');
    expect(buildDebugMarkup(snapshot)).toContain('Sprites');
    expect(buildDebugMarkup(snapshot)).toContain('Lights');
    expect(buildDebugMarkup(snapshot)).toContain('Objects / Tree');
    expect(buildDebugMarkup(snapshot)).toContain('Meshes / Tree');
    expect(buildDebugMarkup(snapshot)).toContain('Objects / Tile');
    expect(buildDebugMarkup(snapshot)).toContain('Materials');
    expect(buildDebugMarkup(snapshot)).toContain('Tile Kinds');
    expect(buildDebugMarkup(snapshot)).toContain('Programs');
    expect(buildDebugMarkup(snapshot)).toContain('Warnings');
    expect(buildDebugMarkup(snapshot)).toContain('alpha');
  });

  it('records material growth samples on a small rolling history and warns on sustained increases while moving', () => {
    const samples: Array<{
      nowMs: number;
      materialCount: number;
      playerX: number;
      playerY: number;
    }> = [];

    recordMaterialGrowthSample(samples, {
      nowMs: 0,
      materialCount: 24,
      playerX: 0,
      playerY: 0,
    });
    recordMaterialGrowthSample(samples, {
      nowMs: 250,
      materialCount: 25,
      playerX: 0.2,
      playerY: 0,
    });
    expect(samples).toHaveLength(1);
    expect(samples[0]?.materialCount).toBe(25);

    recordMaterialGrowthSample(samples, {
      nowMs: 900,
      materialCount: 30,
      playerX: 1.5,
      playerY: 0,
    });
    recordMaterialGrowthSample(samples, {
      nowMs: 1800,
      materialCount: 36,
      playerX: 2.8,
      playerY: 0,
    });
    recordMaterialGrowthSample(samples, {
      nowMs: 2700,
      materialCount: 42,
      playerX: 4.4,
      playerY: 0,
    });

    expect(getMaterialGrowthWarning(samples)).toContain(
      'Material count keeps climbing while moving'
    );

    recordMaterialGrowthSample(samples, {
      nowMs: 11850,
      materialCount: 28,
      playerX: 5,
      playerY: 0,
    });
    expect(samples).toHaveLength(1);
  });

  it('avoids warning when material growth is too small or the player is mostly stationary', () => {
    expect(
      getMaterialGrowthWarning([
        { nowMs: 0, materialCount: 20, playerX: 0, playerY: 0 },
        { nowMs: 600, materialCount: 24, playerX: 0.3, playerY: 0 },
        { nowMs: 1200, materialCount: 27, playerX: 0.5, playerY: 0 },
        { nowMs: 1800, materialCount: 31, playerX: 0.7, playerY: 0 },
      ])
    ).toBeNull();

    expect(
      getMaterialGrowthWarning([
        { nowMs: 0, materialCount: 20, playerX: 0, playerY: 0 },
        { nowMs: 600, materialCount: 24, playerX: 1.4, playerY: 0 },
        { nowMs: 1200, materialCount: 27, playerX: 2.6, playerY: 0 },
        { nowMs: 1800, materialCount: 30, playerX: 4.2, playerY: 0 },
      ])
    ).toBeNull();
  });

  it('warns when object budgets per visible tile or tree are exceeded', () => {
    expect(
      getSceneBudgetWarnings({
        visibleTileCount: 10,
        visibleTreeCount: 5,
        object3dCount: 220,
        treeObjectCount: 42,
      })
    ).toEqual([
      'Objects per visible tile is high (22.0 > 18).',
      'Objects per tree is high (8.4 > 7).',
    ]);

    expect(
      getSceneBudgetWarnings({
        visibleTileCount: 12,
        visibleTreeCount: 8,
        object3dCount: 120,
        treeObjectCount: 48,
      })
    ).toEqual([]);
  });

  it('derives frame budgets and performance tiers from frame time', () => {
    expect(getTargetFrameMs(60)).toBeCloseTo(16.6667, 3);
    expect(getTargetFrameMs(30)).toBeCloseTo(33.3333, 3);
    expect(resolvePerformanceTier(16.7)).toBe('healthy');
    expect(resolvePerformanceTier(24)).toBe('reduced');
    expect(resolvePerformanceTier(40)).toBe('critical');
    expect(formatPerformanceTierLabel('healthy')).toBe('Healthy');
    expect(formatPerformanceTierLabel('reduced')).toBe('Reduced');
    expect(formatPerformanceTierLabel('critical')).toBe('Critical');
  });
});
