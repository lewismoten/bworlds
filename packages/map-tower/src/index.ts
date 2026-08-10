import {
  createChildContext,
  createContextMapPlugin,
  createDeepenMapAction,
  createExitMapAction,
} from '@bworlds/map-support';
import type {
  RuntimePlugin,
  TileLike,
  WorldContextLike,
  WorldMapLike,
} from '@bworlds/plugin-api';

type Point = { x: number; y: number };
type TowerTile = TileLike;
type TowerContext = WorldContextLike & {
  origin: Point;
};

const TOWER_RADIUS = 6;
const TOWER_EXIT = { x: 0, y: 5 };
const TOWER_STAIRS = { x: 0, y: -5 };
const MAX_TOWER_DEPTH = 3;

export function createTowerMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<TowerContext>({
    name: 'map-tower',
    contextType: 'tower',
    createMap: createTowerMap,
  });
}

function createTowerMap(
  context: TowerContext
): WorldMapLike {
  function getTile(x: number, y: number): TowerTile {
    return resolveTowerTile(context.depth, x, y);
  }

  function getAction(x: number, y: number) {
    if (
      x === TOWER_STAIRS.x &&
      y === TOWER_STAIRS.y &&
      context.depth < MAX_TOWER_DEPTH
    ) {
      return createDeepenMapAction({
        context: createChildContext(context, {
          id: `tower:${context.origin.x}:${context.origin.y}:${context.depth + 1}`,
          label: `${context.label} Level ${context.depth + 1}`,
          type: 'tower',
          origin: context.origin,
        }),
        spawn: { x: 0, y: 4 },
      });
    }
    return null;
  }

  function getExit(x?: number, y?: number) {
    if (x !== TOWER_EXIT.x || y !== TOWER_EXIT.y) {
      return null;
    }
    if (context.depth === 1) {
      return createExitMapAction({ x: context.origin.x, y: context.origin.y });
    }
    return createExitMapAction({ x: 0, y: -4 });
  }

  return { getTile, getAction, getExit };
}

function resolveTowerTile(depth: number, x: number, y: number): TowerTile {
  if (Math.abs(x) > TOWER_RADIUS || Math.abs(y) > TOWER_RADIUS) {
    return { kind: 'wall' };
  }
  if (Math.abs(x) === TOWER_RADIUS || Math.abs(y) === TOWER_RADIUS) {
    if (x === TOWER_EXIT.x && y === TOWER_EXIT.y) {
      return {
        kind: 'door',
        note:
          depth === 1
            ? 'Press X to step back outside.'
            : 'Press X to head back down to the prior floor.',
      };
    }
    return {
      kind: 'wall',
      note: 'The tower wall curves upward in weathered stone.',
    };
  }

  if (x === 0 && y === 0) {
    return getTowerFloorCenterTile(depth);
  }

  if (x === TOWER_STAIRS.x && y === TOWER_STAIRS.y) {
    if (depth < MAX_TOWER_DEPTH) {
      return {
        kind: 'stairsDown',
        note: getTowerStairsNote(depth),
      };
    }
    return {
      kind: 'tower',
      note: 'The final landing opens into a quiet watch room above the last jump.',
    };
  }

  if (depth === 1 && x === 0 && y === 1) {
    return {
      kind: 'interior',
      note: 'A heavy cabinet has been shoved off its groove, opening the spiral toward the next landing.',
    };
  }
  if (depth === 2 && x === -2 && y === 0) {
    return {
      kind: 'interior',
      note: 'A brass key rests on a dusty table beside old puzzle notes.',
    };
  }
  if (depth === 2 && x === 0 && y === -1) {
    return {
      kind: 'door',
      note: 'The brass key fits the lock here, freeing the stairwell above.',
    };
  }
  if (depth === 3 && x === 0 && y === -1) {
    return {
      kind: 'floor',
      note: 'A cracked stretch of floor demands a short running jump to reach the last platform.',
    };
  }
  if (depth === 3 && x === 1 && y === -2) {
    return {
      kind: 'interior',
      note: 'Scuff marks show where prior challengers landed after clearing the gap.',
    };
  }

  return {
    kind: 'floor',
    note: getTowerAmbientNote(depth, x, y),
  };
}

function getTowerFloorCenterTile(depth: number): TowerTile {
  if (depth === 1) {
    return {
      kind: 'tower',
      note: 'The first puzzle floor asks you to push a blocking cabinet aside before climbing higher.',
    };
  }
  if (depth === 2) {
    return {
      kind: 'tower',
      note: 'The second floor hides a brass key that opens the locked stair door to the next level.',
    };
  }
  return {
    kind: 'tower',
    note: 'The third floor ends in a broken landing where a jump carries you to the top watch room.',
  };
}

function getTowerStairsNote(depth: number): string {
  if (depth === 1) {
    return 'The cleared stair now leads above the pushed obstruction.';
  }
  if (depth === 2) {
    return 'Beyond the unlocked door, the stairs continue toward the upper test.';
  }
  return 'A final stair rises toward the tower crown.';
}

function getTowerAmbientNote(depth: number, x: number, y: number): string {
  if (depth === 1) {
    return Math.abs(x) + Math.abs(y) <= 3
      ? 'Dusty grooves in the floor show where obstructions have been pushed before.'
      : 'Cold draft curls around the stone from arrow slits in the tower wall.';
  }
  if (depth === 2) {
    return x < 0
      ? 'Shelves and lockboxes line the wall where the missing key was hidden.'
      : 'The stair landing narrows around a stout locked door.';
  }
  return y < 0
    ? 'Broken masonry leaves only a short leap between the final platforms.'
    : 'Wind hums through the upper tower as the last test comes into view.';
}
