export const TERRAIN_CHUNK_CELL_SIZE = 16;
export const TERRAIN_CHUNK_HEIGHT_SAMPLE_SIZE = TERRAIN_CHUNK_CELL_SIZE + 1;

export type TerrainChunkId = {
  chunkX: number;
  chunkY: number;
};

export type TerrainChunkCoordinates = {
  chunkX: number;
  chunkY: number;
  localX: number;
  localY: number;
};

export type TerrainChunkCellBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type TerrainChunkHeightSampleBounds = TerrainChunkCellBounds;
export type TerrainChunkBorderEdge = 'north' | 'east' | 'south' | 'west';
export type TerrainChunkHeightSampleBorder = TerrainChunkHeightSampleBounds;
export type TerrainChunkHeightSampleCoordinate = {
  x: number;
  y: number;
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

export function getTerrainChunkCellBounds(
  chunkX: number,
  chunkY: number
): TerrainChunkCellBounds {
  const minX = chunkX * TERRAIN_CHUNK_CELL_SIZE;
  const minY = chunkY * TERRAIN_CHUNK_CELL_SIZE;

  return {
    minX,
    maxX: minX + TERRAIN_CHUNK_CELL_SIZE - 1,
    minY,
    maxY: minY + TERRAIN_CHUNK_CELL_SIZE - 1,
  };
}

export function getTerrainChunkHeightSampleBounds(
  chunkX: number,
  chunkY: number
): TerrainChunkHeightSampleBounds {
  const bounds = getTerrainChunkCellBounds(chunkX, chunkY);

  return {
    minX: bounds.minX,
    maxX: bounds.maxX + 1,
    minY: bounds.minY,
    maxY: bounds.maxY + 1,
  };
}

export function getTerrainChunkHeightSampleCoordinate(
  chunkX: number,
  chunkY: number,
  sampleX: number,
  sampleY: number
): TerrainChunkHeightSampleCoordinate {
  assertTerrainChunkHeightSampleIndexInBounds(sampleX, 'x');
  assertTerrainChunkHeightSampleIndexInBounds(sampleY, 'y');

  const bounds = getTerrainChunkHeightSampleBounds(chunkX, chunkY);
  return {
    x: bounds.minX + sampleX,
    y: bounds.minY + sampleY,
  };
}

export function getTerrainChunkHeightSampleBorder(
  chunkX: number,
  chunkY: number,
  edge: TerrainChunkBorderEdge
): TerrainChunkHeightSampleBorder {
  const bounds = getTerrainChunkHeightSampleBounds(chunkX, chunkY);

  switch (edge) {
    case 'north':
      return {
        minX: bounds.minX,
        maxX: bounds.maxX,
        minY: bounds.minY,
        maxY: bounds.minY,
      };
    case 'east':
      return {
        minX: bounds.maxX,
        maxX: bounds.maxX,
        minY: bounds.minY,
        maxY: bounds.maxY,
      };
    case 'south':
      return {
        minX: bounds.minX,
        maxX: bounds.maxX,
        minY: bounds.maxY,
        maxY: bounds.maxY,
      };
    case 'west':
      return {
        minX: bounds.minX,
        maxX: bounds.minX,
        minY: bounds.minY,
        maxY: bounds.maxY,
      };
  }
}

function assertTerrainChunkHeightSampleIndexInBounds(
  value: number,
  axis: 'x' | 'y'
): void {
  if (
    !Number.isInteger(value) ||
    value < 0 ||
    value >= TERRAIN_CHUNK_HEIGHT_SAMPLE_SIZE
  ) {
    throw new Error(
      `Terrain chunk height sample ${axis}-index ${value} must stay within 0..${TERRAIN_CHUNK_HEIGHT_SAMPLE_SIZE - 1}.`
    );
  }
}
