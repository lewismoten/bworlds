import {
  resolveOverworldContinentUpliftHeight,
  resolveOverworldMountainDetailHeight,
  resolveOverworldRiverCarvingHeight,
  resolveOverworldRouteGradingHeight,
} from '@bworlds/runtime-overworld-relief';
import type { OverworldSignals, TileLike } from '@bworlds/plugin-api';
import {
  createWorldTerrainHeightInfluencePlugin,
  type WorldTerrainHeightInfluencePlugin,
} from './terrain-height-influences.ts';

export function createDefaultTerrainHeightInfluencePlugins(params: {
  sampleTerrainSignals: (worldX: number, worldY: number) => OverworldSignals;
  sampleSurfaceKind: (worldX: number, worldY: number) => TileLike['kind'];
}): WorldTerrainHeightInfluencePlugin[] {
  return [
    createWorldTerrainHeightInfluencePlugin({
      id: 'continent-uplift',
      order: {
        priority: 10,
      },
      sampling: {
        resolutions: ['coarse', 'fine'],
      },
      sample({ worldX, worldY }) {
        return {
          amount: resolveOverworldContinentUpliftHeight(
            params.sampleTerrainSignals(worldX, worldY).elevation,
            {
              kind: params.sampleSurfaceKind(worldX, worldY),
            }
          ),
          reason: 'broad continent uplift from the shared elevation field',
        };
      },
    }),
    createWorldTerrainHeightInfluencePlugin({
      id: 'mountain-detail',
      order: {
        priority: 20,
        after: ['continent-uplift'],
      },
      sampling: {
        resolutions: ['coarse', 'fine'],
      },
      sample({ worldX, worldY }) {
        return {
          amount: resolveOverworldMountainDetailHeight(
            params.sampleTerrainSignals(worldX, worldY).elevation,
            {
              kind: params.sampleSurfaceKind(worldX, worldY),
            }
          ),
          reason:
            'late mountain and plateau detail from high-elevation terrain',
        };
      },
    }),
    createWorldTerrainHeightInfluencePlugin({
      id: 'river-carving',
      order: {
        priority: 30,
        after: ['mountain-detail'],
      },
      sampling: {
        resolutions: ['coarse', 'fine'],
      },
      sample({ worldX, worldY }) {
        return {
          amount: resolveOverworldRiverCarvingHeight(
            params.sampleTerrainSignals(worldX, worldY).riverSignal,
            {
              kind: params.sampleSurfaceKind(worldX, worldY),
            }
          ),
          reason:
            'subtracts shallow river-carved relief near strong river signals',
        };
      },
    }),
    createWorldTerrainHeightInfluencePlugin({
      id: 'route-grading',
      order: {
        priority: 40,
        after: ['river-carving'],
      },
      sampling: {
        resolutions: ['coarse', 'fine'],
      },
      sample({ worldX, worldY }) {
        return {
          amount: resolveOverworldRouteGradingHeight(
            params.sampleTerrainSignals(worldX, worldY).roadSignal,
            {
              kind: params.sampleSurfaceKind(worldX, worldY),
            }
          ),
          reason: 'slightly flattens shared road relief after river carving',
        };
      },
    }),
  ];
}
