import { createRuntimePlugin } from '@bworlds/plugin-api';
import { getRailTrainPlacements, resolveRailTile } from '@bworlds/rail-support';
import type { RuntimePlugin } from '@bworlds/plugin-api';

export function createRailNetworkRuntimePlugin(): RuntimePlugin {
  return createRuntimePlugin('runtime-rail-network', {
    resolveOverworldTile({ seed, x, y, sampleTerrainSignals }) {
      return (
        resolveRailTile({
          seed,
          x,
          y,
          sampleTerrainSignals,
        }) ?? null
      );
    },
    decorateOverworldTile({ seed, x, y, tile, state, sampleTerrainSignals }) {
      if (tile.kind !== 'rail') {
        return tile;
      }
      const timeMs = state?.timeMs;
      if (
        typeof timeMs !== 'number' ||
        typeof sampleTerrainSignals !== 'function'
      ) {
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
