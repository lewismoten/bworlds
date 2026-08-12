import type { TerrainSurfaceRenderMode, TileLike } from '@bworlds/plugin-api';
import { createTerrainRouteRenderPlan } from '@bworlds/terrain-splat-support/route-render-plan';

export type TileTerrainSurfaceSelection = {
  activeMode: TerrainSurfaceRenderMode;
  sharedSplatEligible: boolean;
  reason: string;
};

export function resolveTileTerrainSurfaceSelection(
  tile: Pick<TileLike, 'kind'>
): TileTerrainSurfaceSelection {
  if (tile.kind === 'road' || tile.kind === 'bridge' || tile.kind === 'dock') {
    const routePlan = createTerrainRouteRenderPlan({
      kind: tile.kind,
      dirtRoadLayerId: 'road-dirt',
      gravelRoadLayerId: 'road-gravel',
      stoneRoadLayerId: 'road-stone',
      muddyRoadLayerId: 'road-mud',
      dirtTrailLayerId: 'trail-dirt',
      gravelTrailLayerId: 'trail-gravel',
      grassTrailLayerId: 'trail-grass',
    });
    return {
      activeMode: 'legacy-mesh',
      sharedSplatEligible:
        routePlan.mode === 'splat' && routePlan.removeSeparateRoadMesh,
      reason: routePlan.reason,
    };
  }

  return {
    activeMode: 'legacy-mesh',
    sharedSplatEligible: false,
    reason: 'renderer still uses legacy terrain mesh and shared floor batches',
  };
}

export function resolveTileTerrainSurfaceMode(
  tile: Pick<TileLike, 'kind'>
): TerrainSurfaceRenderMode {
  return resolveTileTerrainSurfaceSelection(tile).activeMode;
}
