import { cardinalFromAngle } from '@bworlds/core';
import {
  createContextMapPlugin,
  createExitMapAction,
} from '@bworlds/map-support';
import type {
  CreateMapContext,
  Kind,
  RuntimePlugin,
  WorldContextLike,
  WorldMapLike,
  WorldStateLike,
} from '@bworlds/plugin-api';

const GLIDER_LAUNCH_SEARCH_RADIUS = 1;
const GLIDER_MIN_FLIGHT_DISTANCE = 4;
const GLIDER_MAX_FLIGHT_DISTANCE = 18;
const GLIDER_LAUNCH_SUPPORT_KINDS = new Set([
  'mountain',
  'observatory',
  'tower',
  'lighthouse',
  'quarry',
]);
const GLIDER_BLOCKED_LANDING_KINDS = new Set([
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

export type GliderContext = WorldContextLike & {
  origin: Point;
  destination: Point;
};

export function createGliderMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<GliderContext>({
    name: 'map-glider',
    contextType: 'glider',
    createMap(context) {
      return createGliderMap(context);
    },
  });
}

export function createGliderMap(context: GliderContext): WorldMapLike {
  function getTile(x: number, y: number) {
    if (Math.abs(x) > 2 || y > 2 || y < -3) {
      return { kind: 'wall' };
    }
    if (x === 0 && y === -2) {
      return {
        kind: 'door',
        note: 'Press X to land the glider on the open ground below.',
      };
    }
    if (x === 0 && y === 0) {
      return {
        kind: 'interior',
        note: 'Canvas wings pull taut as the glider catches the wind.',
      };
    }
    if (Math.abs(x) <= 1 && y >= -2 && y <= 1) {
      return {
        kind: 'floor',
        note: 'The glider frame shudders softly in the rushing air.',
      };
    }
    return {
      kind: 'wall',
      note: 'Open sky drops away beyond the glider frame.',
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

export function isGliderLaunchableLandTile({
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
  if (!isWalkable(tile.kind) || GLIDER_BLOCKED_LANDING_KINDS.has(tile.kind)) {
    return false;
  }
  for (
    let offsetY = -GLIDER_LAUNCH_SEARCH_RADIUS;
    offsetY <= GLIDER_LAUNCH_SEARCH_RADIUS;
    offsetY += 1
  ) {
    for (
      let offsetX = -GLIDER_LAUNCH_SEARCH_RADIUS;
      offsetX <= GLIDER_LAUNCH_SEARCH_RADIUS;
      offsetX += 1
    ) {
      if (offsetX === 0 && offsetY === 0) {
        continue;
      }
      if (
        GLIDER_LAUNCH_SUPPORT_KINDS.has(
          sampleTile(x + offsetX, y + offsetY, state).kind
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

export function findGliderLandingPoint({
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
    let distance = GLIDER_MIN_FLIGHT_DISTANCE;
    distance <= GLIDER_MAX_FLIGHT_DISTANCE;
    distance += 1
  ) {
    const lateralRadius = Math.min(2, Math.floor(distance / 6));
    for (let offset = 0; offset <= lateralRadius; offset += 1) {
      for (const sign of offset === 0 ? [0] : [-1, 1]) {
        const sampleX = x + direction.x * distance + lateral.x * offset * sign;
        const sampleY = y + direction.y * distance + lateral.y * offset * sign;
        const tile = sampleTile(sampleX, sampleY, state);
        if (
          !isWalkable(tile.kind) ||
          GLIDER_BLOCKED_LANDING_KINDS.has(tile.kind)
        ) {
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
