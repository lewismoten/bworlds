import {
  createChildContext,
  createContextMapPlugin,
  createEnterMapAction,
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

type TownTile = TileLike & {
  building?: { id: string };
};

type TownContext = WorldContextLike & {
  origin: Point;
};

export function createTownMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<TownContext>({
    name: 'map-town',
    contextType: 'town',
    createMap: createTownMap,
  });
}

function createTownMap(
  context: TownContext,
  seed: string | number,
  plugins: CreateMapContext['plugins']
): WorldMapLike {
  const width = 25;
  const height = 25;
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);

  function getTile(x: number, y: number): TownTile {
    const localX = x + cx;
    const localY = y + cy;
    if (localX < 0 || localY < 0 || localX >= width || localY >= height) {
      return { kind: 'forest' };
    }

    let tile: TownTile = { kind: 'plains' };
    const onRoad = localX === cx || localY === cy;
    const plaza =
      Math.abs(localX - cx) <= 1 && Math.abs(localY - cy) <= 1 && !onRoad;
    const buildingBand =
      Math.abs(localY - cy) === 3 &&
      Math.abs(localX - cx) <= 8 &&
      localX % 2 === 0;

    if (onRoad || plaza) tile = { kind: 'road' };
    if (buildingBand) {
      tile = { kind: 'shop', building: { id: `${context.id}:${x}:${y}` } };
    }
    if (Math.abs(localX - cx) === 9 || Math.abs(localY - cy) === 9) {
      tile = { kind: 'forest' };
    }
    if (localX === cx && localY === cy) {
      tile = {
        kind: 'town',
        note: 'Town square. Explore the buildings or leave at the gate.',
      };
    }
    if (localX === cx && localY === height - 2) {
      tile = { kind: 'door', note: 'Town gate. Press X to return outside.' };
    }

    return plugins.decorateTownTile({
      context,
      seed,
      x,
      y,
      tile,
    }) as TownTile;
  }

  function getAction(x: number, y: number) {
    const tile = getTile(x, y);
    if (!tile.building) return null;
    return createEnterMapAction({
      context: createChildContext(context, {
        id: `${tile.building.id}:building`,
        label: 'Building Interior',
        type: 'building',
      }),
      spawn: { x: 0, y: 3 },
    });
  }

  function getExit(x?: number, y?: number) {
    if (x === 0 && y === 11) {
      return createExitMapAction({ x: context.origin.x, y: context.origin.y });
    }
    return null;
  }

  return { getTile, getAction, getExit };
}
