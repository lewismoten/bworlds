import type {
  DebugSnapshot,
  PerformanceHistorySample,
} from './debug-panel.ts';
import type { GraphicsCapabilitiesSummary } from './graphics-capabilities.ts';
import type { LodThresholdSummary } from '@bworlds/render3d';

type ContentPackSummary = {
  id: string;
  name: string;
  version?: string;
};

type ContextSummary = {
  id: string;
  type?: string;
  label?: string;
  depth: number;
};

type PlayerSnapshot = {
  gridX: number;
  gridY: number;
  worldX: number;
  worldY: number;
  facing: number;
};

export type DebugSnapshotRecentEvent = {
  nowMs: number;
  type:
    | 'graphics-quality-changed'
    | 'lod-changed'
    | 'model-rejected'
    | 'plugin-exceeded-budget'
    | 'plugin-performance-warning';
  tileKey?: string;
  plugin?: string | null;
  summary?: string;
  fromDetailLevel?: string;
  toDetailLevel?: string;
  fromTargetFps?: 60 | 30;
  targetFps?: 60 | 30;
  fromVisibilityRadius?: number;
  visibilityRadius?: number;
  fromRenderQualityLevel?: string;
  renderQualityLevel?: string;
};

type DebugSnapshotExportOptions = {
  timestamp: Date;
  gameVersion: string;
  buildId?: string | null;
  worldSeed: string;
  context: ContextSummary;
  player: PlayerSnapshot;
  rendererMode: '2d' | '3d' | 'text';
  activeContentPacks: ContentPackSummary[];
  enabledPlugins: string[];
  graphicsQuality: {
    level: string;
    limiters: string;
    renderRadius: number;
    targetFps: 60 | 30;
    performanceTier: string;
  };
  device: {
    userAgent?: string | null;
    language?: string | null;
    platform?: string | null;
    hardwareConcurrency?: number | null;
    deviceMemoryGb?: number | null;
  };
  graphicsCapabilities: GraphicsCapabilitiesSummary;
  performanceBudget: {
    currentFrameMs: number;
    smoothedFrameMs: number;
    targetFps: 60 | 30;
    visibilityRadius: number;
    pendingBuildBudgetMs: number;
    maxPendingBuildTiles: number;
    caps: {
      frameMs: {
        soft: number;
        hard: number;
      };
      visibilityRadius: {
        full: number;
        reduced: number;
        minimum: number;
      };
      pendingBuildBudgetMs: {
        minimum: number;
        maximum: number;
      };
      pendingBuildTiles: {
        soft: number;
        hard: number;
      };
      drawCalls: {
        soft: number;
        hard: number;
      };
    };
  };
  lod: {
    thresholds: LodThresholdSummary;
  };
  recentEvents: DebugSnapshotRecentEvent[];
  snapshot: DebugSnapshot;
  history: PerformanceHistorySample[];
};

