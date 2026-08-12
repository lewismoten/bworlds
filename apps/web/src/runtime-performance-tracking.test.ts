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
    reducedQualityDurationSec: 2.5,
    latestQualityChangeLimiter: 'Scene materials exceeded the hard cap',
    latestQualityChangeSummary:
      'Target FPS 60 -> 30, visibility radius 18.0 -> 14.0, quality Full -> Reduced, limiters: Scene materials exceeded the hard cap',
    playerLevel: 1,
    visibilityRadius: 6,
    weatherVisibilityRadiusCap: 6,
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
    schedulerStarvationEventsPerSecond: 2,
    schedulerStarvationTopPluginLabel: 'tile-forest',
    schedulerStarvationSummary: 'tile-forest starved 2.0 times per second.',
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
    instancedMeshTopPluginLabel: 'tile-forest',
    instancedMeshSummary: 'tile-forest owns 9 visible instanced meshes.',
    renderedInstanceTopPluginLabel: 'tile-forest',
    renderedInstanceSummary: 'tile-forest renders 66 instances.',
    instancingWarningTopPluginLabel: 'tile-town',
    instancingWarningSummary:
      'tile-town suggests instancing repeated parts 4 times per second.',
    materialTopPluginLabel: 'tile-water',
    materialSummary: 'tile-water dominates materials.',
    sceneUniqueMaterialTopPluginLabel: 'tile-route',
    sceneUniqueMaterialSummary: 'tile-route owns 9 scene-unique materials.',
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
    maxChunkDrawCalls: 184,
    maxChunkObjectCount: 180,
    maxChunkMeshes: 120,
    maxChunkTriangleCount: 26000,
    groupCount: 20,
    meshCount: 100,
    instancedMeshCount: 0,
    visibleInstancedMeshCount: 0,
    renderedInstanceCount: 0,
    visibleMeshCount: 100,
    visibleTriangleCount: 1000,
    visibleVertexCount: 2000,
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
    estimatedGpuMemoryBytes: 80 * 1024 * 1024,
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
    expect(issue?.summary).toBe('tile-plains rejected 2.0 models per second.');
    expect(issue?.pluginHotspots.rejectedModels).toBe('tile-plains');
    expect(issue?.pluginHotspots.materials).toBe('tile-route');
    expect(issue?.pluginHotspots.instancedMeshes).toBe('tile-forest');
    expect(issue?.pluginHotspots.renderedInstances).toBe('tile-forest');
    expect(issue?.pluginHotspots.instancingWarnings).toBe('tile-town');
    expect(issue?.pluginHotspots.schedulerStarvations).toBe('tile-forest');
    expect(issue?.renderState.renderQualityLimiters).toEqual([
      'frame time',
      'materials',
    ]);
    expect(issue?.renderState.reducedQualityDurationSec).toBe(2.5);
    expect(issue?.renderState.renderQualityLimiterDetails).toEqual([
      'frame time',
      'materials',
    ]);
    expect(issue?.renderState.visibilityRadiusDetail).toBe(
      'Visibility radius is currently reduced to 6 from full 18. Weather currently caps draw distance at 6. Weather is pushing draw distance below the minimum-quality radius 10.'
    );
    expect(issue?.renderState.latestQualityChangeLimiter).toBe(
      'Scene materials exceeded the hard cap'
    );
    expect(issue?.renderState.latestQualityChangeLimiterDetail).toBe(
      'Scene materials 467 exceeded hard cap 48'
    );
    expect(issue?.renderState.latestQualityChangeSummary).toContain(
      'Scene materials exceeded the hard cap'
    );
    expect(issue?.reasons).not.toContain(
      'Reduced graphics quality has persisted for 2.5 seconds.'
    );
    expect(issue?.reasons).not.toContain(
      'Latest quality change was triggered by Scene materials 467 exceeded hard cap 48.'
    );
    expect(issue?.reasons).not.toContain(
      'Visibility radius is currently reduced to 6 from full 18. Weather currently caps draw distance at 6. Weather is pushing draw distance below the minimum-quality radius 10.'
    );
    expect(issue?.reasons.some((reason) => reason.startsWith('Top '))).toBe(
      false
    );
    expect(issue?.reasons).toContain(
      'tile-forest starved 2.0 times per second.'
    );
    expect(issue?.performanceSnapshot.violations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Maximum frame time'),
        expect.stringContaining('Draw calls'),
      ])
    );
  });

  it('keeps measured quality-limiter details without letting them drive the summary', () => {
    const issue = buildRuntimePerformanceIssueReport({
      source: 'game',
      route: '/',
      worldSeed: 'alpha',
      context: {
        id: 'overworld',
        label: 'Overworld',
        depth: 0,
      },
      debugSnapshot: createDebugSnapshot({
        performanceTier: 'critical',
        worstRecentFrameMs: 17.6,
        frameMs: 17.6,
        drawCalls: 285,
        renderQualityLimiters:
          'Visibility radius reduced to 10, Weather visibility reduced draw distance, Chunk draw calls exceeded the soft cap, Scene materials exceeded the hard cap',
        visibilityRadius: 10,
        weatherVisibilityRadiusCap: 10,
        maxChunkDrawCalls: 184,
        materialCount: 52,
        latestQualityChangeLimiter: 'Scene materials exceeded the hard cap',
        latestQualityChangeSummary:
          'Target FPS 60 -> 30, visibility radius 18.0 -> 10.0, quality Full -> Reduced, limiters: Scene materials exceeded the hard cap',
      }),
    });

    expect(issue?.summary).toBe('tile-plains rejected 2.0 models per second.');
    expect(issue?.renderState.renderQualityLimiterDetails).toEqual([
      'Visibility radius reduced to 10 (full 18, reduced 14, minimum 10)',
      'Weather visibility capped draw distance at 10 (full 18, weather cap 10)',
      'Chunk draw calls 184 exceeded soft cap 160',
      'Scene materials 52 exceeded hard cap 48',
    ]);
    expect(issue?.renderState.visibilityRadiusDetail).toBe(
      'Visibility radius is currently reduced to 10 from full 18. Weather currently caps draw distance at 10. The renderer is operating at the minimum visibility radius 10.'
    );
    expect(issue?.reasons).not.toContain(
      'Graphics quality is constrained by Visibility radius reduced to 10 (full 18, reduced 14, minimum 10); Weather visibility capped draw distance at 10 (full 18, weather cap 10); Chunk draw calls 184 exceeded soft cap 160; Scene materials 52 exceeded hard cap 48.'
    );
    expect(issue?.reasons).not.toContain(
      'Latest quality change was triggered by Scene materials 52 exceeded hard cap 48.'
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
        reducedQualityDurationSec: 0,
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
        schedulerStarvationEventsPerSecond: 0,
        schedulerStarvationTopPluginLabel: undefined,
        schedulerStarvationSummary: undefined,
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

  it('skips runtime issue reports when reduced quality only reflects a near-threshold visibility radius', () => {
    const issue = buildRuntimePerformanceIssueReport({
      source: 'game',
      route: '/',
      debugSnapshot: createDebugSnapshot({
        fps: 60,
        averageFps: 60,
        frameMs: 16,
        worstRecentFrameMs: 16,
        targetFps: 60,
        performanceTier: 'healthy',
        renderQualityLevel: 'reduced',
        renderQualityLimiters:
          'Visibility radius reduced to 13.852092950833658, Weather visibility reduced draw distance',
        reducedQualityDurationSec: 4.2,
        latestQualityChangeLimiter:
          'Visibility radius reduced to 13.852092950833658',
        latestQualityChangeSummary:
          'Target FPS 60 -> 60, visibility radius 18.0 -> 13.9, quality Full -> Reduced, limiters: Visibility radius reduced to 13.852092950833658',
        visibilityRadius: 13.852092950833658,
        weatherVisibilityRadiusCap: 13.852092950833658,
        drawCalls: 200,
        object3dCount: 1200,
        visibleObjectCount: 400,
        maxChunkDrawCalls: 40,
        maxChunkObjectCount: 40,
        maxChunkMeshes: 20,
        maxChunkTriangleCount: 5000,
        materialCount: 12,
        textureCount: 10,
        visibleTriangleCount: 5000,
        visibleVertexCount: 10000,
        visibleMeshCount: 60,
        averageTileBuildMs: 4,
        maxTileBuildMs: 8,
        averageFullTileBuildMs: 5,
        maxFullTileBuildMs: 10,
        averageLowTileBuildMs: 3,
        maxLowTileBuildMs: 5,
        tileModelBudgetViolationsPerSecond: 0,
        tileModelBudgetViolationTopPluginLabel: undefined,
        tileModelBudgetViolationSummary: undefined,
        schedulerStarvationEventsPerSecond: 0,
        schedulerStarvationTopPluginLabel: undefined,
        schedulerStarvationSummary: undefined,
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

  it('skips runtime issue reports when only the generic reduced-tier status remains', () => {
    const issue = buildRuntimePerformanceIssueReport({
      source: 'game',
      route: '/',
      debugSnapshot: createDebugSnapshot({
        fps: 60,
        averageFps: 60,
        frameMs: 16.7,
        worstRecentFrameMs: 16.7,
        targetFps: 60,
        performanceTier: 'reduced',
        renderQualityLevel: 'reduced',
        renderQualityLimiters: '',
        reducedQualityDurationSec: 8.4,
        latestQualityChangeLimiter: undefined,
        latestQualityChangeSummary: undefined,
        visibilityRadius: 18,
        weatherVisibilityRadiusCap: undefined,
        drawCalls: 120,
        object3dCount: 900,
        visibleObjectCount: 300,
        maxChunkDrawCalls: 16,
        maxChunkObjectCount: 36,
        maxChunkMeshes: 16,
        maxChunkTriangleCount: 5000,
        materialCount: 12,
        textureCount: 10,
        visibleTriangleCount: 5000,
        visibleVertexCount: 10000,
        visibleMeshCount: 40,
        averageTileBuildMs: 4,
        maxTileBuildMs: 8,
        averageFullTileBuildMs: 5,
        maxFullTileBuildMs: 10,
        averageLowTileBuildMs: 3,
        maxLowTileBuildMs: 5,
        tileModelBudgetViolationsPerSecond: 0,
        tileModelBudgetViolationTopPluginLabel: undefined,
        tileModelBudgetViolationSummary: undefined,
        schedulerStarvationEventsPerSecond: 0,
        schedulerStarvationTopPluginLabel: undefined,
        schedulerStarvationSummary: undefined,
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

  it('skips runtime issue reports when reduced quality only contributes limiter narration', () => {
    const issue = buildRuntimePerformanceIssueReport({
      source: 'game',
      route: '/',
      debugSnapshot: createDebugSnapshot({
        fps: 60,
        averageFps: 60,
        frameMs: 16.7,
        worstRecentFrameMs: 16.7,
        targetFps: 60,
        performanceTier: 'reduced',
        renderQualityLevel: 'reduced',
        renderQualityLimiters:
          'Visibility radius reduced to 10, Weather visibility reduced draw distance, Chunk draw calls exceeded the soft cap, Scene materials exceeded the soft cap',
        reducedQualityDurationSec: 8.4,
        latestQualityChangeLimiter: 'Scene materials exceeded the soft cap',
        latestQualityChangeSummary:
          'Target FPS 60 -> 60, visibility radius 18.0 -> 10.0, quality Full -> Reduced, limiters: Scene materials exceeded the soft cap',
        visibilityRadius: 10,
        weatherVisibilityRadiusCap: 10,
        drawCalls: 120,
        object3dCount: 900,
        visibleObjectCount: 300,
        maxChunkDrawCalls: 184,
        maxChunkObjectCount: 36,
        maxChunkMeshes: 16,
        maxChunkTriangleCount: 5000,
        materialCount: 32,
        textureCount: 10,
        visibleTriangleCount: 5000,
        visibleVertexCount: 10000,
        visibleMeshCount: 40,
        averageTileBuildMs: 4,
        maxTileBuildMs: 8,
        averageFullTileBuildMs: 5,
        maxFullTileBuildMs: 10,
        averageLowTileBuildMs: 3,
        maxLowTileBuildMs: 5,
        tileModelBudgetViolationsPerSecond: 0,
        tileModelBudgetViolationTopPluginLabel: undefined,
        tileModelBudgetViolationSummary: undefined,
        schedulerStarvationEventsPerSecond: 0,
        schedulerStarvationTopPluginLabel: undefined,
        schedulerStarvationSummary: undefined,
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

  it('filters unactionable runtime issue reasons before reporting to the api', () => {
    const issue = buildRuntimePerformanceIssueReport({
      source: 'game',
      route: '/',
      debugSnapshot: createDebugSnapshot({
        fps: 60,
        averageFps: 60,
        frameMs: 16.7,
        worstRecentFrameMs: 16.7,
        targetFps: 60,
        performanceTier: 'reduced',
        renderQualityLevel: 'reduced',
        renderQualityLimiters: '',
        reducedQualityDurationSec: 8.4,
        latestQualityChangeLimiter: undefined,
        latestQualityChangeSummary: undefined,
        visibilityRadius: 18,
        weatherVisibilityRadiusCap: undefined,
        drawCalls: 120,
        object3dCount: 900,
        visibleObjectCount: 300,
        maxChunkDrawCalls: 16,
        maxChunkObjectCount: 36,
        maxChunkMeshes: 16,
        maxChunkTriangleCount: 5000,
        materialCount: 12,
        textureCount: 10,
        visibleTriangleCount: 5000,
        visibleVertexCount: 10000,
        visibleMeshCount: 40,
        averageTileBuildMs: 4,
        maxTileBuildMs: 8,
        averageFullTileBuildMs: 5,
        maxFullTileBuildMs: 10,
        averageLowTileBuildMs: 3,
        maxLowTileBuildMs: 5,
        tileModelBudgetViolationsPerSecond: 0,
        tileModelBudgetViolationTopPluginLabel: undefined,
        tileModelBudgetViolationSummary: undefined,
        schedulerStarvationEventsPerSecond: 1,
        schedulerStarvationTopPluginLabel: 'tile-plains',
        schedulerStarvationSummary: 'tile-plains:1',
        fallbackBoxesPerSecond: 0,
        fallbackBoxSummary: undefined,
        fallbackBoxTopPluginLabel: undefined,
        lastLodFailureReason: undefined,
        lastFallbackReason: undefined,
        resourceWarnings: [
          'Chunk-generation queue is backing up (347 queued, avg flush 1.0, max flush 1).',
          'Objects per visible tile is high (435.0 > 18).',
        ],
      }),
    });

    expect(issue).toBeNull();
  });

  it('skips runtime issue reports when only generic budget pressure remains', () => {
    const issue = buildRuntimePerformanceIssueReport({
      source: 'game',
      route: '/',
      debugSnapshot: createDebugSnapshot({
        worstRecentFrameMs: 75,
        frameMs: 55,
        renderQualityLimiters:
          'Visibility radius reduced to 10, Weather visibility reduced draw distance, Chunk draw calls exceeded the hard cap, Scene materials exceeded the hard cap',
        latestQualityChangeLimiter: 'Scene materials exceeded the hard cap',
        latestQualityChangeSummary:
          'Target FPS 60 -> 30, visibility radius 18.0 -> 10.0, quality Full -> Reduced, limiters: Scene materials exceeded the hard cap',
        visibilityRadius: 10,
        weatherVisibilityRadiusCap: 10,
        drawCalls: 1301,
        object3dCount: 2600,
        maxTileBuildMs: 8,
        averageTileBuildMs: 4,
        tileModelBudgetViolationsPerSecond: 0,
        tileModelBudgetViolationTopPluginLabel: undefined,
        tileModelBudgetViolationSummary: undefined,
        schedulerStarvationEventsPerSecond: 0,
        schedulerStarvationTopPluginLabel: undefined,
        schedulerStarvationSummary: undefined,
        fallbackBoxesPerSecond: 0,
        fallbackBoxTopPluginLabel: undefined,
        fallbackBoxSummary: undefined,
        lastLodFailureReason: undefined,
        lastFallbackReason: undefined,
        resourceWarnings: [
          'Draw calls exceed the target (1301 > 900).',
          'Three.js object count is high (2600 > 2400).',
        ],
      }),
    });

    expect(issue).toBeNull();
  });

  it('skips runtime issue reports when only wrapped budget fallback and lod reasons remain', () => {
    const issue = buildRuntimePerformanceIssueReport({
      source: 'game',
      route: '/',
      debugSnapshot: createDebugSnapshot({
        worstRecentFrameMs: 16.7,
        frameMs: 16.7,
        fps: 60,
        averageFps: 60,
        performanceTier: 'healthy',
        renderQualityLevel: 'full',
        renderQualityLimiters: '',
        reducedQualityDurationSec: 0,
        latestQualityChangeLimiter: undefined,
        latestQualityChangeSummary: undefined,
        drawCalls: 120,
        object3dCount: 900,
        visibleObjectCount: 300,
        maxChunkDrawCalls: 16,
        maxChunkObjectCount: 36,
        maxChunkMeshes: 16,
        maxChunkTriangleCount: 5000,
        materialCount: 12,
        textureCount: 10,
        visibleTriangleCount: 5000,
        visibleVertexCount: 10000,
        visibleMeshCount: 40,
        averageTileBuildMs: 4,
        maxTileBuildMs: 8,
        averageFullTileBuildMs: 5,
        maxFullTileBuildMs: 10,
        averageLowTileBuildMs: 3,
        maxLowTileBuildMs: 5,
        tileModelBudgetViolationsPerSecond: 0,
        tileModelBudgetViolationTopPluginLabel: undefined,
        tileModelBudgetViolationSummary: undefined,
        schedulerStarvationEventsPerSecond: 0,
        schedulerStarvationTopPluginLabel: undefined,
        schedulerStarvationSummary: undefined,
        fallbackBoxesPerSecond: 0,
        fallbackBoxTopPluginLabel: undefined,
        fallbackBoxSummary: undefined,
        lastLodFailureReason:
          '15:-9 / tile-route: visible lod recovery failed after full (full failed) -> low (tile drawCallCount 21>17)',
        lastFallbackReason: 'plugin unique materialCount 13>12',
        resourceWarnings: [],
      }),
    });

    expect(issue).toBeNull();
  });

  it('keeps semantic fallback reasons reportable when they are not generic budget pressure', () => {
    const issue = buildRuntimePerformanceIssueReport({
      source: 'game',
      route: '/',
      debugSnapshot: createDebugSnapshot({
        worstRecentFrameMs: 16.7,
        frameMs: 16.7,
        fps: 60,
        averageFps: 60,
        performanceTier: 'healthy',
        renderQualityLevel: 'full',
        renderQualityLimiters: '',
        reducedQualityDurationSec: 0,
        latestQualityChangeLimiter: undefined,
        latestQualityChangeSummary: undefined,
        drawCalls: 120,
        object3dCount: 900,
        visibleObjectCount: 300,
        maxChunkDrawCalls: 16,
        maxChunkObjectCount: 36,
        maxChunkMeshes: 16,
        maxChunkTriangleCount: 5000,
        materialCount: 12,
        textureCount: 10,
        visibleTriangleCount: 5000,
        visibleVertexCount: 10000,
        visibleMeshCount: 40,
        averageTileBuildMs: 4,
        maxTileBuildMs: 8,
        averageFullTileBuildMs: 5,
        maxFullTileBuildMs: 10,
        averageLowTileBuildMs: 3,
        maxLowTileBuildMs: 5,
        tileModelBudgetViolationsPerSecond: 0,
        tileModelBudgetViolationTopPluginLabel: undefined,
        tileModelBudgetViolationSummary: undefined,
        schedulerStarvationEventsPerSecond: 0,
        schedulerStarvationTopPluginLabel: undefined,
        schedulerStarvationSummary: undefined,
        fallbackBoxesPerSecond: 0,
        fallbackBoxTopPluginLabel: undefined,
        fallbackBoxSummary: undefined,
        lastLodFailureReason: undefined,
        lastFallbackReason: 'Missing low-cost plains model.',
        resourceWarnings: [],
      }),
    });

    expect(issue).not.toBeNull();
    expect(issue?.summary).toBe(
      'Latest fallback reason: Missing low-cost plains model.'
    );
  });

  it('skips runtime issue reports when visible tile generation is the only remaining signal', () => {
    const issue = buildRuntimePerformanceIssueReport({
      source: 'game',
      route: '/',
      debugSnapshot: createDebugSnapshot({
        fps: 60,
        averageFps: 60,
        frameMs: 16.7,
        worstRecentFrameMs: 16.7,
        targetFps: 60,
        performanceTier: 'healthy',
        renderQualityLevel: 'full',
        renderQualityLimiters: '',
        reducedQualityDurationSec: 0,
        latestQualityChangeLimiter: undefined,
        latestQualityChangeSummary: undefined,
        drawCalls: 120,
        object3dCount: 900,
        visibleObjectCount: 300,
        maxChunkDrawCalls: 16,
        maxChunkObjectCount: 36,
        maxChunkMeshes: 16,
        maxChunkTriangleCount: 5000,
        materialCount: 12,
        textureCount: 10,
        visibleTriangleCount: 5000,
        visibleVertexCount: 10000,
        visibleMeshCount: 40,
        averageTileBuildMs: 4,
        maxTileBuildMs: 22,
        averageFullTileBuildMs: 5,
        maxFullTileBuildMs: 10,
        averageLowTileBuildMs: 3,
        maxLowTileBuildMs: 5,
        maxTilePluginBuildMs: 8,
        slowestTilePluginLabel: 'tile-forest',
        tileModelBudgetViolationsPerSecond: 0,
        tileModelBudgetViolationTopPluginLabel: undefined,
        tileModelBudgetViolationSummary: undefined,
        schedulerStarvationEventsPerSecond: 0,
        schedulerStarvationTopPluginLabel: undefined,
        schedulerStarvationSummary: undefined,
        fallbackBoxesPerSecond: 0,
        fallbackBoxTopPluginLabel: undefined,
        fallbackBoxSummary: undefined,
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

  it('treats matching issue summaries as the same issue hash even when other details differ', () => {
    const firstIssue = buildRuntimePerformanceIssueReport({
      source: 'game',
      route: '/',
      debugSnapshot: createDebugSnapshot({
        currentTilePlugin: 'tile-forest',
        maxTileBuildMs: 8,
        averageTileBuildMs: 4,
        tileModelBudgetViolationsPerSecond: 0,
        tileModelBudgetViolationTopPluginLabel: undefined,
        tileModelBudgetViolationSummary: undefined,
        schedulerStarvationEventsPerSecond: 0,
        schedulerStarvationTopPluginLabel: undefined,
        schedulerStarvationSummary: undefined,
        fallbackBoxesPerSecond: 0,
        fallbackBoxSummary: undefined,
        fallbackBoxTopPluginLabel: undefined,
        lastLodFailureReason: undefined,
        lastFallbackReason: 'Missing low-cost plains model.',
        resourceWarnings: [],
      }),
    });
    const secondIssue = buildRuntimePerformanceIssueReport({
      source: 'game',
      route: '/debug',
      debugSnapshot: createDebugSnapshot({
        currentTilePlugin: 'tile-route',
        drawCallTopPluginLabel: 'tile-route',
        drawCallSummary: 'tile-route dominates draw calls.',
        maxTileBuildMs: 8,
        averageTileBuildMs: 4,
        tileModelBudgetViolationsPerSecond: 0,
        tileModelBudgetViolationTopPluginLabel: undefined,
        tileModelBudgetViolationSummary: undefined,
        schedulerStarvationEventsPerSecond: 0,
        schedulerStarvationTopPluginLabel: undefined,
        schedulerStarvationSummary: undefined,
        fallbackBoxesPerSecond: 0,
        fallbackBoxSummary: undefined,
        fallbackBoxTopPluginLabel: undefined,
        lastLodFailureReason: undefined,
        lastFallbackReason: 'Missing low-cost plains model.',
        resourceWarnings: [],
      }),
    });

    expect(firstIssue).not.toBeNull();
    expect(secondIssue).not.toBeNull();
    expect(firstIssue?.summary).toBe(secondIssue?.summary);
    expect(firstIssue?.issueHash).toBe(secondIssue?.issueHash);
  });

  it('treats matching summary templates as the same issue hash when only measured values change', () => {
    const firstIssue = buildRuntimePerformanceIssueReport({
      source: 'game',
      route: '/',
      debugSnapshot: createDebugSnapshot({
        worstRecentFrameMs: 16.7,
        frameMs: 16.7,
        performanceTier: 'reduced',
        renderQualityLevel: 'reduced',
        renderQualityLimiters: '',
        maxTileBuildMs: 8,
        averageTileBuildMs: 4,
        tileModelBudgetViolationsPerSecond: 0,
        tileModelBudgetViolationTopPluginLabel: undefined,
        tileModelBudgetViolationSummary: undefined,
        schedulerStarvationEventsPerSecond: 0,
        schedulerStarvationTopPluginLabel: undefined,
        schedulerStarvationSummary: undefined,
        fallbackBoxesPerSecond: 0,
        fallbackBoxTopPluginLabel: undefined,
        fallbackBoxSummary: undefined,
        lastLodFailureReason: undefined,
        lastFallbackReason: undefined,
        resourceWarnings: [
          'LOD swaps are too frequent (5.0/s, top plugin tile-forest at 4.0/s).',
        ],
      }),
    });
    const secondIssue = buildRuntimePerformanceIssueReport({
      source: 'game',
      route: '/',
      debugSnapshot: createDebugSnapshot({
        worstRecentFrameMs: 16.7,
        frameMs: 16.7,
        performanceTier: 'reduced',
        renderQualityLevel: 'reduced',
        renderQualityLimiters: '',
        maxTileBuildMs: 8,
        averageTileBuildMs: 4,
        tileModelBudgetViolationsPerSecond: 0,
        tileModelBudgetViolationTopPluginLabel: undefined,
        tileModelBudgetViolationSummary: undefined,
        schedulerStarvationEventsPerSecond: 0,
        schedulerStarvationTopPluginLabel: undefined,
        schedulerStarvationSummary: undefined,
        fallbackBoxesPerSecond: 0,
        fallbackBoxTopPluginLabel: undefined,
        fallbackBoxSummary: undefined,
        lastLodFailureReason: undefined,
        lastFallbackReason: undefined,
        resourceWarnings: [
          'LOD swaps are too frequent (7.0/s, top plugin tile-forest at 6.0/s).',
        ],
      }),
    });

    expect(firstIssue?.summary).toBe(
      'LOD swaps are too frequent (5.0/s, top plugin tile-forest at 4.0/s).'
    );
    expect(secondIssue?.summary).toBe(
      'LOD swaps are too frequent (7.0/s, top plugin tile-forest at 6.0/s).'
    );
    expect(firstIssue?.issueHash).toBe(secondIssue?.issueHash);
  });
});
