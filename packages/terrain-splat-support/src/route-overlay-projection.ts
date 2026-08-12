import type { TerrainHeightField } from './height-field.ts';

export type TerrainRouteOverlayPoint = {
  x: number;
  z: number;
};

export type TerrainRouteOverlayProjectedPoint = TerrainRouteOverlayPoint & {
  y: number;
};

export type TerrainRouteOverlayProjectionPlan = {
  overlayOffsetY: number;
  points: readonly TerrainRouteOverlayProjectedPoint[];
};

export function projectTerrainRouteOverlayOntoHeightField(params: {
  heightField: TerrainHeightField;
  points: readonly TerrainRouteOverlayPoint[];
  overlayOffsetY?: number;
}): TerrainRouteOverlayProjectionPlan {
  const overlayOffsetY = params.overlayOffsetY ?? 0.01;

  return {
    overlayOffsetY,
    points: params.points.map((point) => ({
      x: point.x,
      z: point.z,
      y:
        sampleTerrainHeightFieldAtWorldPosition(params.heightField, point) +
        overlayOffsetY,
    })),
  };
}

export function sampleTerrainHeightFieldAtWorldPosition(
  heightField: TerrainHeightField,
  point: TerrainRouteOverlayPoint
): number {
  const localX = (point.x - heightField.minX) / heightField.step;
  const localZ = (point.z - heightField.minY) / heightField.step;
  const clampedX = clamp(localX, 0, heightField.width - 1);
  const clampedZ = clamp(localZ, 0, heightField.height - 1);
  const minColumn = Math.floor(clampedX);
  const minRow = Math.floor(clampedZ);
  const maxColumn = Math.min(heightField.width - 1, minColumn + 1);
  const maxRow = Math.min(heightField.height - 1, minRow + 1);
  const xBlend = clampedX - minColumn;
  const zBlend = clampedZ - minRow;

  const northWest = getTerrainHeightFieldValue(heightField, minColumn, minRow);
  const northEast = getTerrainHeightFieldValue(heightField, maxColumn, minRow);
  const southWest = getTerrainHeightFieldValue(heightField, minColumn, maxRow);
  const southEast = getTerrainHeightFieldValue(heightField, maxColumn, maxRow);

  const north = lerp(northWest, northEast, xBlend);
  const south = lerp(southWest, southEast, xBlend);
  return lerp(north, south, zBlend);
}

function getTerrainHeightFieldValue(
  heightField: TerrainHeightField,
  column: number,
  row: number
): number {
  return heightField.heights[row * heightField.width + column] ?? 0;
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}