export type DebugSnapshotExport = {
  metadata: {
    timestamp: string;
    gameVersion: string;
    buildId: string | null;
    worldSeed: string;
    context: ContextSummary;
    player: PlayerSnapshot;
    rendererMode: '2d' | '3d' | 'text';
    activeContentPacks: ContentPackSummary[];
    enabledPlugins: string[];
    graphicsQuality: DebugSnapshotExportOptions['graphicsQuality'];
    device: DebugSnapshotExportOptions['device'];
    graphicsCapabilities: DebugSnapshotExportOptions['graphicsCapabilities'];
    performanceBudget: DebugSnapshotExportOptions['performanceBudget'];
  };
  summary: {
    currentFps: number;
    averageFps: number;
    minimumFps: number;
    averageFrameMs: number;
    p50FrameMs: number;
    p95FrameMs: number;
    p99FrameMs: number;
    worstRecentFrameMs: number;
    targetFrameMs: number;
    performanceTier: string;
    framesOver16_7Ms: number;
    framesOver33_3Ms: number;
    framesOver50Ms: number;
    cpuFrameMs: number;
  };
  rendering: {
    drawCalls: number;
    triangles: number;
    vertices: number;
    points: number;
    lines: number;
    renderWidth: number;
    renderHeight: number;
    devicePixelRatio: number;
    renderScale: number;
    visibleInstancedMeshCount: number;
    renderedInstanceCount: number;
    visibleMeshCount: number;
  };
  sceneGraph: {
    object3dCount: number;
    visibleObjectCount: number;
    invisibleObjectCount: number;
    groupCount: number;
    meshCount: number;
    instancedMeshCount: number;
    renderedInstanceCount: number;
    maxHierarchyDepth: number;
    averageHierarchyDepth: number;
    emptyGroupCount: number;
    oneChildGroupCount: number;
    matrixAutoUpdateCount: number;
    staticMatrixAutoUpdateCount: number;
    spriteCount: number;
    pointsCount: number;
    lineObjectCount: number;
    cameraCount: number;
    lightCount: number;
  };
  particles: {
    activeParticleSystems: number;
    activeParticles: number;
    maxParticlesDuringSamplingWindow: number;
  };
  shaderPrograms: {
    currentProgramCount: number;
  };
  lighting: {
    currentlyActiveLights: number;
    ambientLightCount: number;
    directionalLightCount: number;
    pointLightCount: number;
    spotLightCount: number;
    hemisphereLightCount: number;
    shadowCastingLights: number;
  };
  world: {
    currentMapId: string;
    currentMapType?: string;
    currentMapDepth: number;
    visibleTileCount: number;
    loadedTileCount: number;
    pendingTileBuildCount: number;
    tileBuildsPerSecond: number;
    averageTileBuildMs: number;
    worstTileBuildMs: number;
    tileKinds: string;
  };
  lod: {
    checksPerSecond: number;
    swapsPerSecond: number;
    thresholds: LodThresholdSummary;
  };
  budgetViolations: {
    hardLimitViolationsPerSecond: number;
    rejectedModelsPerSecond: number;
    topRejectedPlugin: string | null;
    rejectionSummary: string;
  };
  recentEvents: Array<
    Omit<DebugSnapshotRecentEvent, 'nowMs'> & {
      t: number;
    }
  >;
  resourceBudget: {
    currentUtilizationPct: number;
    highestUtilizationPctObserved: number;
    qualityReductionCauses: string[];
    pluginRequestsRejectedDueToBudget: Array<{
      plugin: string;
      rejectedModelsPerSecond: number;
    }>;
    modelsAutomaticallyLoweredToAnotherLodPerSecond: number;
    dynamicQualityChanges: Array<{
      t: number;
      targetFps: 60 | 30;
      visibilityRadius: number;
      renderQualityLevel: string;
    }>;
    limits: {
      frameMs: {
        current: number;
        soft: number;
        hard: number;
        status: 'ok' | 'warning' | 'critical';
      };
      visibilityRadius: {
        current: number;
        soft: number;
        hard: number;
        status: 'ok' | 'warning' | 'critical';
      };
      pendingBuildBudgetMs: {
        current: number;
        soft: number;
        hard: number;
        status: 'ok' | 'warning' | 'critical';
      };
      pendingBuildTiles: {
        current: number;
        soft: number;
        hard: number;
        status: 'ok' | 'warning' | 'critical';
      };
    };
  };
  resources: {
    totalMaterialReferences: number;
    uniqueMaterialCount: number;
    sharedMaterialCount: number;
    clonedMaterialCount: number;
    transparentMaterialCount: number;
    alphaTestMaterialCount: number;
    doubleSidedMaterialCount: number;
    fogMaterialCount: number;
    customShaderMaterialCount: number;
    materialTypes: string;
    materialsCreatedDuringSamplingWindow: number;
    materialsDisposedDuringSamplingWindow: number;
    peakMaterialCount: number;
    totalGeometryReferences: number;
    geometryCount: number;
    sharedGeometryCount: number;
    totalGeometryBytes: number;
    vertexBufferBytes: number;
    indexBufferBytes: number;
    averageVerticesPerGeometry: number;
    largestGeometryVertexCount: number;
    largestGeometryBytes: number;
    textureCount: number;
    textureMemoryEstimateMb: number;
    gpuGeometryCount: number;
  };
  textures: {
    textureCount: number;
    decodedTextureMemoryEstimateMb: number;
  };
  history: Array<{
    t: number;
    fps: number;
    frameMs: number;
    targetFps: 60 | 30;
    visibilityRadius: number;
    renderQualityLevel: string;
    drawCalls: number;
    triangles: number;
    objectCount: number;
    materialCount: number;
    geometryCount: number;
    heapUsedMb: number | null;
    tileBuildsPerSecond: number;
    lodReplacementsPerSecond: number;
    visibleTileCount: number;
    visibleTreeCount: number;
    activeLightCount: number;
    activeParticleSystemCount: number;
    activeParticleCount: number;
    generationQueueSize: number;
  }>;
};

