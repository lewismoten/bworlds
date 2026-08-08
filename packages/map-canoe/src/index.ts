import { createContextMapPlugin } from '@bworlds/map-support';
import type { Kind, Point, RuntimePlugin, WorldStateLike } from '@bworlds/plugin-api';
import { isWaterKind, isWaterOrCrossingKind } from '@bworlds/tile-support';
import {
  createWatercraftMap,
  findNearestWatercraftLandingPoint,
  findNearestWatercraftLaunchPoint,
  type TileSampler,
  type WatercraftContext,
} from '@bworlds/watercraft-support';

const NEAR_SHORE_OCEAN_RADIUS = 3;
const LAUNCH_SEARCH_RADIUS = 2;
const LANDING_SEARCH_RADIUS = 2;

export type CanoeContext = WatercraftContext;

export function createCanoeMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<CanoeContext>({
    name: 'map-canoe',
    contextType: 'canoe',
    createMap(context, seed, plugins) {
      return createWatercraftMap({
        context,
        seed,
        plugins,
        isNavigableTile: ({ x, y, sampleTile, state }) =>
          isCanoeNavigableTile({ x, y, sampleTile, state }),
        landingSearchRadius: LANDING_SEARCH_RADIUS,
        canLandTileKind(kind) {
          return kind === 'shore' || kind === 'dock' || !isWaterKind(kind);
        },
      });
    },
  });
}

export function findNearestCanoeLaunchPoint({
  x,
  y,
  sampleTile,
  state,
}: {
  x: number;
  y: number;
  sampleTile: TileSampler;
  state?: WorldStateLike;
}): Point | null {
  return findNearestWatercraftLaunchPoint({
    x,
    y,
    sampleTile,
    state,
    canNavigate: ({ x, y, sampleTile, state }) =>
      isCanoeNavigableTile({ x, y, sampleTile, state }),
    searchRadius: LAUNCH_SEARCH_RADIUS,
  });
}

export function findNearestCanoeLandingPoint({
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
}): Point | null {
  return findNearestWatercraftLandingPoint({
    x,
    y,
    sampleTile,
    isWalkable,
    canNavigate: ({ x, y, sampleTile, state }) =>
      isCanoeNavigableTile({ x, y, sampleTile, state }),
    state,
    searchRadius: LANDING_SEARCH_RADIUS,
    canLandTileKind(kind) {
      return kind === 'shore' || kind === 'dock' || !isWaterKind(kind);
    },
  });
}

export function isCanoeNavigableTile({
  x,
  y,
  sampleTile,
  state,
}: {
  x: number;
  y: number;
  sampleTile: TileSampler;
  state?: WorldStateLike;
}): boolean {
  const tile = sampleTile(x, y, state);
  if (tile.kind === 'river' || tile.kind === 'dock' || tile.kind === 'shore') {
    return true;
  }
  if (tile.kind !== 'ocean') {
    return false;
  }
  return hasNearbyCoast(x, y, sampleTile, state, NEAR_SHORE_OCEAN_RADIUS);
}

function hasNearbyCoast(
  x: number,
  y: number,
  sampleTile: TileSampler,
  state?: WorldStateLike,
  radius = NEAR_SHORE_OCEAN_RADIUS
) {
  for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
    for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
      if (offsetX === 0 && offsetY === 0) {
        continue;
      }
      const tile = sampleTile(x + offsetX, y + offsetY, state);
      if (isCoastTile(tile.kind)) {
        return true;
      }
    }
  }
  return false;
}

function isCoastTile(kind: Kind) {
  if (kind === 'shore' || kind === 'dock') {
    return true;
  }
  return !isWaterOrCrossingKind(kind);
}
