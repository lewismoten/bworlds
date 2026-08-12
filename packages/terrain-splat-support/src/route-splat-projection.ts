import type { TerrainMaterialLayerId } from './index.ts';
import type { TerrainHeightField } from './height-field.ts';
import { sampleTerrainHeightFieldAtWorldPosition } from './route-overlay-projection.ts';

export type TerrainRouteSplatPoint = {
  x: number;
  z: number;
  weight: number;
  layerId?: TerrainMaterialLayerId;
};

export type TerrainRouteSplatProjectedPoint = TerrainRouteSplatPoint & {
  y: number;
};

export type TerrainRouteSplatProjectionPlan = {
  surfaceOffsetY: number;
  points: readonly TerrainRouteSplatProjectedPoint[];
};

export function projectTerrainRouteSplatOntoHeightField(params: {
  heightField: TerrainHeightField;
  points: readonly TerrainRouteSplatPoint[];
  surfaceOffsetY?: number;
}): TerrainRouteSplatProjectionPlan {
  const surfaceOffsetY = params.surfaceOffsetY ?? 0;

  return {
    surfaceOffsetY,
    points: params.points.map((point) => ({
      ...point,
      weight: clamp01(point.weight),
      y:
        sampleTerrainHeightFieldAtWorldPosition(params.heightField, point) +
        surfaceOffsetY,
    })),
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
