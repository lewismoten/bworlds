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
  particles: {
    activeParticleSystems: number;
    activeParticles: number;
    maxParticlesDuringSamplingWindow: number;
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
    particles: {
      activeParticleSystems:
        options.snapshot.activeParticleSystemCount ?? options.snapshot.pointsCount,
      activeParticles: options.snapshot.activeParticleCount,
      maxParticlesDuringSamplingWindow: Math.max(
        options.snapshot.activeParticleCount,
        ...options.history.map((sample) => sample.activeParticleCount ?? 0)
      ),
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

function roundTenths(value: number): number {
  return Math.round(value * 10) / 10;
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
