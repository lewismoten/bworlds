import type { TerrainMaterialLayerId } from './index.ts';
import {
  getTerrainSplatGridSample,
  type TerrainSplatSampleGrid,
} from './sample-grid.ts';

export type TerrainSplatLodCrossfadeWeights = {
  highDetailWeight: number;
  lowDetailWeight: number;
};

export type TerrainSplatLodTransitionCell = {
  column: number;
  row: number;
  x: number;
  y: number;
  highDetailDominantLayerId: TerrainMaterialLayerId | null;
  lowDetailDominantLayerId: TerrainMaterialLayerId | null;
  highDetailActiveLayerIds: readonly TerrainMaterialLayerId[];
  lowDetailActiveLayerIds: readonly TerrainMaterialLayerId[];
  dominantLayerChanged: boolean;
  activeLayerSetChanged: boolean;
  requiresCrossfade: boolean;
};

export type TerrainSplatLodTransitionPlan = {
  highDetailStep: number;
  lowDetailStep: number;
  cellCount: number;
  changedCellCount: number;
  requiresCrossfade: boolean;
  cells: readonly TerrainSplatLodTransitionCell[];
};

export function createTerrainSplatLodTransitionPlan(params: {
  highDetailGrid: TerrainSplatSampleGrid;
  lowDetailGrid: TerrainSplatSampleGrid;
}): TerrainSplatLodTransitionPlan {
  assertCompatibleLodTransitionGrids(
    params.highDetailGrid,
    params.lowDetailGrid
  );
  const cells: TerrainSplatLodTransitionCell[] = [];

  for (let row = 0; row < params.lowDetailGrid.height; row += 1) {
    for (let column = 0; column < params.lowDetailGrid.width; column += 1) {
      const x = params.lowDetailGrid.minX + column * params.lowDetailGrid.step;
      const y = params.lowDetailGrid.minY + row * params.lowDetailGrid.step;
      const highDetailColumn = Math.round(
        (x - params.highDetailGrid.minX) / params.highDetailGrid.step
      );
      const highDetailRow = Math.round(
        (y - params.highDetailGrid.minY) / params.highDetailGrid.step
      );
      const highDetailSample = getTerrainSplatGridSample(
        params.highDetailGrid,
        highDetailColumn,
        highDetailRow
      );
      const lowDetailSample = getTerrainSplatGridSample(
        params.lowDetailGrid,
        column,
        row
      );
      const highDetailActiveLayerIds = [...highDetailSample.entries]
        .map((entry) => entry.layerId)
        .sort();
      const lowDetailActiveLayerIds = [...lowDetailSample.entries]
        .map((entry) => entry.layerId)
        .sort();
      const highDetailDominantLayerId =
        getDominantTerrainSplatLayerId(highDetailSample);
      const lowDetailDominantLayerId =
        getDominantTerrainSplatLayerId(lowDetailSample);
      const dominantLayerChanged =
        highDetailDominantLayerId !== lowDetailDominantLayerId;
      const activeLayerSetChanged =
        highDetailActiveLayerIds.join('|') !== lowDetailActiveLayerIds.join('|');

      cells.push({
        column,
        row,
        x,
        y,
        highDetailDominantLayerId,
        lowDetailDominantLayerId,
        highDetailActiveLayerIds,
        lowDetailActiveLayerIds,
        dominantLayerChanged,
        activeLayerSetChanged,
        requiresCrossfade: dominantLayerChanged || activeLayerSetChanged,
      });
    }
  }

  const changedCellCount = cells.filter((cell) => cell.requiresCrossfade).length;

  return {
    highDetailStep: params.highDetailGrid.step,
    lowDetailStep: params.lowDetailGrid.step,
    cellCount: cells.length,
    changedCellCount,
    requiresCrossfade: changedCellCount > 0,
    cells,
  };
}

export function resolveTerrainSplatLodCrossfadeWeights(params: {
  distance: number;
  fadeStart: number;
  fadeEnd: number;
}): TerrainSplatLodCrossfadeWeights {
  const fadeStart = Math.max(0, params.fadeStart);
  const fadeEnd = Math.max(fadeStart, params.fadeEnd);
  const progress =
    fadeEnd === fadeStart
      ? params.distance >= fadeEnd
        ? 1
        : 0
      : clamp01((params.distance - fadeStart) / (fadeEnd - fadeStart));

  return {
    highDetailWeight: 1 - progress,
    lowDetailWeight: progress,
  };
}

function assertCompatibleLodTransitionGrids(
  highDetailGrid: TerrainSplatSampleGrid,
  lowDetailGrid: TerrainSplatSampleGrid
): void {
  if (
    highDetailGrid.minX !== lowDetailGrid.minX ||
    highDetailGrid.maxX !== lowDetailGrid.maxX ||
    highDetailGrid.minY !== lowDetailGrid.minY ||
    highDetailGrid.maxY !== lowDetailGrid.maxY
  ) {
    throw new Error(
      'Terrain splat LOD transition grids must share the same world bounds.'
    );
  }
  if (lowDetailGrid.step < highDetailGrid.step) {
    throw new Error(
      `Terrain splat LOD transition low-detail step ${lowDetailGrid.step} must be at least the high-detail step ${highDetailGrid.step}.`
    );
  }
  if (lowDetailGrid.step % highDetailGrid.step !== 0) {
    throw new Error(
      `Terrain splat LOD transition low-detail step ${lowDetailGrid.step} must divide cleanly by high-detail step ${highDetailGrid.step}.`
    );
  }
}

function getDominantTerrainSplatLayerId(
  sample: TerrainSplatSampleGrid['samples'][number]
): TerrainMaterialLayerId | null {
  let dominantLayerId: TerrainMaterialLayerId | null = null;
  let dominantWeight = -1;
  for (const entry of sample.entries) {
    if (entry.weight > dominantWeight) {
      dominantWeight = entry.weight;
      dominantLayerId = entry.layerId;
    }
  }
  return dominantLayerId;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}
