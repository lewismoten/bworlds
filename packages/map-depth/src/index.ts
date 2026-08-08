import { hash2D } from '@bworlds/core';
import {
  createChildContext,
  createContextMapPlugin,
  createDecoratedMapTileGetter,
  createDeepenMapAction,
  createExitMapAction,
} from '@bworlds/map-support';
import type {
  CreateMapContext,
  RuntimePlugin,
  TileLike,
  WorldContextLike,
  WorldMapLike,
} from '@bworlds/plugin-api';

type Point = { x: number; y: number };
type NamedPoint = Point & { name?: string };

type DepthTile = TileLike;

type DepthContext = WorldContextLike & {
  origin: Point;
  entrances?: NamedPoint[];
  systemId?: string;
};

export function createDepthMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<DepthContext>({
    name: 'map-depth',
    contextType: ['cave', 'dungeon'],
    createMap: createDepthMap,
  });
}

function createDepthMap(
  context: DepthContext,
  seed: string | number,
  plugins: CreateMapContext['plugins']
): WorldMapLike {
  const size = 21;
  const radius = Math.floor(size / 2);
  const entranceExits = getDepthEntranceExits(context);

  const getTile = createDecoratedMapTileGetter<DepthTile, DepthContext>({
    context,
    seed,
    resolveTile(x: number, y: number) {
      const localX = x + radius;
      const localY = y + radius;
      if (localX < 0 || localY < 0 || localX >= size || localY >= size) {
        return { kind: 'wall' };
      }

      let tile: DepthTile = { kind: 'wall' };
      const chamber =
        Math.abs(x) <= 7 &&
        Math.abs(y) <= 7 &&
        (Math.abs(x) <= 1 || Math.abs(y) <= 1 || hash2D(seed, x, y) > 0.3);

      if (chamber) tile = { kind: 'floor' };
      if (x === 0 && y === 0) {
        tile = {
          kind: context.type === 'cave' ? 'cave' : 'dungeon',
          note: 'Press interact on the stairs to go deeper.',
        };
      }
      const exitIndex = entranceExits.findIndex(
        (entry) => entry.local.x === x && entry.local.y === y
      );
      if (exitIndex >= 0) {
        const exit = entranceExits[exitIndex];
        tile = {
          kind: 'stairsUp',
          note:
            typeof exit.label === 'string' && exit.label.length > 0
              ? `Press X to leave through ${exit.label}.`
              : 'Press X to leave.',
        };
      }
      if (x === 0 && y === -6) {
        tile = {
          kind: 'stairsDown',
          note: 'The next level extends below.',
        };
      }
      return tile;
    },
    decorateTile(payload) {
      return plugins.decorateDepthTile(payload);
    },
  });

  function getAction(x: number, y: number) {
    if (x === 0 && y === -6) {
      return createDeepenMapAction({
        context: createChildContext(context, {
          id: resolveDepthContextId(context),
          label: `${context.label} B${context.depth + 1}`,
          type: context.type!,
          origin: context.origin,
        }),
        spawn: { x: 0, y: 5 },
      });
    }
    return null;
  }

  function getExit(x?: number, y?: number) {
    const exit = entranceExits.find(
      (entry) => entry.local.x === x && entry.local.y === y
    );
    if (exit) {
      if (context.depth === 1) {
        return createExitMapAction(exit.world);
      }
      return createExitMapAction({ x: 0, y: -5 });
    }
    return null;
  }

  return { getTile, getAction, getExit };
}

function resolveDepthContextId(context: DepthContext): string {
  if (context.type === 'cave' && typeof context.systemId === 'string') {
    return context.systemId;
  }
  return `${context.type}:${context.origin.x}:${context.origin.y}:${context.depth + 1}`;
}

function getDepthEntranceExits(context: DepthContext) {
  const worldEntrances: NamedPoint[] =
    Array.isArray(context.entrances) && context.entrances.length > 0
      ? context.entrances
      : [{ ...context.origin }];
  const localExitPoints = [
    { x: 0, y: 6 },
    { x: -3, y: 5 },
    { x: 3, y: 5 },
    { x: -5, y: 3 },
    { x: 5, y: 3 },
  ];

  return worldEntrances.slice(0, localExitPoints.length).map((world, index) => ({
    world,
    local: localExitPoints[index] ?? localExitPoints[0],
    label:
      typeof world.name === 'string'
        ? world.name
        : undefined,
  }));
}
