import { cardinalFromAngle } from '@bworlds/core';
import {
  createContextMapPlugin,
  createExitMapAction,
} from '@bworlds/map-support';
import type {
  Kind,
  RuntimePlugin,
  WorldContextLike,
  WorldMapLike,
  WorldStateLike,
} from '@bworlds/plugin-api';

const BLIMP_LAUNCH_SEARCH_RADIUS = 1;
const BLIMP_MIN_FLIGHT_DISTANCE = 12;
const BLIMP_MAX_FLIGHT_DISTANCE = 30;
const BLIMP_LAUNCH_SUPPORT_KINDS = new Set(['dock', 'station', 'town']);
const BLIMP_BLOCKED_TILE_KINDS = new Set([
  'ocean',
  'river',
  'mountain',
  'wall',
]);

type Point = { x: number; y: number };
type TileSampler = (
  x: number,
  y: number,
  state?: WorldStateLike
) => { kind: Kind };

export type BlimpContext = WorldContextLike & {
  origin: Point;
  destination: Point;
};

export function createBlimpMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<BlimpContext>({
    name: 'map-blimp',
    contextType: 'blimp',
    createMap(context) {
      return createBlimpMap(context);
    },
  });
}

export function createBlimpMap(context: BlimpContext): WorldMapLike {
  function getTile(x: number, y: number) {
    if (Math.abs(x) > 3 || Math.abs(y) > 3) {
      return { kind: 'wall' };
    }
    if (x === 0 && y === -2) {
      return {
        kind: 'door',
        note: 'Press X to moor the blimp at the next clear landing berth.',
      };
    }
    if (x === 0 && y === 0) {
      return {
        kind: 'interior',
        note: 'The blimp gondola hums softly beneath its buoyant gas cells.',
      };
    }
    if (Math.abs(x) <= 2 && y >= -2 && y <= 1) {
      return {
        kind: 'floor',
        note: 'Rigging lines sway while the blimp cruises above the countryside.',
      };
    }
    return {
      kind: 'wall',
      note: 'Cloud-shadowed sky stretches away beyond the blimp rail.',
    };
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

export function isBlimpLaunchableLandTile({
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
  if (!isWalkable(tile.kind) || BLIMP_BLOCKED_TILE_KINDS.has(tile.kind)) {
    return false;
  }
  for (
    let offsetY = -BLIMP_LAUNCH_SEARCH_RADIUS;
    offsetY <= BLIMP_LAUNCH_SEARCH_RADIUS;
    offsetY += 1
  ) {
    for (
      let offsetX = -BLIMP_LAUNCH_SEARCH_RADIUS;
      offsetX <= BLIMP_LAUNCH_SEARCH_RADIUS;
      offsetX += 1
    ) {
      if (offsetX === 0 && offsetY === 0) {
        continue;
      }
      if (
        BLIMP_LAUNCH_SUPPORT_KINDS.has(
          sampleTile(x + offsetX, y + offsetY, state).kind
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

export function findBlimpLandingPoint({
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
    let distance = BLIMP_MIN_FLIGHT_DISTANCE;
    distance <= BLIMP_MAX_FLIGHT_DISTANCE;
    distance += 1
  ) {
    const lateralRadius = Math.min(4, 1 + Math.floor(distance / 10));
    for (let offset = 0; offset <= lateralRadius; offset += 1) {
      for (const sign of offset === 0 ? [0] : [-1, 1]) {
        const sampleX = x + direction.x * distance + lateral.x * offset * sign;
        const sampleY = y + direction.y * distance + lateral.y * offset * sign;
        const tile = sampleTile(sampleX, sampleY, state);
        if (!isWalkable(tile.kind) || BLIMP_BLOCKED_TILE_KINDS.has(tile.kind)) {
          continue;
        }
        return { x: sampleX, y: sampleY };
      }
    }
  }
  return null;
}

function getDirectionVector(
  cardinal: ReturnType<typeof cardinalFromAngle>
): Point {
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
