import { cardinalFromAngle } from '@bworlds/core';
import { createContextMapPlugin, createExitMapAction } from '@bworlds/map-support';
import type {
  Kind,
  RuntimePlugin,
  WorldContextLike,
  WorldMapLike,
  WorldStateLike,
} from '@bworlds/plugin-api';

const BALLOON_LAUNCH_SEARCH_RADIUS = 1;
const BALLOON_MIN_FLIGHT_DISTANCE = 8;
const BALLOON_MAX_FLIGHT_DISTANCE = 24;
const BALLOON_LAUNCH_SUPPORT_KINDS = new Set([
  'road',
  'town',
  'dock',
  'station',
  'shore',
]);
const BALLOON_BLOCKED_TILE_KINDS = new Set(['ocean', 'river', 'mountain', 'wall']);

type Point = { x: number; y: number };
type TileSampler = (x: number, y: number, state?: WorldStateLike) => { kind: Kind };

export type BalloonContext = WorldContextLike & {
  origin: Point;
  destination: Point;
};

export function createBalloonMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<BalloonContext>({
    name: 'map-balloon',
    contextType: 'balloon',
    createMap(context) {
      return createBalloonMap(context);
    },
  });
}

export function createBalloonMap(context: BalloonContext): WorldMapLike {
  function getTile(x: number, y: number) {
    if (Math.abs(x) > 2 || Math.abs(y) > 3) {
      return { kind: 'wall' };
    }
    if (x === 0 && y === -2) {
      return {
        kind: 'door',
        note: 'Press X to set the balloon down on the next clear landing field.',
      };
    }
    if (x === 0 && y === 0) {
      return {
        kind: 'interior',
        note: 'The balloon basket sways gently beneath the wind-filled envelope.',
      };
    }
    if (Math.abs(x) <= 1 && y >= -2 && y <= 1) {
      return {
        kind: 'floor',
        note: 'Ropes creak softly while the balloon drifts along the breeze.',
      };
    }
    return { kind: 'wall', note: 'Open air stretches away beyond the basket rim.' };
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

export function isBalloonLaunchableLandTile({
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
  if (!isWalkable(tile.kind) || BALLOON_BLOCKED_TILE_KINDS.has(tile.kind)) {
    return false;
  }
  for (
    let offsetY = -BALLOON_LAUNCH_SEARCH_RADIUS;
    offsetY <= BALLOON_LAUNCH_SEARCH_RADIUS;
    offsetY += 1
  ) {
    for (
      let offsetX = -BALLOON_LAUNCH_SEARCH_RADIUS;
      offsetX <= BALLOON_LAUNCH_SEARCH_RADIUS;
      offsetX += 1
    ) {
      if (offsetX === 0 && offsetY === 0) {
        continue;
      }
      if (BALLOON_LAUNCH_SUPPORT_KINDS.has(sampleTile(x + offsetX, y + offsetY, state).kind)) {
        return true;
      }
    }
  }
  return false;
}

export function findBalloonLandingPoint({
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
    let distance = BALLOON_MIN_FLIGHT_DISTANCE;
    distance <= BALLOON_MAX_FLIGHT_DISTANCE;
    distance += 1
  ) {
    const lateralRadius = Math.min(3, 1 + Math.floor(distance / 8));
    for (let offset = 0; offset <= lateralRadius; offset += 1) {
      for (const sign of offset === 0 ? [0] : [-1, 1]) {
        const sampleX = x + direction.x * distance + lateral.x * offset * sign;
        const sampleY = y + direction.y * distance + lateral.y * offset * sign;
        const tile = sampleTile(sampleX, sampleY, state);
        if (!isWalkable(tile.kind) || BALLOON_BLOCKED_TILE_KINDS.has(tile.kind)) {
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
