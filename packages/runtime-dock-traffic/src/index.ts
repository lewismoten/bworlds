import { getDockBoatPlacements } from '@bworlds/dock-route-support';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type { RuntimePlugin } from '@bworlds/plugin-api';

const REGION_SIZE = 24;
const SEARCH_RADIUS = 72;
const TIME_BUCKET_MS = 2_000;

export function createDockTrafficRuntimePlugin(): RuntimePlugin {
  const cache = new Map<string, ReturnType<typeof getDockBoatPlacements>>();

  return createRuntimePlugin('runtime-dock-traffic', {
    decorateOverworldTile({ seed, x, y, tile, state }) {
      if (
        (tile.kind !== 'ocean' && tile.kind !== 'bridge' && tile.kind !== 'dock') ||
        typeof state?.timeMs !== 'number'
      ) {
        return tile;
      }

      const regionX = Math.floor(x / REGION_SIZE);
      const regionY = Math.floor(y / REGION_SIZE);
      const timeBucket = Math.floor(state.timeMs / TIME_BUCKET_MS);
      const contextId = state.getCurrentContext().id;
      const cacheKey = `${seed}:${contextId}:${regionX}:${regionY}:${timeBucket}`;

      if (!cache.has(cacheKey)) {
        cache.set(
          cacheKey,
          getDockBoatPlacements(
            state,
            state.timeMs,
            regionX * REGION_SIZE,
            regionY * REGION_SIZE,
            SEARCH_RADIUS
          )
        );
      }

      const boat = cache.get(cacheKey)?.find((placement) => placement.x === x && placement.y === y);
      if (!boat) {
        return tile;
      }

      tile.boat = boat;
      tile.note = `${boat.boatName} paddle boat sails between ${boat.from} and ${boat.to}.`;
      return tile;
    },
  });
}
