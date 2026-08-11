import { describe, expect, it, vi } from 'vitest';
import {
  buildRuntimePerformanceSnapshot,
  normalizeRuntimePerformanceTrackingPreferences,
  postRuntimePerformanceSnapshot,
} from './runtime-performance-tracking.ts';
import {
  buildRuntimePerformanceIssueReport,
  createRuntimePerformanceIssueReporter,
  postRuntimePerformanceIssueReport,
} from './runtime-performance-issue.ts';
import type { DebugSnapshot } from './debug-panel.ts';

function createDebugSnapshot(
  overrides: Partial<DebugSnapshot> = {}
): DebugSnapshot {
  return {
    fps: 30,
    averageFps: 30,
    frameMs: 33.3,
    worstRecentFrameMs: 75,
    targetFps: 60,
    performanceTier: 'critical',
    renderQualityLevel: 'reduced',
    renderQualityLimiters: 'frame time, materials',
    playerLevel: 1,
    visibilityRadius: 6,
    drawCalls: 1301,
    triangles: 1000,
    points: 0,
    lines: 0,
    sceneChildCount: 10,
    visibleTileCount: 20,
    visibleTreeCount: 3,
    loadedChunkCount: 25,
    chunkGenerationQueueSize: 6,
    pendingTileCount: 6,
    averagePendingFlushTiles: 3,
    maxPendingFlushTiles: 6,
    averageTileBuildMs: 8,
    maxTileBuildMs: 22,
    averageFullTileBuildMs: 9,
    maxFullTileBuildMs: 24,
    averageLowTileBuildMs: 4,
    maxLowTileBuildMs: 7,
    averageTilePluginBuildMs: 7,
    maxTilePluginBuildMs: 18,
    slowestTilePluginLabel: 'tile-town',
    tileModelBudgetViolationsPerSecond: 2,
    tileModelBudgetViolationTopPluginLabel: 'tile-plains',
    tileModelBudgetViolationSummary:
      'tile-plains rejected 2.0 models per second.',
    tileNodeBuildsPerSecond: 4,
    tileBuildsPerSecond: 4,
    lodChecksPerSecond: 24,
    lodReplacementsPerSecond: 18,
    lodReplacementTopPluginLabel: 'tile-town',
    lodReplacementSummary: 'tile-town swapped 18.0 times per second.',
    lowerLodRecoveriesPerSecond: 4,
    fallbackBoxesPerSecond: 1,
    fallbackBoxTopPluginLabel: 'tile-plains',
    fallbackBoxSummary: 'tile-plains produced 1.0 fallback boxes per second.',
    drawCallTopPluginLabel: 'tile-forest',
    drawCallSummary: 'tile-forest dominates draw calls.',
    objectTopPluginLabel: 'tile-town',
    objectSummary: 'tile-town dominates objects.',
    meshTopPluginLabel: 'tile-town',
    meshSummary: 'tile-town dominates meshes.',
    materialTopPluginLabel: 'tile-water',
    materialSummary: 'tile-water dominates materials.',
    staticMatrixUpdateTopPluginLabel: 'tile-sign',
    staticMatrixUpdateSummary: 'tile-sign keeps static matrices hot.',
    lastLodFailureReason: 'Upgrade budget exhausted.',
    lastFallbackReason: 'Missing low-cost plains model.',
    currentTilePlugin: 'tile-plains',
    currentTileRequestedDetailLevel: 'full',
    currentTileRenderedDetailLevel: 'low',
    currentTileCachedDetailLevel: 'low',
    currentTileFallbackReason: 'Budget rejection',
    currentTileHasVisibleModel: true,
    object3dCount: 2600,
    visibleObjectCount: 2500,
    invisibleObjectCount: 100,
    groupCount: 20,
    meshCount: 100,
    instancedMeshCount: 0,
    visibleInstancedMeshCount: 0,
    renderedInstanceCount: 0,
    visibleMeshCount: 100,
    maxHierarchyDepth: 6,
    averageHierarchyDepth: 3,
    emptyGroupCount: 0,
    oneChildGroupCount: 5,
    matrixAutoUpdateCount: 30,
    staticMatrixAutoUpdateCount: 10,
    pointsCount: 0,
    lineObjectCount: 0,
    cameraCount: 1,
    activeParticleSystemCount: 0,
    activeParticleCount: 0,
    spriteCount: 0,
    lightCount: 4,
    ambientLightCount: 1,
    directionalLightCount: 1,
    pointLightCount: 2,
    spotLightCount: 0,
    hemisphereLightCount: 0,
    dynamicLightCount: 2,
    shadowLightCount: 1,
    activeNpcCount: 0,
    fullSimulationEntityCount: 0,
    reducedSimulationEntityCount: 0,
    activeAudioSourceCount: 4,
    materialRefCount: 500,
    materialCount: 467,
    sharedMaterialCount: 40,
    clonedMaterialCount: 20,
    transparentMaterialCount: 4,
    alphaTestMaterialCount: 1,
    doubleSidedMaterialCount: 2,
    fogMaterialCount: 10,
    customShaderMaterialCount: 0,
    materialTypes: 'MeshStandardMaterial:467',
    materialsCreatedDuringSamplingWindow: 2,
    materialsDisposedDuringSamplingWindow: 0,
    peakMaterialCount: 467,
    geometryRefCount: 200,
    geometryCount: 100,
    sharedGeometryCount: 20,
    gpuGeometryCount: 100,
    geometryBytes: 2048,
    vertexBufferBytes: 1024,
    indexBufferBytes: 1024,
    averageVerticesPerGeometry: 32,
    largestGeometryVertexCount: 64,
    largestGeometryBytes: 512,
    vertexCount: 3200,
    geometryMemoryCount: 100,
    treeObjectCount: 0,
    treeMeshCount: 0,
    treeMaterialRefCount: 0,
    visibleTileKindSummary: 'plains:10,town:5',
    textureCount: 20,
    textureMemoryEstimateMb: 16,
    programCount: 12,
    latitude: 0,
    longitude: 0,
    gridX: 0,
    gridY: 0,
    worldSeed: 'alpha',
    heapUsedMb: 128,
    heapLimitMb: 512,
    resourceWarnings: ['Instanced meshes are missing from the visible scene.'],
    ...overrides,
  };
}

