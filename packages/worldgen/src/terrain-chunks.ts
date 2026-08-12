export const TERRAIN_CHUNK_CELL_SIZE = 16;
export const TERRAIN_CHUNK_HEIGHT_SAMPLE_SIZE = TERRAIN_CHUNK_CELL_SIZE + 1;

export type TerrainChunkCoordinates = {
  chunkX: number;
  chunkY: number;
  localX: number;
  localY: number;
};

export function getTerrainChunkCoordinates(
  worldX: number,
  worldY: number
): TerrainChunkCoordinates {
  const chunkX = Math.floor(worldX / TERRAIN_CHUNK_CELL_SIZE);
  const chunkY = Math.floor(worldY / TERRAIN_CHUNK_CELL_SIZE);

  return {
    chunkX,
    chunkY,
    localX: worldX - chunkX * TERRAIN_CHUNK_CELL_SIZE,
    localY: worldY - chunkY * TERRAIN_CHUNK_CELL_SIZE,
  };
}