export function buildDebugSnapshotExport(
  options: DebugSnapshotExportOptions
): DebugSnapshotExport {
  const latestHistoryTime =
    options.history[options.history.length - 1]?.nowMs ?? options.snapshot.frameMs;
  const frameSamples =
    options.history.length > 0
      ? options.history.map((sample) => sample.frameMs)
      : [options.snapshot.frameMs];
  const fpsSamples =
    options.history.length > 0
      ? options.history.map((sample) => sample.fps)
      : [options.snapshot.fps];
  const resourceBudgetSnapshot = buildResourceBudgetSnapshot(options);
  return {
    metadata: {
      timestamp: options.timestamp.toISOString(),
      gameVersion: options.gameVersion,
      buildId: options.buildId ?? null,
      worldSeed: options.worldSeed,
      context: options.context,
      player: options.player,
      rendererMode: options.rendererMode,
      activeContentPacks: options.activeContentPacks,
      enabledPlugins: [...options.enabledPlugins],
      graphicsQuality: options.graphicsQuality,
      device: options.device,
      graphicsCapabilities: options.graphicsCapabilities,
      performanceBudget: options.performanceBudget,
    },
    summary: {
      currentFps: options.snapshot.fps,
      averageFps: options.snapshot.averageFps,
      minimumFps: Math.min(...fpsSamples),
      averageFrameMs: roundTenths(getAverage(frameSamples)),
      p50FrameMs: roundTenths(getPercentile(frameSamples, 0.5)),
      p95FrameMs: roundTenths(getPercentile(frameSamples, 0.95)),
      p99FrameMs: roundTenths(getPercentile(frameSamples, 0.99)),
      worstRecentFrameMs: options.snapshot.worstRecentFrameMs,
      targetFrameMs: 1000 / options.snapshot.targetFps,
      performanceTier: options.snapshot.performanceTier,
      framesOver16_7Ms: countFramesOver(frameSamples, 16.7),
      framesOver33_3Ms: countFramesOver(frameSamples, 33.3),
      framesOver50Ms: countFramesOver(frameSamples, 50),
      cpuFrameMs: options.snapshot.frameMs,
    },
    rendering: {
      drawCalls: options.snapshot.drawCalls,
      triangles: options.snapshot.triangles,
      vertices: options.snapshot.vertexCount,
      points: options.snapshot.points,
      lines: options.snapshot.lines,
      renderWidth: options.snapshot.renderWidth ?? 0,
      renderHeight: options.snapshot.renderHeight ?? 0,
      devicePixelRatio: options.snapshot.devicePixelRatio ?? 0,
      renderScale: options.snapshot.renderScale ?? 0,
      visibleInstancedMeshCount: options.snapshot.visibleInstancedMeshCount ?? 0,
      renderedInstanceCount: options.snapshot.renderedInstanceCount ?? 0,
      visibleMeshCount: options.snapshot.visibleMeshCount,
    },
    sceneGraph: {
      object3dCount: options.snapshot.object3dCount,
      visibleObjectCount:
        options.snapshot.visibleObjectCount ??
        Math.max(
          0,
          options.snapshot.object3dCount - (options.snapshot.invisibleObjectCount ?? 0)
        ),
      invisibleObjectCount:
        options.snapshot.invisibleObjectCount ??
        Math.max(
          0,
          options.snapshot.object3dCount - (options.snapshot.visibleObjectCount ?? 0)
        ),
      groupCount: options.snapshot.groupCount,
      meshCount: options.snapshot.meshCount,
      instancedMeshCount: options.snapshot.instancedMeshCount ?? 0,
      renderedInstanceCount: options.snapshot.renderedInstanceCount ?? 0,
      maxHierarchyDepth: options.snapshot.maxHierarchyDepth ?? 0,
      averageHierarchyDepth: options.snapshot.averageHierarchyDepth ?? 0,
      emptyGroupCount: options.snapshot.emptyGroupCount ?? 0,
      oneChildGroupCount: options.snapshot.oneChildGroupCount ?? 0,
      matrixAutoUpdateCount: options.snapshot.matrixAutoUpdateCount ?? 0,
      staticMatrixAutoUpdateCount:
        options.snapshot.staticMatrixAutoUpdateCount ?? 0,
      spriteCount: options.snapshot.spriteCount,
      pointsCount: options.snapshot.pointsCount,
      lineObjectCount: options.snapshot.lineObjectCount ?? 0,
      cameraCount: options.snapshot.cameraCount ?? 0,
      lightCount: options.snapshot.lightCount,
    },
    resources: {
      totalMaterialReferences: options.snapshot.materialRefCount ?? 0,
      uniqueMaterialCount: options.snapshot.materialCount,
      sharedMaterialCount: options.snapshot.sharedMaterialCount ?? 0,
      clonedMaterialCount: options.snapshot.clonedMaterialCount ?? 0,
      transparentMaterialCount: options.snapshot.transparentMaterialCount ?? 0,
      alphaTestMaterialCount: options.snapshot.alphaTestMaterialCount ?? 0,
      doubleSidedMaterialCount:
        options.snapshot.doubleSidedMaterialCount ?? 0,
      fogMaterialCount: options.snapshot.fogMaterialCount ?? 0,
      customShaderMaterialCount:
        options.snapshot.customShaderMaterialCount ?? 0,
      materialTypes: options.snapshot.materialTypes ?? '',
      materialsCreatedDuringSamplingWindow:
        options.snapshot.materialsCreatedDuringSamplingWindow ?? 0,
      materialsDisposedDuringSamplingWindow:
        options.snapshot.materialsDisposedDuringSamplingWindow ?? 0,
      peakMaterialCount: options.snapshot.peakMaterialCount ?? 0,
      totalGeometryReferences: options.snapshot.geometryRefCount ?? 0,
      geometryCount: options.snapshot.geometryCount,
      sharedGeometryCount: options.snapshot.sharedGeometryCount ?? 0,
      totalGeometryBytes: options.snapshot.geometryBytes ?? 0,
      vertexBufferBytes: options.snapshot.vertexBufferBytes ?? 0,
      indexBufferBytes: options.snapshot.indexBufferBytes ?? 0,
      averageVerticesPerGeometry:
        options.snapshot.averageVerticesPerGeometry ?? 0,
      largestGeometryVertexCount:
        options.snapshot.largestGeometryVertexCount ?? 0,
      largestGeometryBytes: options.snapshot.largestGeometryBytes ?? 0,
      textureCount: options.snapshot.textureCount,
      textureMemoryEstimateMb: options.snapshot.textureMemoryEstimateMb,
      gpuGeometryCount:
        options.snapshot.gpuGeometryCount ?? options.snapshot.geometryMemoryCount,
    },
    textures: {
      textureCount: options.snapshot.textureCount,
      decodedTextureMemoryEstimateMb: options.snapshot.textureMemoryEstimateMb,
    },
    particles: {
      activeParticleSystems:
        options.snapshot.activeParticleSystemCount ?? options.snapshot.pointsCount,
      activeParticles: options.snapshot.activeParticleCount,
      maxParticlesDuringSamplingWindow: Math.max(
        options.snapshot.activeParticleCount,
        ...options.history.map((sample) => sample.activeParticleCount ?? 0)
      ),
    },
    shaderPrograms: {
      currentProgramCount: options.snapshot.programCount,
    },
    lighting: {
      currentlyActiveLights: options.snapshot.lightCount,
      ambientLightCount: options.snapshot.ambientLightCount ?? 0,
      directionalLightCount: options.snapshot.directionalLightCount ?? 0,
      pointLightCount: options.snapshot.pointLightCount ?? 0,
      spotLightCount: options.snapshot.spotLightCount ?? 0,
      hemisphereLightCount: options.snapshot.hemisphereLightCount ?? 0,
      shadowCastingLights: options.snapshot.shadowLightCount,
    },
    world: {
      currentMapId: options.context.id,
      currentMapType: options.context.type,
      currentMapDepth: options.context.depth,
      visibleTileCount: options.snapshot.visibleTileCount,
      loadedTileCount: options.snapshot.loadedChunkCount,
      pendingTileBuildCount: options.snapshot.pendingTileCount,
      tileBuildsPerSecond: options.snapshot.tileBuildsPerSecond,
      averageTileBuildMs: options.snapshot.averageTileBuildMs,
      worstTileBuildMs: options.snapshot.maxTileBuildMs,
      tileKinds: options.snapshot.visibleTileKindSummary,
    },
    lod: {
      checksPerSecond: options.snapshot.lodChecksPerSecond,
      swapsPerSecond: options.snapshot.lodReplacementsPerSecond,
      thresholds: options.lod.thresholds,
    },
    budgetViolations: {
      hardLimitViolationsPerSecond:
        options.snapshot.tileModelBudgetViolationsPerSecond ?? 0,
      rejectedModelsPerSecond:
        options.snapshot.tileModelBudgetViolationsPerSecond ?? 0,
      topRejectedPlugin:
        options.snapshot.tileModelBudgetViolationTopPluginLabel?.trim() || null,
      rejectionSummary: options.snapshot.tileModelBudgetViolationSummary ?? '',
    },
    recentEvents: options.recentEvents.map(({ nowMs, ...event }) => ({
      ...event,
      t: roundTenths((nowMs - latestHistoryTime) / 1000),
    })),
    resourceBudget: resourceBudgetSnapshot,
    history: options.history.map((sample) => ({
      t: roundTenths((sample.nowMs - latestHistoryTime) / 1000),
      fps: sample.fps,
      frameMs: sample.frameMs,
      targetFps: sample.targetFps,
      visibilityRadius: sample.visibilityRadius,
      renderQualityLevel: sample.renderQualityLevel,
      drawCalls: sample.drawCalls,
      triangles: sample.triangles,
      objectCount: sample.objectCount,
      materialCount: sample.materialCount,
      geometryCount: sample.geometryCount,
      heapUsedMb: sample.heapUsedMb,
      tileBuildsPerSecond: sample.tileBuildsPerSecond,
      lodReplacementsPerSecond: sample.lodReplacementsPerSecond,
      visibleTileCount: sample.visibleTileCount,
      visibleTreeCount: sample.visibleTreeCount,
      activeLightCount: sample.activeLightCount,
      activeParticleSystemCount: sample.activeParticleSystemCount ?? 0,
      activeParticleCount: sample.activeParticleCount ?? 0,
      generationQueueSize: sample.generationQueueSize,
    })),
  };
}

