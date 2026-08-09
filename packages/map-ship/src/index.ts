import {
  appendHashSeedLabel,
  hash2DWithSeed,
  registerHashLabel,
  resolveHashSeed,
} from '@bworlds/core/hash';
import {
  createContextMapPlugin,
  createExitMapAction,
} from '@bworlds/map-support';
import type {
  CreateMapContext,
  RuntimePlugin,
  Seed,
  TileLike,
  WorldContextLike,
  WorldMapLike,
} from '@bworlds/plugin-api';

type Point = { x: number; y: number };
type ShipContext = WorldContextLike & {
  origin: Point;
  destination?: Point;
  routeBoatName?: string;
};
const SHIP_MAP_VARIANT_SEED = registerHashLabel('ship-map-variant');

export function createShipMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<ShipContext>({
    name: 'map-ship',
    contextType: 'ship',
    createMap: createShipMap,
  });
}

function createShipMap(
  context: ShipContext,
  seed: Seed,
  _plugins: CreateMapContext['plugins']
): WorldMapLike {
  const variant = getShipMapVariant(seed, context.origin.x, context.origin.y);

  function getTile(x: number, y: number): TileLike {
    if (Math.abs(x) > 4 || Math.abs(y) > 5) {
      return { kind: 'wall' };
    }
    if (x === 0 && y === 5) {
      return { kind: 'door', note: 'Press X to climb back to the dock.' };
    }
    if (Math.abs(x) >= 4 || Math.abs(y) >= 5) {
      return { kind: 'wall', note: 'The ship hull presses close around you.' };
    }
    if (x === 0 && y === 0) {
      return {
        kind: 'ship',
        note:
          typeof context.routeBoatName === 'string'
            ? `${context.routeBoatName} is underway to the next dock stop.`
            :
          variant === 'tall-ship'
            ? 'The captain\'s deck rises above neatly kept cargo.'
            : 'Broken beams and soaked cargo list through the ruined hold.',
      };
    }
    if (y <= -2 && Math.abs(x) <= 1) {
      return {
        kind: 'interior',
        note:
          variant === 'tall-ship'
            ? 'Rigging shadows sway across the forward berth.'
            : 'Wind whistles through a split prow and dangling rigging.',
      };
    }
    if (y >= 2 && Math.abs(x) <= 1) {
      return {
        kind: 'floor',
        note:
          variant === 'tall-ship'
            ? 'Steps descend toward the stern cabin and stacked provisions.'
            : 'The aft deck sags under the weight of broken planks.',
      };
    }
    return {
      kind: 'floor',
      note:
        variant === 'tall-ship'
          ? 'Lantern light gleams across polished deck boards.'
          : 'Salt-stained boards and snapped crates fill the stranded vessel.',
    };
  }

  function getAction() {
    return null;
  }

  function getExit(x?: number, y?: number) {
    if (x === 0 && y === 5) {
      return createExitMapAction(
        context.destination ?? { x: context.origin.x, y: context.origin.y }
      );
    }
    return null;
  }

  return { getTile, getAction, getExit };
}

function getShipMapVariant(
  seed: Seed,
  originX: number,
  originY: number
) {
  const seedHash = resolveHashSeed(seed);
  const variantSeed = appendHashSeedLabel(seedHash, SHIP_MAP_VARIANT_SEED);
  return hash2DWithSeed(variantSeed, originX, originY) > 0.48
    ? 'tall-ship'
    : 'broken-ship';
}
