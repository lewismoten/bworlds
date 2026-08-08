import { createRuntimePlugin } from '@bworlds/plugin-api';
import { getRailTrainPlacements, resolveRailTile } from '@bworlds/rail-support';
import type { RuntimePlugin } from '@bworlds/plugin-api';

export function createRailNetworkRuntimePlugin(): RuntimePlugin {
  const cache = new Map<string, ReturnType<typeof resolveRailTile>>();
  return createRuntimePlugin('runtime-rail-network', {
    resolveOverworldTile({ seed, x, y, sampleTerrainSignals }) {
      const key = `${seed}:${x}:${y}`;
      if (!cache.has(key)) {
        cache.set(
          key,
          resolveRailTile({
            seed,
            x,
            y,
            sampleTerrainSignals,
          })
        );
      }
      return cache.get(key) ?? null;
    },
    decorateOverworldTile({ seed, x, y, tile, state, sampleTerrainSignals }) {
      if (tile.kind !== 'rail') {
        return tile;
      }
      const timeMs = state?.timeMs;
      if (typeof timeMs !== 'number' || typeof sampleTerrainSignals !== 'function') {
        return tile;
      }

      const train = getRailTrainPlacements({
        seed,
        timeMs,
        x,
        y,
        sampleTerrainSignals,
      }).find((placement) => placement.x === x && placement.y === y);

      if (train) {
        tile.train = train;
        tile.note = `${train.lineName} passes between ${train.from} and ${train.to}.`;
      }
      return tile;
    },
  });
}
