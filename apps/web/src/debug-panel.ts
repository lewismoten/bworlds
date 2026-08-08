export type DebugSnapshot = {
  fps: number;
  averageFps: number;
  frameMs: number;
  worstRecentFrameMs: number;
  targetFps: 60 | 30;
  performanceTier: 'healthy' | 'reduced' | 'critical';
  renderQualityLevel: string;
  renderQualityLimiters: string;
  playerLevel: number;
  visibilityRadius: number;
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  renderWidth?: number;
  renderHeight?: number;
  devicePixelRatio?: number;
  renderScale?: number;
  sceneChildCount: number;
  visibleTileCount: number;
  visibleTreeCount: number;
  loadedChunkCount: number;
  chunkGenerationQueueSize: number;
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
  visibleObjectCount?: number;
  invisibleObjectCount?: number;
  groupCount: number;
  meshCount: number;
  instancedMeshCount?: number;
  visibleInstancedMeshCount?: number;
  renderedInstanceCount?: number;
  visibleMeshCount: number;
  pointsCount: number;
  lineObjectCount?: number;
  activeParticleSystemCount?: number;
  activeParticleCount: number;
  spriteCount: number;
  lightCount: number;
  dynamicLightCount: number;
  shadowLightCount: number;
  activeNpcCount: number;
  fullSimulationEntityCount: number;
  reducedSimulationEntityCount: number;
  activeAudioSourceCount: number;
  materialCount: number;
  geometryCount: number;
  vertexCount: number;
  geometryMemoryCount: number;
  treeObjectCount: number;
  treeMeshCount: number;
  treeMaterialRefCount: number;
  visibleTileKindSummary: string;
  textureCount: number;
  textureMemoryEstimateMb: number;
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
  playerX: number;
  playerY: number;
};

export type PerformanceHistorySample = {
  nowMs: number;
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
  activeParticleSystemCount?: number;
  activeParticleCount?: number;
  generationQueueSize: number;
};

export function normalizeWorldSeed(seed: string | undefined, fallback: string): string {
  const trimmed = seed?.trim();
  return trimmed ? trimmed : fallback;
}

