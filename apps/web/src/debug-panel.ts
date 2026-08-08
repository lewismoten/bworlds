export type DebugSnapshot = {
  fps: number;
  frameMs: number;
  targetFps: 60 | 30;
  performanceTier: 'healthy' | 'reduced' | 'critical';
  playerLevel: number;
  visibilityRadius: number;
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  sceneChildCount: number;
  visibleTileCount: number;
  visibleTreeCount: number;
  pendingTileCount: number;
  averagePendingFlushTiles: number;
  maxPendingFlushTiles: number;
  averageTileBuildMs: number;
  maxTileBuildMs: number;
  tileNodeBuildsPerSecond: number;
  tileBuildsPerSecond: number;
  lodChecksPerSecond: number;
  lodReplacementsPerSecond: number;
  object3dCount: number;
  groupCount: number;
  meshCount: number;
  pointsCount: number;
  spriteCount: number;
  lightCount: number;
  materialCount: number;
  geometryCount: number;
  geometryMemoryCount: number;
  treeObjectCount: number;
  treeMeshCount: number;
  treeMaterialRefCount: number;
  visibleTileKindSummary: string;
  textureCount: number;
  programCount: number;
  latitude: number;
  longitude: number;
  gridX: number;
  gridY: number;
  worldSeed: string;
  heapUsedMb: number | null;
  heapLimitMb: number | null;
  resourceWarnings: string[];
};

export type MaterialGrowthSample = {
  nowMs: number;
  materialCount: number;
  playerX: number;
  playerY: number;
};

export type RendererChurnSample = {
  nowMs: number;
  tileNodeBuildsPerSecond: number;
  playerX: number;
  playerY: number;
};

export type HeapUsageSample = {
  nowMs: number;
  heapUsedMb: number;
};

export function normalizeWorldSeed(seed: string | undefined, fallback: string): string {
  const trimmed = seed?.trim();
  return trimmed ? trimmed : fallback;
}

export function getDebugSignature(snapshot: DebugSnapshot): string {
  return [
    snapshot.fps.toFixed(1),
    snapshot.frameMs.toFixed(1),
    snapshot.targetFps,
    snapshot.performanceTier,
    snapshot.playerLevel,
    snapshot.visibilityRadius,
    snapshot.drawCalls,
    snapshot.triangles,
    snapshot.points,
    snapshot.lines,
    snapshot.sceneChildCount,
    snapshot.visibleTileCount,
    snapshot.visibleTreeCount,
    snapshot.pendingTileCount,
    snapshot.averagePendingFlushTiles.toFixed(2),
    snapshot.maxPendingFlushTiles.toFixed(0),
    snapshot.averageTileBuildMs.toFixed(2),
    snapshot.maxTileBuildMs.toFixed(2),
    snapshot.tileNodeBuildsPerSecond,
    snapshot.tileBuildsPerSecond,
    snapshot.lodChecksPerSecond,
    snapshot.lodReplacementsPerSecond,
    snapshot.object3dCount,
    snapshot.groupCount,
    snapshot.meshCount,
    snapshot.pointsCount,
    snapshot.spriteCount,
    snapshot.lightCount,
    snapshot.materialCount,
    snapshot.geometryCount,
    snapshot.geometryMemoryCount,
    snapshot.treeObjectCount,
    snapshot.treeMeshCount,
    snapshot.treeMaterialRefCount,
    snapshot.visibleTileKindSummary,
    snapshot.textureCount,
    snapshot.programCount,
    snapshot.latitude.toFixed(4),
    snapshot.longitude.toFixed(4),
    snapshot.gridX,
    snapshot.gridY,
    snapshot.worldSeed,
    snapshot.heapUsedMb?.toFixed(1) ?? 'na',
    snapshot.heapLimitMb?.toFixed(1) ?? 'na',
    snapshot.resourceWarnings.join('|') || 'none',
  ].join('|');
}

export function getTargetFrameMs(targetFps: 60 | 30): number {
  return 1000 / targetFps;
}

export function resolvePerformanceTier(
  frameMs: number
): DebugSnapshot['performanceTier'] {
  if (frameMs >= 1000 / 28) {
    return 'critical';
  }
  if (frameMs >= 1000 / 42) {
    return 'reduced';
  }
  return 'healthy';
}

