import { getOrCreateMapValue } from '@bworlds/cache-support';
import { createExitMapAction } from '@bworlds/map-support';
import {
  composeOverworldTileFromPlugins,
  createOverworldTerrainSignalSampler,
} from '@bworlds/overworld-support';
import type {
  CreateMapContext,
  Kind,
  Point,
  Seed,
  TileLike,
  WorldContextLike,
  WorldMapLike,
  WorldStateLike,
} from '@bworlds/plugin-api';

export type WatercraftContext = WorldContextLike & {
  origin: Point;
};

export type TileSampler = (
  x: number,
  y: number,
  state?: WorldStateLike
) => TileLike;

type WatercraftTilePredicate = (options: {
  x: number;
  y: number;
  sampleTile: TileSampler;
  state?: WorldStateLike;
}) => boolean;

export function createWatercraftMap({
  context,
  seed,
  plugins,
  isNavigableTile,
  landingSearchRadius,
  canLandTileKind,
}: {
  context: WatercraftContext;
  seed: Seed;
  plugins: CreateMapContext['plugins'];
  isNavigableTile: WatercraftTilePredicate;
  landingSearchRadius: number;
  canLandTileKind?: (kind: Kind) => boolean;
}): WorldMapLike {
  const cache = new Map<string, TileLike>();
  const sampleTerrainSignals = createOverworldTerrainSignalSampler(seed);
  const defaultTileKind = plugins.getDefaultTileKind();
  let activeRevision = -1;

  function classifyGlobalTile(
    x: number,
    y: number,
    state?: WorldStateLike
  ): TileLike {
    return composeOverworldTileFromPlugins({
      seed,
      x,
      y,
      sampleTerrainSignals,
      plugins,
      initialTile: { kind: defaultTileKind },
      state,
    });
  }

  function getTile(localX: number, localY: number, state?: WorldStateLike) {
    const nextRevision =
      typeof (state as { overworldTileRevision?: unknown } | undefined)
        ?.overworldTileRevision === 'number'
        ? ((state as { overworldTileRevision?: number }).overworldTileRevision ?? 0)
        : 0;
    if (nextRevision !== activeRevision) {
      cache.clear();
      activeRevision = nextRevision;
    }
    const key = `${localX}:${localY}`;
    return getOrCreateMapValue(cache, key, () =>
      classifyGlobalTile(
        context.origin.x + localX,
        context.origin.y + localY,
        state
      )
    );
  }

  function canWalk(localX: number, localY: number, state?: WorldStateLike) {
    return isNavigableTile({
      x: context.origin.x + Math.round(localX),
      y: context.origin.y + Math.round(localY),
      sampleTile: classifyGlobalTile,
      state,
    });
  }

  function getAction() {
    return null;
  }

  function getExit(localX = 0, localY = 0) {
    const landing = findNearestWatercraftLandingPoint({
      x: context.origin.x + localX,
      y: context.origin.y + localY,
      sampleTile: classifyGlobalTile,
      isWalkable(kind) {
        return Boolean(plugins.getTileDefinition(kind)?.walkable);
      },
      canNavigate: isNavigableTile,
      searchRadius: landingSearchRadius,
      canLandTileKind,
    });
    if (!landing) {
      return null;
    }
    return createExitMapAction(landing);
  }

  return { getTile, canWalk, getAction, getExit };
}

export function findNearestWatercraftLaunchPoint({
  x,
  y,
  sampleTile,
  state,
  canNavigate,
  searchRadius,
}: {
  x: number;
  y: number;
  sampleTile: TileSampler;
  state?: WorldStateLike;
  canNavigate: WatercraftTilePredicate;
  searchRadius: number;
}): Point | null {
  for (const offset of getSearchOffsets(searchRadius)) {
    const point = { x: x + offset.x, y: y + offset.y };
    if (
      canNavigate({
        x: point.x,
        y: point.y,
        sampleTile,
        state,
      })
    ) {
      return point;
    }
  }
  return null;
}

export function findNearestWatercraftLandingPoint({
  x,
  y,
  sampleTile,
  isWalkable,
  canNavigate,
  state,
  searchRadius,
  canLandTileKind,
}: {
  x: number;
  y: number;
  sampleTile: TileSampler;
  isWalkable(kind: Kind): boolean;
  canNavigate: WatercraftTilePredicate;
  state?: WorldStateLike;
  searchRadius: number;
  canLandTileKind?: (kind: Kind) => boolean;
}): Point | null {
  for (const offset of getSearchOffsets(searchRadius)) {
    const point = { x: x + offset.x, y: y + offset.y };
    const tile = sampleTile(point.x, point.y, state);
    if (
      !isWalkable(tile.kind) ||
      (typeof canLandTileKind === 'function'
        ? !canLandTileKind(tile.kind)
        : canNavigate({ ...point, sampleTile, state }))
    ) {
      continue;
    }
    if (
      findNearestWatercraftLaunchPoint({
        x: point.x,
        y: point.y,
        sampleTile,
        state,
        canNavigate,
        searchRadius,
      })
    ) {
      return point;
    }
  }
  return null;
}

export function hasNearbyKind(
  x: number,
  y: number,
  sampleTile: TileSampler,
  matches: (kind: Kind) => boolean,
  state?: WorldStateLike,
  radius = 1
) {
  for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
    for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
      if (offsetX === 0 && offsetY === 0) {
        continue;
      }
      if (matches(sampleTile(x + offsetX, y + offsetY, state).kind)) {
        return true;
      }
    }
  }
  return false;
}

function getSearchOffsets(radius: number): Point[] {
  const offsets: Point[] = [{ x: 0, y: 0 }];
  for (let step = 1; step <= radius; step += 1) {
    const ring: Point[] = [];
    for (let y = -step; y <= step; y += 1) {
      for (let x = -step; x <= step; x += 1) {
        if (Math.max(Math.abs(x), Math.abs(y)) !== step) {
          continue;
        }
        ring.push({ x, y });
      }
    }
    ring.sort(
      (left, right) =>
        Math.abs(left.x) +
          Math.abs(left.y) -
          (Math.abs(right.x) + Math.abs(right.y)) ||
        Math.abs(left.x) - Math.abs(right.x) ||
        Math.abs(left.y) - Math.abs(right.y)
    );
    offsets.push(...ring);
  }
  return offsets;
}
