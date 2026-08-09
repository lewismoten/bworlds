import { createBoundedCache } from '@bworlds/cache-support';
import { getDockBoatPlacements } from '@bworlds/dock-route-support';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type { RuntimePlugin } from '@bworlds/plugin-api';

const REGION_SIZE = 24;
const SEARCH_RADIUS = 72;
const TIME_BUCKET_MS = 2_000;
export const DOCK_TRAFFIC_CACHE_MAX_ENTRIES = 256;

export function createDockTrafficRuntimePlugin({
  cacheMaxEntries = DOCK_TRAFFIC_CACHE_MAX_ENTRIES,
}: {
  cacheMaxEntries?: number;
} = {}): RuntimePlugin {
  const cache = createBoundedCache<string, ReturnType<typeof getDockBoatPlacements>>(
    cacheMaxEntries
  );
  let resolvingPlacements = false;

  return createRuntimePlugin('runtime-dock-traffic', {
    decorateOverworldTile({ seed, x, y, tile, state }) {
      if (
        (tile.kind !== 'ocean' && tile.kind !== 'bridge' && tile.kind !== 'dock') ||
        typeof state?.timeMs !== 'number'
      ) {
        return tile;
      }
      if (resolvingPlacements) {
        return tile;
      }

      const regionX = Math.floor(x / REGION_SIZE);
      const regionY = Math.floor(y / REGION_SIZE);
      const timeBucket = Math.floor(state.timeMs / TIME_BUCKET_MS);
      const contextId = state.getCurrentContext().id;
      const cacheKey = `${seed}:${contextId}:${regionX}:${regionY}:${timeBucket}`;

      const placements = cache.getOrCreate(cacheKey, () => {
        resolvingPlacements = true;
        try {
          return getDockBoatPlacements(
            state,
            state.timeMs,
            regionX * REGION_SIZE,
            regionY * REGION_SIZE,
            SEARCH_RADIUS
          );
        } finally {
          resolvingPlacements = false;
        }
      });

      const boat = placements.find((placement) => placement.x === x && placement.y === y);
      if (!boat) {
        return tile;
      }

      tile.boat = boat;
      tile.note = `${boat.boatName} paddle boat sails between ${boat.from} and ${boat.to}.`;
      return tile;
    },
  });
}