export function formatPerformanceTierLabel(
  performanceTier: DebugSnapshot['performanceTier']
): string {
  if (performanceTier === 'critical') {
    return 'Critical';
  }
  if (performanceTier === 'reduced') {
    return 'Reduced';
  }
  return 'Healthy';
}

export function buildDebugMarkup(snapshot: DebugSnapshot): string {
  const heapLabel =
    snapshot.heapUsedMb === null
      ? 'Unavailable'
      : `${snapshot.heapUsedMb.toFixed(1)} / ${(snapshot.heapLimitMb ?? 0).toFixed(1)} MB`;
  const targetFrameMs = getTargetFrameMs(snapshot.targetFps);
  const objectsPerVisibleTile =
    snapshot.visibleTileCount > 0
      ? (snapshot.object3dCount / snapshot.visibleTileCount).toFixed(1)
      : '0.0';
  const meshesPerVisibleTree =
    snapshot.visibleTreeCount > 0
      ? (snapshot.treeMeshCount / snapshot.visibleTreeCount).toFixed(1)
      : '0.0';
  const objectsPerVisibleTree =
    snapshot.visibleTreeCount > 0
      ? (snapshot.treeObjectCount / snapshot.visibleTreeCount).toFixed(1)
      : '0.0';
  const materialsPerVisibleTree =
    snapshot.visibleTreeCount > 0
      ? (snapshot.treeMaterialRefCount / snapshot.visibleTreeCount).toFixed(1)
      : '0.0';
  const warningMarkup = snapshot.resourceWarnings.length > 0
    ? `<div><dt>Warnings</dt><dd>${snapshot.resourceWarnings.join(' | ')}</dd></div>`
    : '';
  return `
    <div><dt>FPS</dt><dd>${snapshot.fps.toFixed(1)}</dd></div>
    <div><dt>CPU Frame</dt><dd>${snapshot.frameMs.toFixed(1)} ms</dd></div>
    <div><dt>Frame Target</dt><dd>${snapshot.targetFps} FPS / ${targetFrameMs.toFixed(1)} ms</dd></div>
    <div><dt>Perf Tier</dt><dd>${formatPerformanceTierLabel(snapshot.performanceTier)}</dd></div>
    <div><dt>Level</dt><dd>${snapshot.playerLevel}</dd></div>
    <div><dt>Render Radius</dt><dd>${snapshot.visibilityRadius}</dd></div>
    <div><dt>GPU Draws</dt><dd>${snapshot.drawCalls}</dd></div>
    <div><dt>GPU Tris</dt><dd>${snapshot.triangles}</dd></div>
    <div><dt>GPU Points</dt><dd>${snapshot.points}</dd></div>
    <div><dt>GPU Lines</dt><dd>${snapshot.lines}</dd></div>
    <div><dt>Scene Roots</dt><dd>${snapshot.sceneChildCount}</dd></div>
    <div><dt>Visible Tiles</dt><dd>${snapshot.visibleTileCount}</dd></div>
    <div><dt>Visible Trees</dt><dd>${snapshot.visibleTreeCount}</dd></div>
    <div><dt>Pending Tiles</dt><dd>${snapshot.pendingTileCount}</dd></div>
    <div><dt>Avg Flush Tiles</dt><dd>${snapshot.averagePendingFlushTiles.toFixed(2)}</dd></div>
    <div><dt>Max Flush Tiles</dt><dd>${snapshot.maxPendingFlushTiles}</dd></div>
    <div><dt>Avg Tile Build</dt><dd>${snapshot.averageTileBuildMs.toFixed(2)} ms</dd></div>
    <div><dt>Max Tile Build</dt><dd>${snapshot.maxTileBuildMs.toFixed(2)} ms</dd></div>
    <div><dt>Tile Nodes/s</dt><dd>${snapshot.tileNodeBuildsPerSecond}</dd></div>
    <div><dt>Tile Builds/s</dt><dd>${snapshot.tileBuildsPerSecond}</dd></div>
    <div><dt>LOD Checks/s</dt><dd>${snapshot.lodChecksPerSecond}</dd></div>
    <div><dt>LOD Swaps/s</dt><dd>${snapshot.lodReplacementsPerSecond}</dd></div>
    <div><dt>Objects</dt><dd>${snapshot.object3dCount}</dd></div>
    <div><dt>Objects / Tile</dt><dd>${objectsPerVisibleTile}</dd></div>
    <div><dt>Groups</dt><dd>${snapshot.groupCount}</dd></div>
    <div><dt>Meshes</dt><dd>${snapshot.meshCount}</dd></div>
    <div><dt>Points Nodes</dt><dd>${snapshot.pointsCount}</dd></div>
    <div><dt>Sprites</dt><dd>${snapshot.spriteCount}</dd></div>
    <div><dt>Lights</dt><dd>${snapshot.lightCount}</dd></div>
    <div><dt>Objects / Tree</dt><dd>${objectsPerVisibleTree}</dd></div>
    <div><dt>Meshes / Tree</dt><dd>${meshesPerVisibleTree}</dd></div>
    <div><dt>Materials</dt><dd>${snapshot.materialCount}</dd></div>
    <div><dt>Materials / Tree</dt><dd>${materialsPerVisibleTree}</dd></div>
    <div><dt>Tile Kinds</dt><dd>${snapshot.visibleTileKindSummary || 'None'}</dd></div>
    <div><dt>Geometries</dt><dd>${snapshot.geometryCount}</dd></div>
    <div><dt>GPU Geometries</dt><dd>${snapshot.geometryMemoryCount}</dd></div>
    <div><dt>Textures</dt><dd>${snapshot.textureCount}</dd></div>
    <div><dt>Programs</dt><dd>${snapshot.programCount}</dd></div>
    <div><dt>Heap</dt><dd>${heapLabel}</dd></div>
    ${warningMarkup}
    <div><dt>GPS</dt><dd>${snapshot.latitude.toFixed(4)}, ${snapshot.longitude.toFixed(4)}</dd></div>
    <div><dt>Grid</dt><dd>${snapshot.gridX}, ${snapshot.gridY}</dd></div>
    <div><dt>Seed</dt><dd>${snapshot.worldSeed}</dd></div>
  `;
}