export function formatDebugSnapshotFilename(timestamp: Date): string {
  const year = timestamp.getUTCFullYear().toString().padStart(4, '0');
  const month = (timestamp.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = timestamp.getUTCDate().toString().padStart(2, '0');
  const hours = timestamp.getUTCHours().toString().padStart(2, '0');
  const minutes = timestamp.getUTCMinutes().toString().padStart(2, '0');
  const seconds = timestamp.getUTCSeconds().toString().padStart(2, '0');
  return `bworlds-debug-${year}${month}${day}-${hours}${minutes}${seconds}.json`;
}

function buildResourceBudgetSnapshot(
  options: DebugSnapshotExportOptions
): DebugSnapshotExport['resourceBudget'] {
  const frameCurrentUtilizationPct = getIncreasingMetricUtilizationPct(
    options.snapshot.frameMs,
    options.performanceBudget.caps.frameMs.hard
  );
  const framePeakUtilizationPct = Math.max(
    frameCurrentUtilizationPct,
    ...options.history.map((sample) =>
      getIncreasingMetricUtilizationPct(
        sample.frameMs,
        options.performanceBudget.caps.frameMs.hard
      )
    )
  );
  const visibilityCurrentUtilizationPct = getDecreasingMetricUtilizationPct(
    options.performanceBudget.visibilityRadius,
    options.performanceBudget.caps.visibilityRadius.full,
    options.performanceBudget.caps.visibilityRadius.minimum
  );
  const pendingBuildBudgetCurrentUtilizationPct = getDecreasingMetricUtilizationPct(
    options.performanceBudget.pendingBuildBudgetMs,
    options.performanceBudget.caps.pendingBuildBudgetMs.maximum,
    options.performanceBudget.caps.pendingBuildBudgetMs.minimum
  );
  const pendingBuildTilesCurrentUtilizationPct = getDecreasingMetricUtilizationPct(
    options.performanceBudget.maxPendingBuildTiles,
    options.performanceBudget.caps.pendingBuildTiles.soft,
    options.performanceBudget.caps.pendingBuildTiles.hard
  );
  const currentUtilizationPct = Math.max(
    frameCurrentUtilizationPct,
    visibilityCurrentUtilizationPct,
    pendingBuildBudgetCurrentUtilizationPct,
    pendingBuildTilesCurrentUtilizationPct
  );

  return {
    currentUtilizationPct: roundTenths(currentUtilizationPct),
    highestUtilizationPctObserved: roundTenths(
      Math.max(
        framePeakUtilizationPct,
        visibilityCurrentUtilizationPct,
        pendingBuildBudgetCurrentUtilizationPct,
        pendingBuildTilesCurrentUtilizationPct
      )
    ),
    qualityReductionCauses: parseQualityLimiterList(options.graphicsQuality.limiters),
    pluginRequestsRejectedDueToBudget: parseRejectedPluginSummary(
      options.snapshot.tileModelBudgetViolationSummary
    ),
    modelsAutomaticallyLoweredToAnotherLodPerSecond:
      options.snapshot.lodReplacementsPerSecond,
    dynamicQualityChanges: collectDynamicQualityChanges(options.history),
    limits: {
      frameMs: {
        current: options.snapshot.frameMs,
        soft: options.performanceBudget.caps.frameMs.soft,
        hard: options.performanceBudget.caps.frameMs.hard,
        status: getIncreasingMetricStatus(
          options.snapshot.frameMs,
          options.performanceBudget.caps.frameMs.soft,
          options.performanceBudget.caps.frameMs.hard
        ),
      },
      visibilityRadius: {
        current: options.performanceBudget.visibilityRadius,
        soft: options.performanceBudget.caps.visibilityRadius.reduced,
        hard: options.performanceBudget.caps.visibilityRadius.minimum,
        status: getDecreasingMetricStatus(
          options.performanceBudget.visibilityRadius,
          options.performanceBudget.caps.visibilityRadius.full,
          options.performanceBudget.caps.visibilityRadius.minimum
        ),
      },
      pendingBuildBudgetMs: {
        current: options.performanceBudget.pendingBuildBudgetMs,
        soft: options.performanceBudget.caps.pendingBuildBudgetMs.maximum,
        hard: options.performanceBudget.caps.pendingBuildBudgetMs.minimum,
        status: getDecreasingMetricStatus(
          options.performanceBudget.pendingBuildBudgetMs,
          options.performanceBudget.caps.pendingBuildBudgetMs.maximum,
          options.performanceBudget.caps.pendingBuildBudgetMs.minimum
        ),
      },
      pendingBuildTiles: {
        current: options.performanceBudget.maxPendingBuildTiles,
        soft: options.performanceBudget.caps.pendingBuildTiles.soft,
        hard: options.performanceBudget.caps.pendingBuildTiles.hard,
        status: getDecreasingMetricStatus(
          options.performanceBudget.maxPendingBuildTiles,
          options.performanceBudget.caps.pendingBuildTiles.soft,
          options.performanceBudget.caps.pendingBuildTiles.hard
        ),
      },
    },
  };
}

function getIncreasingMetricUtilizationPct(current: number, hardLimit: number): number {
  if (hardLimit <= 0) {
    return 0;
  }
  return (current / hardLimit) * 100;
}

function getDecreasingMetricUtilizationPct(
  current: number,
  fullValue: number,
  hardLimit: number
): number {
  if (fullValue <= hardLimit) {
    return 0;
  }
  return ((fullValue - current) / (fullValue - hardLimit)) * 100;
}

function getIncreasingMetricStatus(
  current: number,
  softLimit: number,
  hardLimit: number
): 'ok' | 'warning' | 'critical' {
  if (current >= hardLimit) {
    return 'critical';
  }
  if (current >= softLimit) {
    return 'warning';
  }
  return 'ok';
}

function getDecreasingMetricStatus(
  current: number,
  fullValue: number,
  hardLimit: number
): 'ok' | 'warning' | 'critical' {
  if (current <= hardLimit) {
    return 'critical';
  }
  if (current < fullValue) {
    return 'warning';
  }
  return 'ok';
}

function parseQualityLimiterList(limiters: string): string[] {
  return limiters
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry !== 'None');
}

