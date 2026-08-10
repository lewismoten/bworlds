import { createContextMapPlugin } from '@bworlds/map-support';
import type { Kind, RuntimePlugin, WorldStateLike } from '@bworlds/plugin-api';
import {
  createWatercraftMap,
  findNearestWatercraftLaunchPoint,
  hasNearbyKind,
  type TileSampler,
  type WatercraftContext,
} from '@bworlds/watercraft-support';

const BOAT_LAUNCH_SEARCH_RADIUS = 2;
const BOAT_LANDING_SEARCH_RADIUS = 3;

export type BoatContext = WatercraftContext;

export function createBoatMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<BoatContext>({
    name: 'map-boat',
    contextType: 'boat',
    createMap(context, seed, plugins) {
      return createWatercraftMap({
        context,
        seed,
        plugins,
        isNavigableTile: ({ x, y, sampleTile, state }) =>
          isBoatNavigableTile({ x, y, sampleTile, state }),
        landingSearchRadius: BOAT_LANDING_SEARCH_RADIUS,
        canLandTileKind(kind) {
          return kind === 'shore' || kind === 'dock' || kind !== 'ocean';
        },
      });
    },
  });
}

export function findNearestBoatLaunchPoint({
  x,
  y,
  sampleTile,
  state,
}: {
  x: number;
  y: number;
  sampleTile: TileSampler;
  state?: WorldStateLike;
}) {
  return findNearestWatercraftLaunchPoint({
    x,
    y,
    sampleTile,
    state,
    canNavigate: ({ x, y, sampleTile, state }) =>
      isBoatNavigableTile({ x, y, sampleTile, state }),
    searchRadius: BOAT_LAUNCH_SEARCH_RADIUS,
  });
}

export function isBoatNavigableTile({
  x,
  y,
  sampleTile,
  state,
}: {
  x: number;
  y: number;
  sampleTile: TileSampler;
  state?: WorldStateLike;
}) {
  const kind = sampleTile(x, y, state).kind;
  return kind === 'dock' || kind === 'shore' || kind === 'ocean';
}

export function isBoatLaunchableLandTile({
  x,
  y,
  sampleTile,
  isWalkable,
  state,
}: {
  x: number;
  y: number;
  sampleTile: TileSampler;
  isWalkable(kind: Kind): boolean;
  state?: WorldStateLike;
}) {
  const tile = sampleTile(x, y, state);
  if (
    !isWalkable(tile.kind) ||
    isBoatNavigableTile({ x, y, sampleTile, state })
  ) {
    return false;
  }
  return hasNearbyKind(
    x,
    y,
    sampleTile,
    (kind) => kind === 'shore' || kind === 'dock' || kind === 'ocean',
    state,
    BOAT_LAUNCH_SEARCH_RADIUS
  );
}
