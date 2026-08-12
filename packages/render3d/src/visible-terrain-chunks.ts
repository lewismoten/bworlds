import type { Kind, TerrainSurfaceRenderMode } from '@bworlds/plugin-api';
import {
  getTerrainChunkCellBounds,
  getTerrainChunkCoordinates,
  type TerrainChunkCellBounds,
} from '@bworlds/worldgen';

export type VisibleTerrainChunkFloorEntry = {
  tile: { kind: Kind };
  tileX: number;
  tileY: number;
  tilePluginOwnerLabel?: string;
  terrainSurfaceMode?: TerrainSurfaceRenderMode | null;
  sharedFloorInstance?: {
    kind: Kind;
    variant: number;
    tileX: number;
    tileY: number;
    surfaceHeight: number;
    thickness: number;
    surfaceBlendSignature?: string | null;
  } | null;
};

export type VisibleTerrainChunkCell = {
  tileX: number;
  tileY: number;
  tileKind: Kind;
  floorKind: Kind;
  tilePluginOwnerLabel: string;
  terrainSurfaceMode: TerrainSurfaceRenderMode | null;
  variant: number;
  surfaceHeight: number;
  thickness: number;
  surfaceBlendSignature?: string | null;
};

export type VisibleTerrainChunk = {
  key: string;
  chunkX: number;
  chunkY: number;
  bounds: TerrainChunkCellBounds;
  cells: readonly VisibleTerrainChunkCell[];
  floorKinds: readonly Kind[];
  tilePluginOwnerLabels: readonly string[];
};

export function collectVisibleTerrainChunks(
  entries: Iterable<VisibleTerrainChunkFloorEntry>
): VisibleTerrainChunk[] {
  const chunks = new Map<
    string,
    {
      key: string;
      chunkX: number;
      chunkY: number;
      bounds: TerrainChunkCellBounds;
      cells: VisibleTerrainChunkCell[];
    }
  >();

  for (const entry of entries) {
    const sharedFloorInstance = entry.sharedFloorInstance;
    if (!sharedFloorInstance) {
      continue;
    }
    const coordinates = getTerrainChunkCoordinates(
      sharedFloorInstance.tileX,
      sharedFloorInstance.tileY
    );
    const key = `${coordinates.chunkX}:${coordinates.chunkY}`;
    let chunk = chunks.get(key);
    if (!chunk) {
      chunk = {
        key,
        chunkX: coordinates.chunkX,
        chunkY: coordinates.chunkY,
        bounds: getTerrainChunkCellBounds(
          coordinates.chunkX,
          coordinates.chunkY
        ),
        cells: [],
      };
      chunks.set(key, chunk);
    }
    chunk.cells.push({
      tileX: sharedFloorInstance.tileX,
      tileY: sharedFloorInstance.tileY,
      tileKind: entry.tile.kind,
      floorKind: sharedFloorInstance.kind,
      tilePluginOwnerLabel: entry.tilePluginOwnerLabel ?? 'unknown',
      terrainSurfaceMode: entry.terrainSurfaceMode ?? null,
      variant: sharedFloorInstance.variant,
      surfaceHeight: sharedFloorInstance.surfaceHeight,
      thickness: sharedFloorInstance.thickness,
      surfaceBlendSignature: sharedFloorInstance.surfaceBlendSignature,
    });
  }

  return [...chunks.values()]
    .sort((left, right) =>
      left.chunkY === right.chunkY
        ? left.chunkX - right.chunkX
        : left.chunkY - right.chunkY
    )
    .map((chunk) => {
      const cells = [...chunk.cells].sort((left, right) =>
        left.tileY === right.tileY
          ? left.tileX - right.tileX
          : left.tileY - right.tileY
      );
      return {
        key: chunk.key,
        chunkX: chunk.chunkX,
        chunkY: chunk.chunkY,
        bounds: chunk.bounds,
        cells,
        floorKinds: [...new Set(cells.map((cell) => cell.floorKind))].sort(),
        tilePluginOwnerLabels: [
          ...new Set(cells.map((cell) => cell.tilePluginOwnerLabel)),
        ].sort(),
      };
    });
}
