import type {
  Kind,
  TerrainSurfaceRenderMode,
  TileDefinitionLike,
  TileLike,
} from '@bworlds/plugin-api';
import type { TileTerrainSurfaceSelection } from './terrain-surface-mode.ts';

export type LogicalTileRenderState = {
  tileX: number;
  tileY: number;
  tile: TileLike;
  kind: Kind;
  definition: TileDefinitionLike;
  variant: number;
  tilePluginOwnerLabel: string;
  terrainSurfaceSelection: TileTerrainSurfaceSelection;
  terrainSurfaceMode: TerrainSurfaceRenderMode;
};

export function createLogicalTileRenderState(params: {
  tileX: number;
  tileY: number;
  tile: TileLike;
  definition: TileDefinitionLike;
  variant: number;
  tilePluginOwnerLabel: string;
  terrainSurfaceSelection: TileTerrainSurfaceSelection;
}): LogicalTileRenderState {
  return {
    tileX: normalizeFiniteNumber(params.tileX, 'Logical tile tileX'),
    tileY: normalizeFiniteNumber(params.tileY, 'Logical tile tileY'),
    tile: params.tile,
    kind: params.tile.kind,
    definition: params.definition,
    variant: normalizeFiniteNumber(params.variant, 'Logical tile variant'),
    tilePluginOwnerLabel: normalizeNonEmptyString(
      params.tilePluginOwnerLabel,
      'Logical tile tilePluginOwnerLabel'
    ),
    terrainSurfaceSelection: params.terrainSurfaceSelection,
    terrainSurfaceMode: params.terrainSurfaceSelection.activeMode,
  };
}

function normalizeFiniteNumber(value: number, label: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  return value;
}

function normalizeNonEmptyString(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return normalized;
}
