export const DRAW_CALL_CHUNK_TILE_SIZE = 4;

export type VisibleTileResourceStatsEntry = {
  tileX: number;
  tileY: number;
  drawCallCount: number;
  visibleObjectCount?: number;
  lightCount?: number;
  shadowLightCount?: number;
  visibleMeshCount?: number;
  materialCount?: number;
  vertexCount?: number;
  triangleCount?: number;
  geometryBytes?: number;
  textureMemoryEstimateBytes?: number;
};

export function collectVisibleTileResourceStats<TEntry extends VisibleTileResourceStatsEntry>(
  entries: Iterable<TEntry>,
  chunkTileSize = DRAW_CALL_CHUNK_TILE_SIZE
): {
  chunkCount: number;
  maxChunkDrawCallCount: number;
  maxChunkObjectCount: number;
  maxChunkMeshCount: number;
  maxChunkTriangleCount: number;
  totalVisibleObjectCount: number;
  totalLightCount: number;
  totalShadowLightCount: number;
  totalVisibleMeshCount: number;
  totalMaterialCount: number;
  totalVertexCount: number;
  totalTriangleCount: number;
  totalGeometryBytes: number;
  totalTextureMemoryEstimateBytes: number;
  totalEstimatedGpuMemoryBytes: number;
} {
  const size = Math.max(1, Math.floor(chunkTileSize));
  const chunkDrawCalls = new Map<string, number>();
  const chunkObjects = new Map<string, number>();
  const chunkMeshes = new Map<string, number>();
  const chunkTriangles = new Map<string, number>();
  let maxChunkDrawCallCount = 0;
  let maxChunkObjectCount = 0;
  let maxChunkMeshCount = 0;
  let maxChunkTriangleCount = 0;
  let totalVisibleObjectCount = 0;
  let totalLightCount = 0;
  let totalShadowLightCount = 0;
  let totalVisibleMeshCount = 0;
  let totalMaterialCount = 0;
  let totalVertexCount = 0;
  let totalTriangleCount = 0;
  let totalGeometryBytes = 0;
  let totalTextureMemoryEstimateBytes = 0;

  for (const entry of entries) {
    const chunkX = Math.floor(entry.tileX / size);
    const chunkY = Math.floor(entry.tileY / size);
    const key = `${chunkX}:${chunkY}`;
    const nextDrawCalls = (chunkDrawCalls.get(key) ?? 0) + entry.drawCallCount;
    chunkDrawCalls.set(key, nextDrawCalls);
    if (nextDrawCalls > maxChunkDrawCallCount) {
      maxChunkDrawCallCount = nextDrawCalls;
    }

    const nextObjectCount =
      (chunkObjects.get(key) ?? 0) + Math.max(0, Math.floor(entry.visibleObjectCount ?? 0));
    chunkObjects.set(key, nextObjectCount);
    const nextMeshCount =
      (chunkMeshes.get(key) ?? 0) + Math.max(0, Math.floor(entry.visibleMeshCount ?? 0));
    chunkMeshes.set(key, nextMeshCount);
    const nextTriangleCount =
      (chunkTriangles.get(key) ?? 0) + Math.max(0, Math.floor(entry.triangleCount ?? 0));
    chunkTriangles.set(key, nextTriangleCount);
    totalVisibleObjectCount += Math.max(0, Math.floor(entry.visibleObjectCount ?? 0));
    totalLightCount += Math.max(0, Math.floor(entry.lightCount ?? 0));
    totalShadowLightCount += Math.max(0, Math.floor(entry.shadowLightCount ?? 0));
    totalVisibleMeshCount += Math.max(0, Math.floor(entry.visibleMeshCount ?? 0));
    totalMaterialCount += Math.max(0, Math.floor(entry.materialCount ?? 0));
    totalVertexCount += Math.max(0, Math.floor(entry.vertexCount ?? 0));
    totalTriangleCount += Math.max(0, Math.floor(entry.triangleCount ?? 0));
    totalGeometryBytes += Math.max(0, Math.floor(entry.geometryBytes ?? 0));
    totalTextureMemoryEstimateBytes += Math.max(
      0,
      Math.floor(entry.textureMemoryEstimateBytes ?? 0)
    );
    if (nextObjectCount > maxChunkObjectCount) {
      maxChunkObjectCount = nextObjectCount;
    }
    if (nextMeshCount > maxChunkMeshCount) {
      maxChunkMeshCount = nextMeshCount;
    }
    if (nextTriangleCount > maxChunkTriangleCount) {
      maxChunkTriangleCount = nextTriangleCount;
    }
  }

  return {
    chunkCount: chunkDrawCalls.size,
    maxChunkDrawCallCount,
    maxChunkObjectCount,
    maxChunkMeshCount,
    maxChunkTriangleCount,
    totalVisibleObjectCount,
    totalLightCount,
    totalShadowLightCount,
    totalVisibleMeshCount,
    totalMaterialCount,
    totalVertexCount,
    totalTriangleCount,
    totalGeometryBytes,
    totalTextureMemoryEstimateBytes,
    totalEstimatedGpuMemoryBytes:
      totalGeometryBytes + totalTextureMemoryEstimateBytes,
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
