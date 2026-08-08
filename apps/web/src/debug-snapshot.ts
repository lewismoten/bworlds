import type {
  DebugSnapshot,
  PerformanceHistorySample,
} from './debug-panel.ts';

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
  performanceBudget: {
    currentFrameMs: number;
    smoothedFrameMs: number;
    targetFps: 60 | 30;
    visibilityRadius: number;
    pendingBuildBudgetMs: number;
    maxPendingBuildTiles: number;
  };
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
    performanceBudget: DebugSnapshotExportOptions['performanceBudget'];
  };
  summary: {
    currentFps: number;
    averageFps: number;
    worstRecentFrameMs: number;
    targetFrameMs: number;
    performanceTier: string;
    cpuFrameMs: number;
  };
  rendering: {
    drawCalls: number;
    triangles: number;
    vertices: number;
    points: number;
    lines: number;
    visibleMeshCount: number;
  };
  sceneGraph: {
    object3dCount: number;
    groupCount: number;
    meshCount: number;
    spriteCount: number;
    pointsCount: number;
    lightCount: number;
  };
  resources: {
    uniqueMaterialCount: number;
    geometryCount: number;
    textureCount: number;
    textureMemoryEstimateMb: number;
    geometryMemoryCount: number;
  };
  history: Array<{
    t: number;
    fps: number;
    frameMs: number;
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
    generationQueueSize: number;
  }>;
};

export function buildDebugSnapshotExport(
  options: DebugSnapshotExportOptions
): DebugSnapshotExport {
  const latestHistoryTime =
    options.history[options.history.length - 1]?.nowMs ?? options.snapshot.frameMs;
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
      performanceBudget: options.performanceBudget,
    },
    summary: {
      currentFps: options.snapshot.fps,
      averageFps: options.snapshot.averageFps,
      worstRecentFrameMs: options.snapshot.worstRecentFrameMs,
      targetFrameMs: 1000 / options.snapshot.targetFps,
      performanceTier: options.snapshot.performanceTier,
      cpuFrameMs: options.snapshot.frameMs,
    },
    rendering: {
      drawCalls: options.snapshot.drawCalls,
      triangles: options.snapshot.triangles,
      vertices: options.snapshot.vertexCount,
      points: options.snapshot.points,
      lines: options.snapshot.lines,
      visibleMeshCount: options.snapshot.visibleMeshCount,
    },
    sceneGraph: {
      object3dCount: options.snapshot.object3dCount,
      groupCount: options.snapshot.groupCount,
      meshCount: options.snapshot.meshCount,
      spriteCount: options.snapshot.spriteCount,
      pointsCount: options.snapshot.pointsCount,
      lightCount: options.snapshot.lightCount,
    },
    resources: {
      uniqueMaterialCount: options.snapshot.materialCount,
      geometryCount: options.snapshot.geometryCount,
      textureCount: options.snapshot.textureCount,
      textureMemoryEstimateMb: options.snapshot.textureMemoryEstimateMb,
      geometryMemoryCount: options.snapshot.geometryMemoryCount,
    },
    history: options.history.map((sample) => ({
      t: roundTenths((sample.nowMs - latestHistoryTime) / 1000),
      fps: sample.fps,
      frameMs: sample.frameMs,
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

function roundTenths(value: number): number {
  return Math.round(value * 10) / 10;
}
