import { cardinalFromAngle } from '@bworlds/core';
import { createContextMapPlugin, createExitMapAction } from '@bworlds/map-support';
import type {
  Kind,
  RuntimePlugin,
  WorldContextLike,
  WorldMapLike,
  WorldStateLike,
} from '@bworlds/plugin-api';

const AIRSHIP_LAUNCH_SEARCH_RADIUS = 1;
const AIRSHIP_MIN_FLIGHT_DISTANCE = 18;
const AIRSHIP_MAX_FLIGHT_DISTANCE = 42;
const AIRSHIP_LAUNCH_SUPPORT_KINDS = new Set(['ship']);
const AIRSHIP_BLOCKED_TILE_KINDS = new Set(['ocean', 'river', 'mountain', 'wall']);

type Point = { x: number; y: number };
type TileSampler = (x: number, y: number, state?: WorldStateLike) => { kind: Kind };

export type AirshipContext = WorldContextLike & {
  origin: Point;
  destination: Point;
};

export function createAirshipMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<AirshipContext>({
    name: 'map-airship',
    contextType: 'airship',
    createMap(context) {
      return createAirshipMap(context);
    },
  });
}

export function createAirshipMap(context: AirshipContext): WorldMapLike {
  function getTile(x: number, y: number) {
    if (Math.abs(x) > 4 || Math.abs(y) > 5) {
      return { kind: 'wall' };
    }
    if (x === 0 && y === -3) {
      return {
        kind: 'door',
        note: 'Press X to bring the propeller ship down onto the next clear mooring field.',
      };
    }
    if (x === 0 && y === 0) {
      return {
        kind: 'ship',
        note: 'A tall ship with humming propellers cuts through the open sky.',
      };
    }
    if (Math.abs(x) <= 2 && y >= -3 && y <= 2) {
      return {
        kind: 'floor',
        note: 'Deck planks tremble while the propellers pull the ship through the clouds.',
      };
    }
    return { kind: 'wall', note: 'Open air yawns past the rail and turning propellers.' };
  }

  function getAction() {
    return null;
  }

  function getExit(x?: number, y?: number) {
    if (x === 0 && y === -3) {
      return createExitMapAction(context.destination);
    }
    return null;
  }

  return { getTile, getAction, getExit };
}

export function isAirshipLaunchableLandTile({
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
}): boolean {
  const tile = sampleTile(x, y, state);
  if (!isWalkable(tile.kind) || AIRSHIP_BLOCKED_TILE_KINDS.has(tile.kind)) {
    return false;
  }
  for (
    let offsetY = -AIRSHIP_LAUNCH_SEARCH_RADIUS;
    offsetY <= AIRSHIP_LAUNCH_SEARCH_RADIUS;
    offsetY += 1
  ) {
    for (
      let offsetX = -AIRSHIP_LAUNCH_SEARCH_RADIUS;
      offsetX <= AIRSHIP_LAUNCH_SEARCH_RADIUS;
      offsetX += 1
    ) {
      if (offsetX === 0 && offsetY === 0) {
        continue;
      }
      if (AIRSHIP_LAUNCH_SUPPORT_KINDS.has(sampleTile(x + offsetX, y + offsetY, state).kind)) {
        return true;
      }
    }
  }
  return false;
}

export function findAirshipLandingPoint({
  x,
  y,
  facing,
  sampleTile,
  isWalkable,
  state,
}: {
  x: number;
  y: number;
  facing: number;
  sampleTile: TileSampler;
  isWalkable(kind: Kind): boolean;
  state?: WorldStateLike;
}): Point | null {
  const direction = getDirectionVector(cardinalFromAngle(facing));
  const lateral = { x: -direction.y, y: direction.x };
  for (
    let distance = AIRSHIP_MIN_FLIGHT_DISTANCE;
    distance <= AIRSHIP_MAX_FLIGHT_DISTANCE;
    distance += 1
  ) {
    const lateralRadius = Math.min(4, 1 + Math.floor(distance / 10));
    for (let offset = 0; offset <= lateralRadius; offset += 1) {
      for (const sign of offset === 0 ? [0] : [-1, 1]) {
        const sampleX = x + direction.x * distance + lateral.x * offset * sign;
        const sampleY = y + direction.y * distance + lateral.y * offset * sign;
        const tile = sampleTile(sampleX, sampleY, state);
        if (!isWalkable(tile.kind) || AIRSHIP_BLOCKED_TILE_KINDS.has(tile.kind)) {
          continue;
        }
        return { x: sampleX, y: sampleY };
      }
    }
  }
  return null;
}

function getDirectionVector(cardinal: ReturnType<typeof cardinalFromAngle>): Point {
  if (cardinal === 'N') {
    return { x: 0, y: -1 };
  }
  if (cardinal === 'S') {
    return { x: 0, y: 1 };
  }
  if (cardinal === 'W') {
    return { x: -1, y: 0 };
  }
  return { x: 1, y: 0 };
}