export function getDebugSignature(snapshot: DebugSnapshot): string {
  return [
    snapshot.fps.toFixed(1),
    snapshot.averageFps.toFixed(1),
    snapshot.frameMs.toFixed(1),
    snapshot.worstRecentFrameMs.toFixed(1),
    snapshot.targetFps,
    snapshot.performanceTier,
    snapshot.renderQualityLevel,
    snapshot.renderQualityLimiters,
    snapshot.playerLevel,
    snapshot.visibilityRadius,
    snapshot.drawCalls,
    snapshot.triangles,
    snapshot.points,
    snapshot.lines,
    snapshot.renderWidth ?? 0,
    snapshot.renderHeight ?? 0,
    (snapshot.devicePixelRatio ?? 0).toFixed(2),
    (snapshot.renderScale ?? 0).toFixed(2),
    snapshot.sceneChildCount,
    snapshot.visibleTileCount,
    snapshot.visibleTreeCount,
    snapshot.loadedChunkCount,
    snapshot.chunkGenerationQueueSize,
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
    snapshot.visibleMeshCount,
    snapshot.pointsCount,
    snapshot.activeParticleSystemCount ?? snapshot.pointsCount,
    snapshot.activeParticleCount,
    snapshot.spriteCount,
    snapshot.lightCount,
    snapshot.dynamicLightCount,
    snapshot.shadowLightCount,
    snapshot.activeNpcCount,
    snapshot.fullSimulationEntityCount,
    snapshot.reducedSimulationEntityCount,
    snapshot.activeAudioSourceCount,
    snapshot.materialCount,
    snapshot.geometryCount,
    snapshot.vertexCount,
    snapshot.geometryMemoryCount,
    snapshot.treeObjectCount,
    snapshot.treeMeshCount,
    snapshot.treeMaterialRefCount,
    snapshot.visibleTileKindSummary,
    snapshot.textureCount,
    snapshot.textureMemoryEstimateMb.toFixed(1),
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
    <div><dt>Avg FPS</dt><dd>${snapshot.averageFps.toFixed(1)}</dd></div>
    <div><dt>CPU Frame</dt><dd>${snapshot.frameMs.toFixed(1)} ms</dd></div>
    <div><dt>Worst Frame</dt><dd>${snapshot.worstRecentFrameMs.toFixed(1)} ms</dd></div>
    <div><dt>Frame Target</dt><dd>${snapshot.targetFps} FPS / ${targetFrameMs.toFixed(1)} ms</dd></div>
    <div><dt>Perf Tier</dt><dd>${formatPerformanceTierLabel(snapshot.performanceTier)}</dd></div>
    <div><dt>Render Quality</dt><dd>${snapshot.renderQualityLevel}</dd></div>
    <div><dt>Quality Limiters</dt><dd>${snapshot.renderQualityLimiters}</dd></div>
    <div><dt>Level</dt><dd>${snapshot.playerLevel}</dd></div>
    <div><dt>Render Radius</dt><dd>${snapshot.visibilityRadius}</dd></div>
    <div><dt>Draw Calls</dt><dd>${snapshot.drawCalls}</dd></div>
    <div><dt>Triangles</dt><dd>${snapshot.triangles}</dd></div>
    <div><dt>GPU Points</dt><dd>${snapshot.points}</dd></div>
    <div><dt>GPU Lines</dt><dd>${snapshot.lines}</dd></div>
    <div><dt>Render Resolution</dt><dd>${snapshot.renderWidth ?? 0} x ${snapshot.renderHeight ?? 0}</dd></div>
    <div><dt>Device Pixel Ratio</dt><dd>${(snapshot.devicePixelRatio ?? 0).toFixed(2)}</dd></div>
    <div><dt>Render Scale</dt><dd>${(snapshot.renderScale ?? 0).toFixed(2)}</dd></div>
    <div><dt>Scene Roots</dt><dd>${snapshot.sceneChildCount}</dd></div>
    <div><dt>Visible Tiles</dt><dd>${snapshot.visibleTileCount}</dd></div>
    <div><dt>Visible Trees</dt><dd>${snapshot.visibleTreeCount}</dd></div>
    <div><dt>Loaded Chunks</dt><dd>${snapshot.loadedChunkCount}</dd></div>
    <div><dt>Chunk Queue</dt><dd>${snapshot.chunkGenerationQueueSize}</dd></div>
    <div><dt>Model Queue</dt><dd>${snapshot.chunkGenerationQueueSize}</dd></div>
    <div><dt>Pending Tiles</dt><dd>${snapshot.pendingTileCount}</dd></div>
    <div><dt>Avg Flush Tiles</dt><dd>${snapshot.averagePendingFlushTiles.toFixed(2)}</dd></div>
    <div><dt>Max Flush Tiles</dt><dd>${snapshot.maxPendingFlushTiles}</dd></div>
    <div><dt>Avg Tile Build</dt><dd>${snapshot.averageTileBuildMs.toFixed(2)} ms</dd></div>
    <div><dt>Max Tile Build</dt><dd>${snapshot.maxTileBuildMs.toFixed(2)} ms</dd></div>
    <div><dt>Tile Nodes/s</dt><dd>${snapshot.tileNodeBuildsPerSecond}</dd></div>
    <div><dt>Tile Builds/s</dt><dd>${snapshot.tileBuildsPerSecond}</dd></div>
    <div><dt>LOD Checks/s</dt><dd>${snapshot.lodChecksPerSecond}</dd></div>
    <div><dt>LOD Swaps/s</dt><dd>${snapshot.lodReplacementsPerSecond}</dd></div>
    <div><dt>Active Objects</dt><dd>${snapshot.object3dCount}</dd></div>
    <div><dt>Three.js Objects</dt><dd>${snapshot.object3dCount}</dd></div>
    <div><dt>Objects / Tile</dt><dd>${objectsPerVisibleTile}</dd></div>
    <div><dt>Groups</dt><dd>${snapshot.groupCount}</dd></div>
    <div><dt>Visible Meshes</dt><dd>${snapshot.visibleMeshCount}</dd></div>
    <div><dt>Mesh Nodes</dt><dd>${snapshot.meshCount}</dd></div>
    <div><dt>Particles</dt><dd>${snapshot.activeParticleCount}</dd></div>
    <div><dt>Particle Systems</dt><dd>${snapshot.activeParticleSystemCount ?? snapshot.pointsCount}</dd></div>
    <div><dt>Points Nodes</dt><dd>${snapshot.pointsCount}</dd></div>
    <div><dt>Sprites</dt><dd>${snapshot.spriteCount}</dd></div>
    <div><dt>Active Dynamic Lights</dt><dd>${snapshot.dynamicLightCount}</dd></div>
    <div><dt>Lights</dt><dd>${snapshot.lightCount}</dd></div>
    <div><dt>Shadow Lights</dt><dd>${snapshot.shadowLightCount}</dd></div>
    <div><dt>Active NPCs</dt><dd>${snapshot.activeNpcCount}</dd></div>
    <div><dt>Full-sim Entities</dt><dd>${snapshot.fullSimulationEntityCount}</dd></div>
    <div><dt>Reduced-sim Entities</dt><dd>${snapshot.reducedSimulationEntityCount}</dd></div>
    <div><dt>Audio Voices</dt><dd>${snapshot.activeAudioSourceCount}</dd></div>
    <div><dt>Objects / Tree</dt><dd>${objectsPerVisibleTree}</dd></div>
    <div><dt>Meshes / Tree</dt><dd>${meshesPerVisibleTree}</dd></div>
    <div><dt>Materials</dt><dd>${snapshot.materialCount}</dd></div>
    <div><dt>Materials / Tree</dt><dd>${materialsPerVisibleTree}</dd></div>
    <div><dt>Tile Kinds</dt><dd>${snapshot.visibleTileKindSummary || 'None'}</dd></div>
    <div><dt>Geometry Count</dt><dd>${snapshot.geometryCount}</dd></div>
    <div><dt>Vertices</dt><dd>${snapshot.vertexCount}</dd></div>
    <div><dt>Geometry Memory</dt><dd>${snapshot.geometryMemoryCount}</dd></div>
    <div><dt>Textures</dt><dd>${snapshot.textureCount}</dd></div>
    <div><dt>Estimated Texture Memory</dt><dd>${snapshot.textureMemoryEstimateMb.toFixed(1)} MB</dd></div>
    <div><dt>Shader Programs</dt><dd>${snapshot.programCount}</dd></div>
    <div><dt>JavaScript Heap</dt><dd>${heapLabel}</dd></div>
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

export function recordPerformanceHistorySample(
  samples: PerformanceHistorySample[],
  sample: PerformanceHistorySample,
  {
    sampleIntervalMs = 1000,
    historyWindowMs = 60000,
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
    | 'shadowLightCount' | 'activeAudioSourceCount'
  >,
  {
    maxFrameMs = 50,
    maxDrawCallsAt60Fps = 900,
    maxDrawCallsAt30Fps = 1200,
    maxTrianglesAt60Fps = 450000,
    maxTrianglesAt30Fps = 700000,
    maxObject3dCount = 2400,
    maxProgramCount = 48,
    maxShadowLightCount = 3,
    maxActiveAudioSourceCount = 24,
  }: {
    maxFrameMs?: number;
    maxDrawCallsAt60Fps?: number;
    maxDrawCallsAt30Fps?: number;
    maxTrianglesAt60Fps?: number;
    maxTrianglesAt30Fps?: number;
    maxObject3dCount?: number;
    maxProgramCount?: number;
    maxShadowLightCount?: number;
    maxActiveAudioSourceCount?: number;
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

  if (snapshot.shadowLightCount > maxShadowLightCount) {
    warnings.push(
      `Shadow light count is high (${snapshot.shadowLightCount} > ${maxShadowLightCount}).`
    );
  }

  if (snapshot.activeAudioSourceCount > maxActiveAudioSourceCount) {
    warnings.push(
      `Active audio source count is high (${snapshot.activeAudioSourceCount} > ${maxActiveAudioSourceCount}).`
    );
  }

  return warnings;
}

export function getWorkQueueWarnings(
  snapshot: Pick<
    DebugSnapshot,
    'chunkGenerationQueueSize' | 'averagePendingFlushTiles' | 'maxPendingFlushTiles'
  >,
  {
    maxPendingTileCount = 48,
    minimumAverageFlushTiles = 1,
  }: {
    maxPendingTileCount?: number;
    minimumAverageFlushTiles?: number;
  } = {}
): string[] {
  if (
    snapshot.chunkGenerationQueueSize <= maxPendingTileCount ||
    snapshot.averagePendingFlushTiles < minimumAverageFlushTiles
  ) {
    return [];
  }

  return [
    `Chunk-generation queue is backing up (${snapshot.chunkGenerationQueueSize} queued, avg flush ${snapshot.averagePendingFlushTiles.toFixed(1)}, max flush ${snapshot.maxPendingFlushTiles}).`,
  ];
}

export function getUnloadedRegionWarnings(
  snapshot: Pick<
    DebugSnapshot,
    | 'visibleTileCount'
    | 'visibleTreeCount'
    | 'treeObjectCount'
    | 'geometryCount'
    | 'geometryMemoryCount'
    | 'materialCount'
    | 'textureCount'
  >,
  {
    maxRetainedVisibleTrees = 0,
    maxRetainedTreeObjects = 0,
    maxRetainedGeometryCount = 24,
    maxRetainedGeometryMemoryCount = 24,
    maxRetainedMaterialCount = 32,
    maxRetainedTextureCount = 16,
  }: {
    maxRetainedVisibleTrees?: number;
    maxRetainedTreeObjects?: number;
    maxRetainedGeometryCount?: number;
    maxRetainedGeometryMemoryCount?: number;
    maxRetainedMaterialCount?: number;
    maxRetainedTextureCount?: number;
  } = {}
): string[] {
  if (snapshot.visibleTileCount > 0) {
    return [];
  }

  const warnings: string[] = [];

  if (snapshot.visibleTreeCount > maxRetainedVisibleTrees) {
    warnings.push(
      `No tiles are visible, but tree count remains (${snapshot.visibleTreeCount} > ${maxRetainedVisibleTrees}).`
    );
  }
  if (snapshot.treeObjectCount > maxRetainedTreeObjects) {
    warnings.push(
      `No tiles are visible, but tree objects remain (${snapshot.treeObjectCount} > ${maxRetainedTreeObjects}).`
    );
  }
  if (
    snapshot.geometryCount > maxRetainedGeometryCount ||
    snapshot.geometryMemoryCount > maxRetainedGeometryMemoryCount ||
    snapshot.materialCount > maxRetainedMaterialCount ||
    snapshot.textureCount > maxRetainedTextureCount
  ) {
    warnings.push(
      `No tiles are visible, but render resources remain (geom ${snapshot.geometryCount}/${snapshot.geometryMemoryCount}, mat ${snapshot.materialCount}, tex ${snapshot.textureCount}).`
    );
  }

  return warnings;
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

export function getIdleAllocationWarning(
  samples: HeapUsageSample[],
  {
    minimumSampleCount = 4,
    minimumHeapIncreaseMb = 16,
    maximumWalkDistance = 0.75,
  }: {
    minimumSampleCount?: number;
    minimumHeapIncreaseMb?: number;
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

  const heapIncreaseMb = lastSample.heapUsedMb - firstSample.heapUsedMb;
  if (heapIncreaseMb < minimumHeapIncreaseMb) {
    return null;
  }

  for (let index = 1; index < recentSamples.length; index += 1) {
    if (recentSamples[index]!.heapUsedMb <= recentSamples[index - 1]!.heapUsedMb) {
      return null;
    }
  }

  return `Heap usage keeps climbing while idle (${firstSample.heapUsedMb.toFixed(1)} -> ${lastSample.heapUsedMb.toFixed(1)} MB over ${walkedDistance.toFixed(2)} tiles).`;
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