function recordRollingSample<T extends { nowMs: number }>(
  samples: T[],
  sample: T,
  {
    sampleIntervalMs,
    historyWindowMs,
  }: {
    sampleIntervalMs: number;
    historyWindowMs: number;
  }
): void {
  const lastSample = samples[samples.length - 1];
  if (!lastSample || sample.nowMs - lastSample.nowMs >= sampleIntervalMs) {
    samples.push(sample);
  } else {
    samples[samples.length - 1] = sample;
  }

  const minimumTime = sample.nowMs - historyWindowMs;
  let removeCount = 0;
  while (removeCount < samples.length && samples[removeCount].nowMs < minimumTime) {
    removeCount += 1;
  }
  if (removeCount > 0) {
    samples.splice(0, removeCount);
  }
}

export function recordMaterialGrowthSample(
  samples: MaterialGrowthSample[],
  sample: MaterialGrowthSample,
  {
    sampleIntervalMs = 500,
    historyWindowMs = 8000,
  }: {
    sampleIntervalMs?: number;
    historyWindowMs?: number;
  } = {}
): void {
  recordRollingSample(samples, sample, {
    sampleIntervalMs,
    historyWindowMs,
  });
}

export function recordRendererChurnSample(
  samples: RendererChurnSample[],
  sample: RendererChurnSample,
  {
    sampleIntervalMs = 500,
    historyWindowMs = 8000,
  }: {
    sampleIntervalMs?: number;
    historyWindowMs?: number;
  } = {}
): void {
  recordRollingSample(samples, sample, {
    sampleIntervalMs,
    historyWindowMs,
  });
}

export function recordHeapUsageSample(
  samples: HeapUsageSample[],
  sample: HeapUsageSample,
  {
    sampleIntervalMs = 1000,
    historyWindowMs = 12000,
  }: {
    sampleIntervalMs?: number;
    historyWindowMs?: number;
  } = {}
): void {
  recordRollingSample(samples, sample, {
    sampleIntervalMs,
    historyWindowMs,
  });
}