describe('runtime performance tracking', () => {
  it('defaults tracking to enabled unless the persisted session opted out', () => {
    expect(normalizeRuntimePerformanceTrackingPreferences(undefined)).toEqual({
      enabled: true,
    });
    expect(
      normalizeRuntimePerformanceTrackingPreferences({
        runtimePerformanceTrackingEnabled: false,
      })
    ).toEqual({
      enabled: false,
    });
  });

  it('builds snapshots with measurable limits and violations', () => {
    const snapshot = buildRuntimePerformanceSnapshot({
      source: 'game',
      trigger: 'startup',
      route: '/',
      worldSeed: 'alpha',
      metrics: {
        initialWorldGenerationMs: 4_500,
        maximumFrameMs: 55,
        drawCalls: 1_300,
      },
    });

    expect(snapshot.violations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Initial world generation'),
        expect.stringContaining('Maximum frame time'),
        expect.stringContaining('Draw calls'),
      ])
    );
  });

  it('posts runtime performance snapshots to the vite endpoint when fetch is available', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }) as Response);

    const snapshot = buildRuntimePerformanceSnapshot({
      source: 'music-debug',
      trigger: 'midi-export',
      route: '/debug/music',
    });

    await expect(
      postRuntimePerformanceSnapshot(snapshot, { fetchImpl })
    ).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/runtime-performance-snapshots',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('builds runtime issue reports from degraded debug snapshots', () => {
    const issue = buildRuntimePerformanceIssueReport({
      source: 'game',
      route: '/',
      worldSeed: 'alpha',
      context: {
        id: 'overworld',
        label: 'Overworld',
        depth: 0,
      },
      debugSnapshot: createDebugSnapshot(),
    });

    expect(issue).not.toBeNull();
    expect(issue?.summary).toContain('exceeded');
    expect(issue?.pluginHotspots.rejectedModels).toBe('tile-plains');
    expect(issue?.pluginHotspots.materials).toBe('tile-water');
    expect(issue?.renderState.renderQualityLimiters).toEqual([
      'frame time',
      'materials',
    ]);
    expect(issue?.performanceSnapshot.violations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Maximum frame time'),
        expect.stringContaining('Draw calls'),
      ])
    );
  });

  it('skips runtime issue reports for healthy snapshots with no active warnings', () => {
    const issue = buildRuntimePerformanceIssueReport({
      source: 'game',
      route: '/',
      debugSnapshot: createDebugSnapshot({
        worstRecentFrameMs: 16,
        performanceTier: 'healthy',
        renderQualityLevel: 'full',
        renderQualityLimiters: '',
        drawCalls: 600,
        object3dCount: 1200,
        averageTileBuildMs: 4,
        maxTileBuildMs: 12,
        averageFullTileBuildMs: 5,
        maxFullTileBuildMs: 12,
        averageLowTileBuildMs: 3,
        maxLowTileBuildMs: 6,
        tileModelBudgetViolationsPerSecond: 0,
        tileModelBudgetViolationTopPluginLabel: undefined,
        tileModelBudgetViolationSummary: undefined,
        fallbackBoxesPerSecond: 0,
        fallbackBoxSummary: undefined,
        fallbackBoxTopPluginLabel: undefined,
        lastLodFailureReason: undefined,
        lastFallbackReason: undefined,
        resourceWarnings: [],
      }),
    });

    expect(issue).toBeNull();
  });

  it('posts runtime issue reports to the dedicated vite endpoint', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }) as Response);
    const issue = buildRuntimePerformanceIssueReport({
      source: 'game',
      route: '/',
      debugSnapshot: createDebugSnapshot(),
    });

    await expect(
      postRuntimePerformanceIssueReport(issue!, { fetchImpl })
    ).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/runtime-performance-issues',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('throttles duplicate runtime issue reports for a few seconds', async () => {
    const postIssue = vi.fn(async () => true);
    const reporter = createRuntimePerformanceIssueReporter({
      minimumIntervalMs: 5_000,
      nowMs: vi
        .fn()
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(2_000)
        .mockReturnValueOnce(6_000),
      postIssue,
    });
    const issue = buildRuntimePerformanceIssueReport({
      source: 'game',
      route: '/',
      debugSnapshot: createDebugSnapshot(),
    });

    await expect(reporter(issue)).resolves.toBe(true);
    await expect(reporter(issue)).resolves.toBe(false);
    await expect(reporter(issue)).resolves.toBe(true);
    expect(postIssue).toHaveBeenCalledTimes(2);
  });
});
