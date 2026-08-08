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
  object3dCount: number;
  groupCount: number;
  meshCount: number;
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
    snapshot.object3dCount,
    snapshot.groupCount,
    snapshot.meshCount,
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
    <div><dt>Objects</dt><dd>${snapshot.object3dCount}</dd></div>
    <div><dt>Objects / Tile</dt><dd>${objectsPerVisibleTile}</dd></div>
    <div><dt>Groups</dt><dd>${snapshot.groupCount}</dd></div>
    <div><dt>Meshes</dt><dd>${snapshot.meshCount}</dd></div>
    <div><dt>Meshes / Tree</dt><dd>${meshesPerVisibleTree}</dd></div>
    <div><dt>Materials</dt><dd>${snapshot.materialCount}</dd></div>
    <div><dt>Materials / Tree</dt><dd>${materialsPerVisibleTree}</dd></div>
    <div><dt>Geometries</dt><dd>${snapshot.geometryCount}</dd></div>
    <div><dt>GPU Geometries</dt><dd>${snapshot.geometryMemoryCount}</dd></div>
    <div><dt>Textures</dt><dd>${snapshot.textureCount}</dd></div>
    <div><dt>Programs</dt><dd>${snapshot.programCount}</dd></div>
    <div><dt>Heap</dt><dd>${heapLabel}</dd></div>
    <div><dt>GPS</dt><dd>${snapshot.latitude.toFixed(4)}, ${snapshot.longitude.toFixed(4)}</dd></div>
    <div><dt>Grid</dt><dd>${snapshot.gridX}, ${snapshot.gridY}</dd></div>
    <div><dt>Seed</dt><dd>${snapshot.worldSeed}</dd></div>
  `;
}