export function getMaterialGrowthWarning(
  samples: MaterialGrowthSample[],
  {
    minimumSampleCount = 4,
    minimumMaterialIncrease = 12,
    minimumWalkDistance = 3,
  }: {
    minimumSampleCount?: number;
    minimumMaterialIncrease?: number;
    minimumWalkDistance?: number;
  } = {}
): string | null {
  if (samples.length < minimumSampleCount) {
    return null;
  }

  const recentSamples = samples.slice(-minimumSampleCount);
  const firstSample = recentSamples[0];
  const lastSample = recentSamples[recentSamples.length - 1];
  if (!firstSample || !lastSample) {
    return null;
  }

  const walkedDistance = Math.hypot(
    lastSample.playerX - firstSample.playerX,
    lastSample.playerY - firstSample.playerY
  );
  if (walkedDistance < minimumWalkDistance) {
    return null;
  }

  const materialIncrease = lastSample.materialCount - firstSample.materialCount;
  if (materialIncrease < minimumMaterialIncrease) {
    return null;
  }

  for (let index = 1; index < recentSamples.length; index += 1) {
    if (recentSamples[index]!.materialCount <= recentSamples[index - 1]!.materialCount) {
      return null;
    }
  }

  return `Material count keeps climbing while moving (${firstSample.materialCount} -> ${lastSample.materialCount}).`;
}

export function getSceneBudgetWarnings(
  snapshot: Pick<DebugSnapshot, 'visibleTileCount' | 'visibleTreeCount' | 'object3dCount' | 'treeObjectCount'>,
  {
    maxObjectsPerVisibleTile = 18,
    maxObjectsPerTree = 7,
  }: {
    maxObjectsPerVisibleTile?: number;
    maxObjectsPerTree?: number;
  } = {}
): string[] {
  const warnings: string[] = [];
  const objectsPerVisibleTile =
    snapshot.visibleTileCount > 0 ? snapshot.object3dCount / snapshot.visibleTileCount : 0;
  const objectsPerTree =
    snapshot.visibleTreeCount > 0 ? snapshot.treeObjectCount / snapshot.visibleTreeCount : 0;

  if (objectsPerVisibleTile > maxObjectsPerVisibleTile) {
    warnings.push(
      `Objects per visible tile is high (${objectsPerVisibleTile.toFixed(1)} > ${maxObjectsPerVisibleTile}).`
    );
  }
  if (objectsPerTree > maxObjectsPerTree) {
    warnings.push(
      `Objects per tree is high (${objectsPerTree.toFixed(1)} > ${maxObjectsPerTree}).`
    );
  }

  return warnings;
}

export function getPerformanceWarnings(
  snapshot: Pick<
    DebugSnapshot,
    'frameMs' | 'targetFps' | 'drawCalls' | 'triangles' | 'object3dCount' | 'programCount'
  >,
  {
    maxFrameMs = 50,
    maxDrawCallsAt60Fps = 900,
    maxDrawCallsAt30Fps = 1200,
    maxTrianglesAt60Fps = 450000,
    maxTrianglesAt30Fps = 700000,
    maxObject3dCount = 2400,
    maxProgramCount = 48,
  }: {
    maxFrameMs?: number;
    maxDrawCallsAt60Fps?: number;
    maxDrawCallsAt30Fps?: number;
    maxTrianglesAt60Fps?: number;
    maxTrianglesAt30Fps?: number;
    maxObject3dCount?: number;
    maxProgramCount?: number;
  } = {}
): string[] {
  const warnings: string[] = [];
  const drawCallBudget =
    snapshot.targetFps === 60 ? maxDrawCallsAt60Fps : maxDrawCallsAt30Fps;
  const triangleBudget =
    snapshot.targetFps === 60 ? maxTrianglesAt60Fps : maxTrianglesAt30Fps;

  if (snapshot.frameMs > maxFrameMs) {
    warnings.push(
      `Frame time is over budget (${snapshot.frameMs.toFixed(1)} ms > ${maxFrameMs.toFixed(1)} ms).`
    );
  }

  if (snapshot.drawCalls > drawCallBudget) {
    warnings.push(
      `Draw calls exceed the target (${snapshot.drawCalls} > ${drawCallBudget}).`
    );
  }

  if (snapshot.triangles > triangleBudget) {
    warnings.push(
      `Triangle count is high (${snapshot.triangles} > ${triangleBudget}).`
    );
  }

  if (snapshot.object3dCount > maxObject3dCount) {
    warnings.push(
      `Three.js object count is high (${snapshot.object3dCount} > ${maxObject3dCount}).`
    );
  }

  if (snapshot.programCount > maxProgramCount) {
    warnings.push(
      `Shader program count is high (${snapshot.programCount} > ${maxProgramCount}).`
    );
  }

  return warnings;
}

