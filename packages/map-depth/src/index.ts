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

type DepthTile = TileLike;

type DepthContext = WorldContextLike & {
  origin: Point;
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
      if (x === 0 && y === 6) {
        tile = { kind: 'stairsUp', note: 'Press X to leave.' };
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
          id: `${context.type}:${context.origin.x}:${context.origin.y}:${context.depth + 1}`,
          label: `${context.label} B${context.depth + 1}`,
          type: context.type!,
        }),
        spawn: { x: 0, y: 5 },
      });
    }
    return null;
  }

  function getExit(x?: number, y?: number) {
    if (x === 0 && y === 6) {
      if (context.depth === 1) {
        return createExitMapAction({ x: context.origin.x, y: context.origin.y });
      }
      return createExitMapAction({ x: 0, y: -5 });
    }
    return null;
  }

  return { getTile, getAction, getExit };
}
