import {
  createContextMapPlugin,
  createExitMapAction,
} from '@bworlds/map-support';
import {
  composeOverworldTileFromPlugins,
  createOverworldTerrainSignalSampler,
} from '@bworlds/overworld-support';
import type {
  CreateMapContext,
  Kind,
  Point,
  RuntimePlugin,
  Seed,
  TileLike,
  WorldContextLike,
  WorldMapLike,
  WorldStateLike,
} from '@bworlds/plugin-api';
import { isWaterKind, isWaterOrCrossingKind } from '@bworlds/tile-support';

export type CanoeContext = WorldContextLike & {
  origin: Point;
};

type TileSampler = (x: number, y: number, state?: WorldStateLike) => TileLike;

const NEAR_SHORE_OCEAN_RADIUS = 3;
const LAUNCH_SEARCH_RADIUS = 2;
const LANDING_SEARCH_RADIUS = 2;

export function createCanoeMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<CanoeContext>({
    name: 'map-canoe',
    contextType: 'canoe',
    createMap: createCanoeMap,
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
  for (const offset of getSearchOffsets(LAUNCH_SEARCH_RADIUS)) {
    const point = { x: x + offset.x, y: y + offset.y };
    if (
      isCanoeNavigableTile({
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
  for (const offset of getSearchOffsets(LANDING_SEARCH_RADIUS)) {
    const point = { x: x + offset.x, y: y + offset.y };
    const tile = sampleTile(point.x, point.y, state);
    if (!isWalkable(tile.kind) || isWaterKind(tile.kind)) {
      continue;
    }
    if (
      findNearestCanoeLaunchPoint({
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

function createCanoeMap(
  context: CanoeContext,
  seed: Seed,
  plugins: CreateMapContext['plugins']
): WorldMapLike {
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
    if (!cache.has(key)) {
      cache.set(
        key,
        classifyGlobalTile(
          context.origin.x + localX,
          context.origin.y + localY,
          state
        )
      );
    }
    return cache.get(key) ?? { kind: defaultTileKind };
  }

  function canWalk(localX: number, localY: number, state?: WorldStateLike) {
    const tileX = Math.round(localX);
    const tileY = Math.round(localY);
    return isCanoeNavigableTile({
      x: context.origin.x + tileX,
      y: context.origin.y + tileY,
      sampleTile: classifyGlobalTile,
      state,
    });
  }

  function getAction() {
    return null;
  }

  function getExit(localX = 0, localY = 0) {
    const globalX = context.origin.x + localX;
    const globalY = context.origin.y + localY;
    const landing = findNearestCanoeLandingPoint({
      x: globalX,
      y: globalY,
      sampleTile: classifyGlobalTile,
      isWalkable(kind) {
        return Boolean(plugins.getTileDefinition(kind)?.walkable);
      },
    });
    if (!landing) {
      return null;
    }
    return createExitMapAction(landing);
  }

  return { getTile, canWalk, getAction, getExit };
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