export function getWorkQueueWarnings(
  snapshot: Pick<DebugSnapshot, 'pendingTileCount' | 'averagePendingFlushTiles' | 'maxPendingFlushTiles'>,
  {
    maxPendingTileCount = 48,
    minimumAverageFlushTiles = 1,
  }: {
    maxPendingTileCount?: number;
    minimumAverageFlushTiles?: number;
  } = {}
): string[] {
  if (
    snapshot.pendingTileCount <= maxPendingTileCount ||
    snapshot.averagePendingFlushTiles < minimumAverageFlushTiles
  ) {
    return [];
  }

  return [
    `Pending tile queue is backing up (${snapshot.pendingTileCount} queued, avg flush ${snapshot.averagePendingFlushTiles.toFixed(1)}, max flush ${snapshot.maxPendingFlushTiles}).`,
  ];
}

export function getHeapGrowthWarning(
  samples: HeapUsageSample[],
  {
    minimumSampleCount = 4,
    minimumHeapIncreaseMb = 24,
  }: {
    minimumSampleCount?: number;
    minimumHeapIncreaseMb?: number;
  } = {}
): string | null {
  if (samples.length < minimumSampleCount) {
    return null;
  }

  const recentSamples = samples.slice(-minimumSampleCount);
  const firstSample = recentSamples[0];
  const lastSample = recentSamples[recentSamples.length - 1];
  if (!firstSample || !lastSample) {
    return null;
  }

  const heapIncreaseMb = lastSample.heapUsedMb - firstSample.heapUsedMb;
  if (heapIncreaseMb < minimumHeapIncreaseMb) {
    return null;
  }

  for (let index = 1; index < recentSamples.length; index += 1) {
    if (recentSamples[index]!.heapUsedMb <= recentSamples[index - 1]!.heapUsedMb) {
      return null;
    }
  }

  return `Heap usage keeps climbing (${firstSample.heapUsedMb.toFixed(1)} -> ${lastSample.heapUsedMb.toFixed(1)} MB).`;
}

export function getStationaryTileBuildWarning(
  samples: RendererChurnSample[],
  {
    minimumSampleCount = 4,
    minimumBuildRate = 4,
    minimumBuildTotal = 20,
    maximumWalkDistance = 0.75,
  }: {
    minimumSampleCount?: number;
    minimumBuildRate?: number;
    minimumBuildTotal?: number;
    maximumWalkDistance?: number;
  } = {}
): string | null {
  if (samples.length < minimumSampleCount) {
    return null;
  }

  const recentSamples = samples.slice(-minimumSampleCount);
  const firstSample = recentSamples[0];
  const lastSample = recentSamples[recentSamples.length - 1];
  if (!firstSample || !lastSample) {
    return null;
  }

  const walkedDistance = Math.hypot(
    lastSample.playerX - firstSample.playerX,
    lastSample.playerY - firstSample.playerY
  );
  if (walkedDistance > maximumWalkDistance) {
    return null;
  }

  let buildTotal = 0;
  for (const sample of recentSamples) {
    if (sample.tileNodeBuildsPerSecond < minimumBuildRate) {
      return null;
    }
    buildTotal += sample.tileNodeBuildsPerSecond;
  }

  if (buildTotal < minimumBuildTotal) {
    return null;
  }

  return `Tile nodes keep rebuilding while stationary (${buildTotal} recent builds within ${walkedDistance.toFixed(2)} tiles).`;
}
