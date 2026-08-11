import { describe, expect, it } from 'vitest';
import {
  buildDebugMarkup,
  getHeapGrowthWarning,
  getIdleAllocationWarning,
  formatPerformanceTierLabel,
  getMaterialGrowthWarning,
  getPerformanceWarnings,
  getRenderBudgetViolationWarnings,
  getSceneBudgetWarnings,
  getSynchronousTileBuildWarnings,
  getStationaryTileBuildWarning,
  getDebugSignature,
  getTargetFrameMs,
  getUnloadedRegionWarnings,
  getWorkQueueWarnings,
  normalizeWorldSeed,
  recordHeapUsageSample,
  recordMaterialGrowthSample,
  recordPerformanceHistorySample,
  recordRendererChurnSample,
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
      averageFps: 56.4,
      frameMs: 17.2,
      worstRecentFrameMs: 28.6,
      targetFps: 60 as const,
      performanceTier: 'healthy' as const,
      renderQualityLevel: 'Full',
      renderQualityLimiters: 'None',
      playerLevel: 4,
      visibilityRadius: 18,
      drawCalls: 42,
      triangles: 2048,
      points: 96,
      lines: 18,
      renderWidth: 1536,
      renderHeight: 864,
      devicePixelRatio: 2,
      renderScale: 1,
      sceneChildCount: 7,
      visibleTileCount: 112,
      visibleTreeCount: 27,
      loadedChunkCount: 112,
      chunkGenerationQueueSize: 6,
      pendingTileCount: 6,
      averagePendingFlushTiles: 3.5,
      maxPendingFlushTiles: 5,
      averageTileBuildMs: 2.45,
      maxTileBuildMs: 6.75,
      averageFullTileBuildMs: 3.4,
      maxFullTileBuildMs: 6.75,
      averageLowTileBuildMs: 1.25,
      maxLowTileBuildMs: 1.5,
      tileModelBudgetViolationsPerSecond: 2,
      tileModelBudgetViolationTopPluginLabel: 'tile-forest',
      tileModelBudgetViolationSummary: 'tile-forest:2, tile-town:1',
      tileNodeBuildsPerSecond: 17,
      tileBuildsPerSecond: 14,
      lodChecksPerSecond: 5,
      lodReplacementsPerSecond: 3,
      lodReplacementTopPluginLabel: 'tile-forest',
      lodReplacementSummary: 'tile-forest:2, tile-town:1',
      lowerLodRecoveriesPerSecond: 2,
      fallbackBoxesPerSecond: 1,
      fallbackBoxTopPluginLabel: 'tile-forest',
      fallbackBoxSummary: 'tile-forest:1',
      drawCallTopPluginLabel: 'tile-forest',
      drawCallSummary: 'tile-forest:17, tile-town:7',
      objectTopPluginLabel: 'tile-forest',
      objectSummary: 'tile-forest:30, tile-town:9',
      meshTopPluginLabel: 'tile-forest',
      meshSummary: 'tile-forest:22, tile-town:7',
      materialTopPluginLabel: 'tile-forest',
      materialSummary: 'tile-forest:15, tile-town:5',
      staticMatrixUpdateTopPluginLabel: 'tile-forest',
      staticMatrixUpdateSummary: 'tile-forest:9, tile-town:6',
      lastLodFailureReason:
        '15:-9 / tile-forest: visible lod recovery failed after full (full failed) -> low (low failed)',
      lastFallbackReason: '15:-9 / tile-forest: low failed',
      currentTilePlugin: 'tile-forest',
      currentTileRequestedDetailLevel: 'full',
      currentTileRenderedDetailLevel: 'low',
      currentTileCachedDetailLevel: 'low',
      currentTileFallbackReason: 'low failed',
      currentTileHasVisibleModel: true,
      object3dCount: 318,
      groupCount: 54,
      meshCount: 180,
      visibleMeshCount: 164,
      pointsCount: 5,
      activeParticleSystemCount: 4,
      activeParticleCount: 96,
      spriteCount: 9,
      lightCount: 12,
      dynamicLightCount: 4,
      shadowLightCount: 2,
      activeNpcCount: 19,
      fullSimulationEntityCount: 21,
      reducedSimulationEntityCount: 2,
      activeAudioSourceCount: 6,
      materialCount: 24,
      geometryCount: 61,
      vertexCount: 14432,
      geometryMemoryCount: 63,
      treeObjectCount: 216,
      treeMeshCount: 135,
      treeMaterialRefCount: 135,
      visibleTileKindSummary: 'forest:48, plains:32, river:12, town:4',
      textureCount: 7,
      textureMemoryEstimateMb: 12.5,
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

    expect(getDebugSignature(snapshot)).toBe(
      getDebugSignature({ ...snapshot })
    );
    expect(buildDebugMarkup(snapshot)).toContain('Draw Calls');
    expect(buildDebugMarkup(snapshot)).toContain('Draw Call Plugin');
    expect(buildDebugMarkup(snapshot)).toContain('Draw Call Summary');
    expect(buildDebugMarkup(snapshot)).toContain('Object Plugin');
    expect(buildDebugMarkup(snapshot)).toContain('Mesh Plugin');
    expect(buildDebugMarkup(snapshot)).toContain('Material Plugin');
    expect(buildDebugMarkup(snapshot)).toContain('Avg FPS');
    expect(buildDebugMarkup(snapshot)).toContain('Avg Full Tile Build');
    expect(buildDebugMarkup(snapshot)).toContain('Avg Low Tile Build');
    expect(buildDebugMarkup(snapshot)).toContain('Frame Target');
    expect(buildDebugMarkup(snapshot)).toContain('Perf Tier');
    expect(buildDebugMarkup(snapshot)).toContain('Render Quality');
    expect(buildDebugMarkup(snapshot)).toContain('Quality Limiters');
    expect(buildDebugMarkup(snapshot)).toContain('Level');
    expect(buildDebugMarkup(snapshot)).toContain('GPU Points');
    expect(buildDebugMarkup(snapshot)).toContain('Render Resolution');
    expect(buildDebugMarkup(snapshot)).toContain('Device Pixel Ratio');
    expect(buildDebugMarkup(snapshot)).toContain('Render Scale');
    expect(buildDebugMarkup(snapshot)).toContain('Geometry Count');
    expect(buildDebugMarkup(snapshot)).toContain('Vertices');
    expect(buildDebugMarkup(snapshot)).toContain('Textures');
    expect(buildDebugMarkup(snapshot)).toContain('Estimated Texture Memory');
    expect(buildDebugMarkup(snapshot)).toContain('JavaScript Heap');
    expect(buildDebugMarkup(snapshot)).toContain('Geometry Memory');
    expect(buildDebugMarkup(snapshot)).toContain('Scene Roots');
    expect(buildDebugMarkup(snapshot)).toContain('Visible Trees');
    expect(buildDebugMarkup(snapshot)).toContain('Loaded Chunks');
    expect(buildDebugMarkup(snapshot)).toContain('Chunk Queue');
    expect(buildDebugMarkup(snapshot)).toContain('Model Queue');
    expect(buildDebugMarkup(snapshot)).toContain('Avg Flush Tiles');
    expect(buildDebugMarkup(snapshot)).toContain('Max Flush Tiles');
    expect(buildDebugMarkup(snapshot)).toContain('Avg Tile Build');
    expect(buildDebugMarkup(snapshot)).toContain('Max Tile Build');
    expect(buildDebugMarkup(snapshot)).toContain('Budget Rejects/s');
    expect(buildDebugMarkup(snapshot)).toContain('Budget Plugin');
    expect(buildDebugMarkup(snapshot)).toContain('Budget Summary');
    expect(buildDebugMarkup(snapshot)).toContain('Tile Nodes/s');
    expect(buildDebugMarkup(snapshot)).toContain('Tile Builds/s');
    expect(buildDebugMarkup(snapshot)).toContain('LOD Checks/s');
    expect(buildDebugMarkup(snapshot)).toContain('LOD Swaps/s');
    expect(buildDebugMarkup(snapshot)).toContain('LOD Swap Plugin');
    expect(buildDebugMarkup(snapshot)).toContain('LOD Swap Summary');
    expect(buildDebugMarkup(snapshot)).toContain('LOD Recoveries/s');
    expect(buildDebugMarkup(snapshot)).toContain('Fallback Boxes/s');
    expect(buildDebugMarkup(snapshot)).toContain('Fallback Plugin');
    expect(buildDebugMarkup(snapshot)).toContain('Fallback Summary');
    expect(buildDebugMarkup(snapshot)).toContain('Static Matrix Plugin');
    expect(buildDebugMarkup(snapshot)).toContain('Static Matrix Summary');
    expect(buildDebugMarkup(snapshot)).toContain('Last LOD Failure');
    expect(buildDebugMarkup(snapshot)).toContain('Fallback Reason');
    expect(buildDebugMarkup(snapshot)).toContain('Current Tile Plugin');
    expect(buildDebugMarkup(snapshot)).toContain('Current Tile Requested LOD');
    expect(buildDebugMarkup(snapshot)).toContain('Current Tile Rendered LOD');
    expect(buildDebugMarkup(snapshot)).toContain('Current Tile Cached LOD');
    expect(buildDebugMarkup(snapshot)).toContain('Current Tile Has Model');
    expect(buildDebugMarkup(snapshot)).toContain('Current Tile Fallback');
    expect(buildDebugMarkup(snapshot)).toContain('Worst Frame');
    expect(buildDebugMarkup(snapshot)).toContain('Points Nodes');
    expect(buildDebugMarkup(snapshot)).toContain('Sprites');
    expect(buildDebugMarkup(snapshot)).toContain('Active Objects');
    expect(buildDebugMarkup(snapshot)).toContain('Three.js Objects');
    expect(buildDebugMarkup(snapshot)).toContain('Visible Meshes');
    expect(buildDebugMarkup(snapshot)).toContain('Particles');
    expect(buildDebugMarkup(snapshot)).toContain('Particle Systems');
    expect(buildDebugMarkup(snapshot)).toContain('Active Dynamic Lights');
    expect(buildDebugMarkup(snapshot)).toContain('Shadow Lights');
    expect(buildDebugMarkup(snapshot)).toContain('Active NPCs');
    expect(buildDebugMarkup(snapshot)).toContain('Full-sim Entities');
    expect(buildDebugMarkup(snapshot)).toContain('Reduced-sim Entities');
    expect(buildDebugMarkup(snapshot)).toContain('Audio Voices');
    expect(buildDebugMarkup(snapshot)).toContain('Objects / Tree');
    expect(buildDebugMarkup(snapshot)).toContain('Meshes / Tree');
    expect(buildDebugMarkup(snapshot)).toContain('Objects / Tile');
    expect(buildDebugMarkup(snapshot)).toContain('Materials');
    expect(buildDebugMarkup(snapshot)).toContain('Tile Kinds');
    expect(buildDebugMarkup(snapshot)).toContain('Triangles');
    expect(buildDebugMarkup(snapshot)).toContain('Shader Programs');
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

  it('records heap samples on a rolling history and warns on sustained growth', () => {
    const samples: Array<{
      nowMs: number;
      heapUsedMb: number;
      playerX: number;
      playerY: number;
    }> = [];

    recordHeapUsageSample(samples, {
      nowMs: 0,
      heapUsedMb: 120,
      playerX: 0,
      playerY: 0,
    });
    recordHeapUsageSample(samples, {
      nowMs: 400,
      heapUsedMb: 126,
      playerX: 0.1,
      playerY: 0,
    });
    expect(samples).toHaveLength(1);
    expect(samples[0]?.heapUsedMb).toBe(126);

    recordHeapUsageSample(samples, {
      nowMs: 1500,
      heapUsedMb: 138,
      playerX: 0.2,
      playerY: 0,
    });
    recordHeapUsageSample(samples, {
      nowMs: 3000,
      heapUsedMb: 151,
      playerX: 0.3,
      playerY: 0.1,
    });
    recordHeapUsageSample(samples, {
      nowMs: 4500,
      heapUsedMb: 164,
      playerX: 0.4,
      playerY: 0.1,
    });

    expect(getHeapGrowthWarning(samples)).toBe(
      'Heap usage keeps climbing (126.0 -> 164.0 MB).'
    );

    recordHeapUsageSample(samples, {
      nowMs: 18000,
      heapUsedMb: 150,
      playerX: 1,
      playerY: 0,
    });
    expect(samples).toHaveLength(1);
  });

  it('avoids heap growth warnings when the increase is too small or non-monotonic', () => {
    expect(
      getHeapGrowthWarning([
        { nowMs: 0, heapUsedMb: 120, playerX: 0, playerY: 0 },
        { nowMs: 1000, heapUsedMb: 128, playerX: 0, playerY: 0 },
        { nowMs: 2000, heapUsedMb: 133, playerX: 0, playerY: 0 },
        { nowMs: 3000, heapUsedMb: 141, playerX: 0, playerY: 0 },
      ])
    ).toBeNull();

    expect(
      getHeapGrowthWarning([
        { nowMs: 0, heapUsedMb: 120, playerX: 0, playerY: 0 },
        { nowMs: 1000, heapUsedMb: 138, playerX: 0, playerY: 0 },
        { nowMs: 2000, heapUsedMb: 134, playerX: 0, playerY: 0 },
        { nowMs: 3000, heapUsedMb: 149, playerX: 0, playerY: 0 },
      ])
    ).toBeNull();
  });

  it('warns when heap usage keeps climbing while the player is effectively idle', () => {
    expect(
      getIdleAllocationWarning([
        { nowMs: 0, heapUsedMb: 120, playerX: 10, playerY: 4 },
        { nowMs: 1000, heapUsedMb: 129, playerX: 10.1, playerY: 4 },
        { nowMs: 2000, heapUsedMb: 139, playerX: 10.2, playerY: 4.1 },
        { nowMs: 3000, heapUsedMb: 149, playerX: 10.3, playerY: 4.1 },
      ])
    ).toBe(
      'Heap usage keeps climbing while idle (120.0 -> 149.0 MB over 0.32 tiles).'
    );
  });

  it('records performance history samples on a rolling one-minute window', () => {
    const samples = [
      {
        nowMs: 100,
        fps: 60,
        frameMs: 16.7,
        targetFps: 60 as const,
        visibilityRadius: 18,
        renderQualityLevel: 'Full',
        drawCalls: 100,
        triangles: 2000,
        objectCount: 300,
        materialCount: 20,
        geometryCount: 40,
        heapUsedMb: 48,
        tileBuildsPerSecond: 12,
        lodReplacementsPerSecond: 2,
        visibleTileCount: 120,
        visibleTreeCount: 32,
        activeLightCount: 4,
        generationQueueSize: 3,
      },
    ];

    recordPerformanceHistorySample(samples, {
      nowMs: 500,
      fps: 58,
      frameMs: 17.3,
      targetFps: 60,
      visibilityRadius: 18,
      renderQualityLevel: 'Full',
      drawCalls: 104,
      triangles: 2200,
      objectCount: 308,
      materialCount: 21,
      geometryCount: 41,
      heapUsedMb: 49,
      tileBuildsPerSecond: 11,
      lodReplacementsPerSecond: 3,
      visibleTileCount: 118,
      visibleTreeCount: 30,
      activeLightCount: 5,
      generationQueueSize: 5,
    });

    expect(samples).toHaveLength(1);

    recordPerformanceHistorySample(samples, {
      nowMs: 1200,
      fps: 55,
      frameMs: 18.1,
      targetFps: 30,
      visibilityRadius: 14,
      renderQualityLevel: 'Reduced',
      drawCalls: 110,
      triangles: 2400,
      objectCount: 315,
      materialCount: 22,
      geometryCount: 42,
      heapUsedMb: 50,
      tileBuildsPerSecond: 9,
      lodReplacementsPerSecond: 4,
      visibleTileCount: 116,
      visibleTreeCount: 29,
      activeLightCount: 5,
      generationQueueSize: 6,
    });

    expect(samples).toEqual([
      expect.objectContaining({ nowMs: 1200, fps: 55, generationQueueSize: 6 }),
    ]);

    recordPerformanceHistorySample(samples, {
      nowMs: 62050,
      fps: 53,
      frameMs: 18.9,
      targetFps: 30,
      visibilityRadius: 10,
      renderQualityLevel: 'Minimal',
      drawCalls: 120,
      triangles: 2600,
      objectCount: 320,
      materialCount: 23,
      geometryCount: 43,
      heapUsedMb: null,
      tileBuildsPerSecond: 8,
      lodReplacementsPerSecond: 4,
      visibleTileCount: 110,
      visibleTreeCount: 24,
      activeLightCount: 6,
      generationQueueSize: 7,
    });

    expect(samples).toEqual([
      expect.objectContaining({
        nowMs: 62050,
        heapUsedMb: null,
        activeLightCount: 6,
        generationQueueSize: 7,
      }),
    ]);
  });

  it('avoids idle allocation warnings when the player is moving or heap growth is too small', () => {
    expect(
      getIdleAllocationWarning([
        { nowMs: 0, heapUsedMb: 120, playerX: 0, playerY: 0 },
        { nowMs: 1000, heapUsedMb: 129, playerX: 0.9, playerY: 0 },
        { nowMs: 2000, heapUsedMb: 139, playerX: 1.8, playerY: 0 },
        { nowMs: 3000, heapUsedMb: 149, playerX: 2.7, playerY: 0 },
      ])
    ).toBeNull();

    expect(
      getIdleAllocationWarning([
        { nowMs: 0, heapUsedMb: 120, playerX: 10, playerY: 4 },
        { nowMs: 1000, heapUsedMb: 124, playerX: 10.1, playerY: 4 },
        { nowMs: 2000, heapUsedMb: 129, playerX: 10.2, playerY: 4.1 },
        { nowMs: 3000, heapUsedMb: 134, playerX: 10.3, playerY: 4.1 },
      ])
    ).toBeNull();
  });

  it('warns when tile nodes keep rebuilding while the player is nearly stationary', () => {
    const samples: Array<{
      nowMs: number;
      tileNodeBuildsPerSecond: number;
      playerX: number;
      playerY: number;
    }> = [];

    recordRendererChurnSample(samples, {
      nowMs: 0,
      tileNodeBuildsPerSecond: 6,
      playerX: 10,
      playerY: 4,
    });
    recordRendererChurnSample(samples, {
      nowMs: 250,
      tileNodeBuildsPerSecond: 7,
      playerX: 10.1,
      playerY: 4,
    });
    expect(samples).toHaveLength(1);
    expect(samples[0]?.tileNodeBuildsPerSecond).toBe(7);

    recordRendererChurnSample(samples, {
      nowMs: 900,
      tileNodeBuildsPerSecond: 6,
      playerX: 10.2,
      playerY: 4,
    });
    recordRendererChurnSample(samples, {
      nowMs: 1800,
      tileNodeBuildsPerSecond: 5,
      playerX: 10.3,
      playerY: 4.1,
    });
    recordRendererChurnSample(samples, {
      nowMs: 2700,
      tileNodeBuildsPerSecond: 8,
      playerX: 10.4,
      playerY: 4.1,
    });

    expect(getStationaryTileBuildWarning(samples)).toContain(
      'Tile nodes keep rebuilding while stationary'
    );
  });

  it('avoids tile rebuild warnings when the player is moving or build churn is low', () => {
    expect(
      getStationaryTileBuildWarning([
        { nowMs: 0, tileNodeBuildsPerSecond: 3, playerX: 0, playerY: 0 },
        { nowMs: 600, tileNodeBuildsPerSecond: 6, playerX: 0.2, playerY: 0.1 },
        { nowMs: 1200, tileNodeBuildsPerSecond: 5, playerX: 0.4, playerY: 0.2 },
        { nowMs: 1800, tileNodeBuildsPerSecond: 4, playerX: 0.6, playerY: 0.2 },
      ])
    ).toBeNull();

    expect(
      getStationaryTileBuildWarning([
        { nowMs: 0, tileNodeBuildsPerSecond: 6, playerX: 0, playerY: 0 },
        { nowMs: 600, tileNodeBuildsPerSecond: 6, playerX: 1.5, playerY: 0 },
        { nowMs: 1200, tileNodeBuildsPerSecond: 5, playerX: 3.2, playerY: 0 },
        { nowMs: 1800, tileNodeBuildsPerSecond: 4, playerX: 4.7, playerY: 0 },
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

  it('warns when frame time, draw calls, triangle count, object count, program count, shadow lights, or audio sources exceed budgets', () => {
    expect(
      getPerformanceWarnings({
        frameMs: 54.2,
        targetFps: 60,
        drawCalls: 980,
        triangles: 470000,
        object3dCount: 2601,
        programCount: 52,
        shadowLightCount: 4,
        activeAudioSourceCount: 26,
      })
    ).toEqual([
      'Frame time is over budget (54.2 ms > 50.0 ms).',
      'Draw calls exceed the target (980 > 900).',
      'Triangle count is high (470000 > 450000).',
      'Three.js object count is high (2601 > 2400).',
      'Shader program count is high (52 > 48).',
      'Shadow light count is high (4 > 3).',
      'Active audio source count is high (26 > 24).',
    ]);

    expect(
      getPerformanceWarnings({
        frameMs: 24,
        targetFps: 30,
        drawCalls: 1150,
        triangles: 650000,
        object3dCount: 2200,
        programCount: 32,
        shadowLightCount: 2,
        activeAudioSourceCount: 12,
      })
    ).toEqual([]);
  });

  it('warns when the chunk-generation queue backs up faster than it is draining', () => {
    expect(
      getWorkQueueWarnings({
        chunkGenerationQueueSize: 63,
        averagePendingFlushTiles: 2.4,
        maxPendingFlushTiles: 5,
      })
    ).toEqual([
      'Chunk-generation queue is backing up (63 queued, avg flush 2.4, max flush 5).',
    ]);

    expect(
      getWorkQueueWarnings({
        chunkGenerationQueueSize: 18,
        averagePendingFlushTiles: 2.4,
        maxPendingFlushTiles: 5,
      })
    ).toEqual([]);
  });

  it('warns when one synchronous tile plugin build spends too much time in one frame slice', () => {
    expect(
      getSynchronousTileBuildWarnings({
        maxTilePluginBuildMs: 12.4,
        slowestTilePluginLabel: 'tile-forest',
      })
    ).toEqual([
      'Synchronous tile build is too slow (tile-forest took 12.4 ms > 8.0 ms).',
    ]);

    expect(
      getSynchronousTileBuildWarnings({
        maxTilePluginBuildMs: 6.9,
        slowestTilePluginLabel: 'tile-forest',
      })
    ).toEqual([]);
  });

  it('warns when render-budget validation keeps rejecting plugin models', () => {
    expect(
      getRenderBudgetViolationWarnings({
        tileModelBudgetViolationsPerSecond: 3,
        tileModelBudgetViolationTopPluginLabel: 'tile-forest',
      })
    ).toEqual([
      'Render budget is rejecting plugin models (3/s, top plugin tile-forest).',
    ]);

    expect(
      getRenderBudgetViolationWarnings({
        tileModelBudgetViolationsPerSecond: 0,
        tileModelBudgetViolationTopPluginLabel: 'tile-forest',
      })
    ).toEqual([]);
  });

  it('warns when no tiles are visible but render resources still appear retained', () => {
    expect(
      getUnloadedRegionWarnings({
        visibleTileCount: 0,
        visibleTreeCount: 2,
        treeObjectCount: 14,
        geometryCount: 40,
        geometryMemoryCount: 37,
        materialCount: 41,
        textureCount: 19,
      })
    ).toEqual([
      'No tiles are visible, but tree count remains (2 > 0).',
      'No tiles are visible, but tree objects remain (14 > 0).',
      'No tiles are visible, but render resources remain (geom 40/37, mat 41, tex 19).',
    ]);
  });

  it('avoids unloaded-region warnings while tiles are still visible or retained resources stay under the baseline', () => {
    expect(
      getUnloadedRegionWarnings({
        visibleTileCount: 3,
        visibleTreeCount: 2,
        treeObjectCount: 14,
        geometryCount: 40,
        geometryMemoryCount: 37,
        materialCount: 41,
        textureCount: 19,
      })
    ).toEqual([]);

    expect(
      getUnloadedRegionWarnings({
        visibleTileCount: 0,
        visibleTreeCount: 0,
        treeObjectCount: 0,
        geometryCount: 18,
        geometryMemoryCount: 16,
        materialCount: 20,
        textureCount: 8,
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
