import {
  createContextMapPlugin,
  createDecoratedMapTileGetter,
  createReturnMapAction,
} from '@bworlds/map-support';
import type {
  CreateMapContext,
  RuntimePlugin,
  TileLike,
  WorldContextLike,
  WorldMapLike,
} from '@bworlds/plugin-api';

type Point = { x: number; y: number };

type BuildingTile = TileLike;

type BuildingContext = WorldContextLike & {
  origin: Point;
};

export function createBuildingMapPlugin(): RuntimePlugin {
  return createContextMapPlugin<BuildingContext>({
    name: 'map-building',
    contextType: 'building',
    createMap: createBuildingMap,
  });
}

function createBuildingMap(
  context: BuildingContext,
  seed: string | number,
  plugins: CreateMapContext['plugins']
): WorldMapLike {
  const getTile = createDecoratedMapTileGetter<BuildingTile, BuildingContext>({
    context,
    seed,
    resolveTile(x: number, y: number) {
    let tile: BuildingTile = { kind: 'wall' };
    if (Math.abs(x) <= 3 && Math.abs(y) <= 3) tile = { kind: 'floor' };
    if (y === 3 && x === 0) tile = { kind: 'door', note: 'Press X to leave.' };
    if (y === -2 && Math.abs(x) <= 1) tile = { kind: 'shop' };
      return tile;
    },
    decorateTile(payload) {
      return plugins.decorateBuildingTile(payload);
    },
  });

  function getAction() {
    return null;
  }

  function getExit(x?: number, y?: number) {
    if (x === 0 && y === 3) {
      return createReturnMapAction();
    }
    return null;
  }

  return { getTile, getAction, getExit };
}
