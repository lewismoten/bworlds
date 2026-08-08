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
  visibleTileCount: number;
  visibleTreeCount: number;
  pendingTileCount: number;
  tileBuildsPerSecond: number;
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
  treeMeshCount: number;
  treeMaterialRefCount: number;
  textureCount: number;
  programCount: number;
  latitude: number;
  longitude: number;
  gridX: number;
  gridY: number;
  worldSeed: string;
  heapUsedMb: number | null;
  heapLimitMb: number | null;
  materialGrowthWarning: string | null;
};

export type MaterialGrowthSample = {
  nowMs: number;
  materialCount: number;
  playerX: number;
  playerY: number;
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
    snapshot.visibleTileCount,
    snapshot.visibleTreeCount,
    snapshot.pendingTileCount,
    snapshot.tileBuildsPerSecond,
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
    snapshot.treeMeshCount,
    snapshot.treeMaterialRefCount,
    snapshot.textureCount,
    snapshot.programCount,
    snapshot.latitude.toFixed(4),
    snapshot.longitude.toFixed(4),
    snapshot.gridX,
    snapshot.gridY,
    snapshot.worldSeed,
    snapshot.heapUsedMb?.toFixed(1) ?? 'na',
    snapshot.heapLimitMb?.toFixed(1) ?? 'na',
    snapshot.materialGrowthWarning ?? 'none',
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
  const materialsPerVisibleTree =
    snapshot.visibleTreeCount > 0
      ? (snapshot.treeMaterialRefCount / snapshot.visibleTreeCount).toFixed(1)
      : '0.0';
  const warningMarkup = snapshot.materialGrowthWarning
    ? `<div><dt>Warning</dt><dd>${snapshot.materialGrowthWarning}</dd></div>`
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
    <div><dt>Visible Tiles</dt><dd>${snapshot.visibleTileCount}</dd></div>
    <div><dt>Visible Trees</dt><dd>${snapshot.visibleTreeCount}</dd></div>
    <div><dt>Pending Tiles</dt><dd>${snapshot.pendingTileCount}</dd></div>
    <div><dt>Tile Builds/s</dt><dd>${snapshot.tileBuildsPerSecond}</dd></div>
    <div><dt>LOD Swaps/s</dt><dd>${snapshot.lodReplacementsPerSecond}</dd></div>
    <div><dt>Objects</dt><dd>${snapshot.object3dCount}</dd></div>
    <div><dt>Objects / Tile</dt><dd>${objectsPerVisibleTile}</dd></div>
    <div><dt>Groups</dt><dd>${snapshot.groupCount}</dd></div>
    <div><dt>Meshes</dt><dd>${snapshot.meshCount}</dd></div>
    <div><dt>Points Nodes</dt><dd>${snapshot.pointsCount}</dd></div>
    <div><dt>Sprites</dt><dd>${snapshot.spriteCount}</dd></div>
    <div><dt>Lights</dt><dd>${snapshot.lightCount}</dd></div>
    <div><dt>Meshes / Tree</dt><dd>${meshesPerVisibleTree}</dd></div>
    <div><dt>Materials</dt><dd>${snapshot.materialCount}</dd></div>
    <div><dt>Materials / Tree</dt><dd>${materialsPerVisibleTree}</dd></div>
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
