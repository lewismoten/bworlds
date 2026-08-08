import { cardinalFromAngle } from '@bworlds/core';
import { createContextMapPlugin, createExitMapAction } from '@bworlds/map-support';
import type {
  Kind,
  RuntimePlugin,
  WorldContextLike,
  WorldMapLike,
  WorldStateLike,
} from '@bworlds/plugin-api';

const PLANE_RUNWAY_CHECK_DISTANCE = 3;
const PLANE_MIN_FLIGHT_DISTANCE = 16;
const PLANE_MAX_FLIGHT_DISTANCE = 36;
const PLANE_RUNWAY_SUPPORT_KINDS = new Set(['rail', 'station', 'road']);
const PLANE_BLOCKED_TILE_KINDS = new Set(['ocean', 'river', 'mountain', 'wall']);

type Point = { x: number; y: number };
type TileSampler = (x: number, y: number, state?: WorldStateLike) => { kind: Kind };

export type PlaneContext = WorldContextLike & {
  origin: Point;
  destination: Point;
};

export function createPlaneMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<PlaneContext>({
    name: 'map-plane',
    contextType: 'plane',
    createMap(context) {
      return createPlaneMap(context);
    },
  });
}

export function createPlaneMap(context: PlaneContext): WorldMapLike {
  function getTile(x: number, y: number) {
    if (Math.abs(x) > 3 || Math.abs(y) > 3) {
      return { kind: 'wall' };
    }
    if (x === 0 && y === -2) {
      return {
        kind: 'door',
        note: 'Press X to roll the plane onto a clear landing strip below.',
      };
    }
    if (x === 0 && y === 0) {
      return {
        kind: 'interior',
        note: 'The plane frame rattles lightly while its propeller keeps steady thrust.',
      };
    }
    if (Math.abs(x) <= 2 && y >= -2 && y <= 1) {
      return {
        kind: 'floor',
        note: 'Wind buffets the fuselage as the plane crosses the open sky.',
      };
    }
    return { kind: 'wall', note: 'Clouds and distant ground blur beyond the plane canopy.' };
  }

  function getAction() {
    return null;
  }

  function getExit(x?: number, y?: number) {
    if (x === 0 && y === -2) {
      return createExitMapAction(context.destination);
    }
    return null;
  }

  return { getTile, getAction, getExit };
}

export function isPlaneLaunchableLandTile({
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
}): boolean {
  const tile = sampleTile(x, y, state);
  if (!isWalkable(tile.kind) || PLANE_BLOCKED_TILE_KINDS.has(tile.kind)) {
    return false;
  }
  const direction = getDirectionVector(cardinalFromAngle(facing));
  let sawSupport = PLANE_RUNWAY_SUPPORT_KINDS.has(tile.kind);
  for (let distance = 1; distance <= PLANE_RUNWAY_CHECK_DISTANCE; distance += 1) {
    const sampleX = x + direction.x * distance;
    const sampleY = y + direction.y * distance;
    const nextTile = sampleTile(sampleX, sampleY, state);
    if (!isWalkable(nextTile.kind) || PLANE_BLOCKED_TILE_KINDS.has(nextTile.kind)) {
      return false;
    }
    if (PLANE_RUNWAY_SUPPORT_KINDS.has(nextTile.kind)) {
      sawSupport = true;
    }
  }
  return sawSupport;
}

export function findPlaneLandingPoint({
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
    let distance = PLANE_MIN_FLIGHT_DISTANCE;
    distance <= PLANE_MAX_FLIGHT_DISTANCE;
    distance += 1
  ) {
    const lateralRadius = Math.min(2, Math.floor(distance / 12));
    for (let offset = 0; offset <= lateralRadius; offset += 1) {
      for (const sign of offset === 0 ? [0] : [-1, 1]) {
        const sampleX = x + direction.x * distance + lateral.x * offset * sign;
        const sampleY = y + direction.y * distance + lateral.y * offset * sign;
        const tile = sampleTile(sampleX, sampleY, state);
        if (!isWalkable(tile.kind) || PLANE_BLOCKED_TILE_KINDS.has(tile.kind)) {
          continue;
        }
        const touchdown = hasTouchdownRun({
          x: sampleX,
          y: sampleY,
          direction,
          sampleTile,
          isWalkable,
          state,
        });
        if (touchdown) {
          return { x: sampleX, y: sampleY };
        }
      }
    }
  }
  return null;
}

function hasTouchdownRun({
  x,
  y,
  direction,
  sampleTile,
  isWalkable,
  state,
}: {
  x: number;
  y: number;
  direction: Point;
  sampleTile: TileSampler;
  isWalkable(kind: Kind): boolean;
  state?: WorldStateLike;
}): boolean {
  for (let distance = 0; distance <= 2; distance += 1) {
    const tile = sampleTile(x + direction.x * distance, y + direction.y * distance, state);
    if (!isWalkable(tile.kind) || PLANE_BLOCKED_TILE_KINDS.has(tile.kind)) {
      return false;
    }
  }
  return true;
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
