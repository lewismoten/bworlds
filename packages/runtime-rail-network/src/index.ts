import { createRuntimePlugin } from '@bworlds/plugin-api';
import { resolveRailTile } from '@bworlds/rail-support';
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
  });
}