function parseRejectedPluginSummary(
  summary: string | undefined
): Array<{
  plugin: string;
  rejectedModelsPerSecond: number;
}> {
  if (!summary) {
    return [];
  }

  return summary
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const separatorIndex = entry.lastIndexOf(':');
      if (separatorIndex <= 0 || separatorIndex >= entry.length - 1) {
        return null;
      }
      const plugin = entry.slice(0, separatorIndex).trim();
      const rejectedModelsPerSecond = Number(entry.slice(separatorIndex + 1).trim());
      if (!plugin || !Number.isFinite(rejectedModelsPerSecond)) {
        return null;
      }
      return {
        plugin,
        rejectedModelsPerSecond,
      };
    })
    .filter((entry): entry is { plugin: string; rejectedModelsPerSecond: number } => entry !== null);
}

function collectDynamicQualityChanges(
  history: PerformanceHistorySample[]
): Array<{
  t: number;
  targetFps: 60 | 30;
  visibilityRadius: number;
  renderQualityLevel: string;
}> {
  if (history.length === 0) {
    return [];
  }

  const latestHistoryTime = history[history.length - 1]?.nowMs ?? 0;
  const changes: Array<{
    t: number;
    targetFps: 60 | 30;
    visibilityRadius: number;
    renderQualityLevel: string;
  }> = [];
  let previousKey = '';

  for (const sample of history) {
    const key = `${sample.targetFps}|${sample.visibilityRadius}|${sample.renderQualityLevel}`;
    if (key === previousKey) {
      continue;
    }
    previousKey = key;
    changes.push({
      t: roundTenths((sample.nowMs - latestHistoryTime) / 1000),
      targetFps: sample.targetFps,
      visibilityRadius: sample.visibilityRadius,
      renderQualityLevel: sample.renderQualityLevel,
    });
  }

  return changes;
}

function roundTenths(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function getAverage(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / Math.max(1, values.length);
}

function getPercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(
    0,
    Math.min(sorted.length - 1, Math.ceil(percentile * sorted.length) - 1)
  );
  return sorted[index] ?? 0;
}

function countFramesOver(values: number[], threshold: number): number {
  return values.filter((value) => value > threshold).length;
}
