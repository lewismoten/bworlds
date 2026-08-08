export type DebugSnapshot = {
  fps: number;
  frameMs: number;
  playerLevel: number;
  visibilityRadius: number;
  drawCalls: number;
  triangles: number;
  visibleTileCount: number;
  pendingTileCount: number;
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
    snapshot.playerLevel,
    snapshot.visibilityRadius,
    snapshot.drawCalls,
    snapshot.triangles,
    snapshot.visibleTileCount,
    snapshot.pendingTileCount,
    snapshot.latitude.toFixed(4),
    snapshot.longitude.toFixed(4),
    snapshot.gridX,
    snapshot.gridY,
    snapshot.worldSeed,
    snapshot.heapUsedMb?.toFixed(1) ?? 'na',
    snapshot.heapLimitMb?.toFixed(1) ?? 'na',
  ].join('|');
}

export function buildDebugMarkup(snapshot: DebugSnapshot): string {
  const heapLabel =
    snapshot.heapUsedMb === null
      ? 'Unavailable'
      : `${snapshot.heapUsedMb.toFixed(1)} / ${(snapshot.heapLimitMb ?? 0).toFixed(1)} MB`;
  return `
    <div><dt>FPS</dt><dd>${snapshot.fps.toFixed(1)}</dd></div>
    <div><dt>CPU Frame</dt><dd>${snapshot.frameMs.toFixed(1)} ms</dd></div>
    <div><dt>Level</dt><dd>${snapshot.playerLevel}</dd></div>
    <div><dt>Render Radius</dt><dd>${snapshot.visibilityRadius}</dd></div>
    <div><dt>GPU Draws</dt><dd>${snapshot.drawCalls}</dd></div>
    <div><dt>GPU Tris</dt><dd>${snapshot.triangles}</dd></div>
    <div><dt>Visible Tiles</dt><dd>${snapshot.visibleTileCount}</dd></div>
    <div><dt>Pending Tiles</dt><dd>${snapshot.pendingTileCount}</dd></div>
    <div><dt>Heap</dt><dd>${heapLabel}</dd></div>
    <div><dt>GPS</dt><dd>${snapshot.latitude.toFixed(4)}, ${snapshot.longitude.toFixed(4)}</dd></div>
    <div><dt>Grid</dt><dd>${snapshot.gridX}, ${snapshot.gridY}</dd></div>
    <div><dt>Seed</dt><dd>${snapshot.worldSeed}</dd></div>
  `;
}
