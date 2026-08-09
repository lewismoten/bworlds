export const DRAW_CALL_CHUNK_TILE_SIZE = 4;

export type VisibleTileResourceStatsEntry = {
  tileX: number;
  tileY: number;
  drawCallCount: number;
  visibleObjectCount?: number;
  visibleMeshCount?: number;
  materialCount?: number;
};

export function collectVisibleTileResourceStats<TEntry extends VisibleTileResourceStatsEntry>(
  entries: Iterable<TEntry>,
  chunkTileSize = DRAW_CALL_CHUNK_TILE_SIZE
): {
  chunkCount: number;
  maxChunkDrawCallCount: number;
  maxChunkMeshCount: number;
  totalVisibleObjectCount: number;
  totalVisibleMeshCount: number;
  totalMaterialCount: number;
} {
  const size = Math.max(1, Math.floor(chunkTileSize));
  const chunkDrawCalls = new Map<string, number>();
  const chunkMeshes = new Map<string, number>();
  let maxChunkDrawCallCount = 0;
  let maxChunkMeshCount = 0;
  let totalVisibleObjectCount = 0;
  let totalVisibleMeshCount = 0;
  let totalMaterialCount = 0;

  for (const entry of entries) {
    const chunkX = Math.floor(entry.tileX / size);
    const chunkY = Math.floor(entry.tileY / size);
    const key = `${chunkX}:${chunkY}`;
    const nextDrawCalls = (chunkDrawCalls.get(key) ?? 0) + entry.drawCallCount;
    chunkDrawCalls.set(key, nextDrawCalls);
    if (nextDrawCalls > maxChunkDrawCallCount) {
      maxChunkDrawCallCount = nextDrawCalls;
    }

    const nextMeshCount =
      (chunkMeshes.get(key) ?? 0) + Math.max(0, Math.floor(entry.visibleMeshCount ?? 0));
    chunkMeshes.set(key, nextMeshCount);
    totalVisibleObjectCount += Math.max(0, Math.floor(entry.visibleObjectCount ?? 0));
    totalVisibleMeshCount += Math.max(0, Math.floor(entry.visibleMeshCount ?? 0));
    totalMaterialCount += Math.max(0, Math.floor(entry.materialCount ?? 0));
    if (nextMeshCount > maxChunkMeshCount) {
      maxChunkMeshCount = nextMeshCount;
    }
  }

  return {
    chunkCount: chunkDrawCalls.size,
    maxChunkDrawCallCount,
    maxChunkMeshCount,
    totalVisibleObjectCount,
    totalVisibleMeshCount,
    totalMaterialCount,
  };
}

export function collectChunkDrawCallStats<TEntry extends VisibleTileResourceStatsEntry>(
  entries: Iterable<TEntry>,
  chunkTileSize = DRAW_CALL_CHUNK_TILE_SIZE
): {
  chunkCount: number;
  maxChunkDrawCallCount: number;
} {
  const stats = collectVisibleTileResourceStats(entries, chunkTileSize);
  return {
    chunkCount: stats.chunkCount,
    maxChunkDrawCallCount: stats.maxChunkDrawCallCount,
  };
}
