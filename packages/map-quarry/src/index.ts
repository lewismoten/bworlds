import {
  createContextMapPlugin,
  createDecoratedMapTileGetter,
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

type QuarryTile = TileLike;
type QuarryContext = WorldContextLike & {
  origin: Point;
};

export function createQuarryMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<QuarryContext>({
    name: 'map-quarry',
    contextType: 'quarry',
    createMap: createQuarryMap,
  });
}

function createQuarryMap(
  context: QuarryContext,
  seed: string | number,
  plugins: CreateMapContext['plugins']
): WorldMapLike {
  const radius = 9;
  const pitRadius = 3.6;
  const getTile = createDecoratedMapTileGetter<QuarryTile, QuarryContext>({
    context,
    seed,
    resolveTile(x: number, y: number) {
      if (Math.abs(x) > radius || Math.abs(y) > radius) {
        return { kind: 'wall' };
      }

      if (x === 0 && y === radius - 1) {
        return { kind: 'door', note: 'Press X to head back outside.' };
      }

      const distance = Math.hypot(x, y);
      if (distance <= 0.8) {
        return {
          kind: 'quarry',
          note: 'The quarry floor is cut deep into the stone.',
        };
      }
      if (distance <= pitRadius) {
        return { kind: 'floor', note: 'Cut stone and dust cover the quarry floor.' };
      }
      if (distance <= pitRadius + 1.25) {
        return { kind: 'road', note: 'A terraced haul road circles the pit.' };
      }
      if (distance >= radius - 1) {
        return { kind: 'mountain', note: 'The quarry walls rise steeply here.' };
      }
      return { kind: 'plains', note: 'Stacks of stone wait to be hauled away.' };
    },
    decorateTile(payload) {
      return plugins.decorateDepthTile(payload);
    },
  });

  function getAction() {
    return null;
  }

  function getExit(x?: number, y?: number) {
    if (x === 0 && y === radius - 1) {
      return createExitMapAction({ x: context.origin.x, y: context.origin.y });
    }
    return null;
  }

  return { getTile, getAction, getExit };
}
