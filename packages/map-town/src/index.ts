import {
  createChildContext,
  createContextMapPlugin,
  createDecoratedMapTileGetter,
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

const TOWN_WIDTH = 25;
const TOWN_HEIGHT = 25;
const TOWN_EDGE_OFFSET = 9;
const TOWN_BUILDING_ROW_OFFSET = 4;
const TOWN_FRONTAGE_ROAD_OFFSET = 3;
const TOWN_BUILDING_SPAN = 8;
const TOWN_SIDE_STREET_INTERVAL = 4;

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
  const width = TOWN_WIDTH;
  const height = TOWN_HEIGHT;
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);

  const getTile = createDecoratedMapTileGetter<TownTile, TownContext>({
    context,
    seed,
    resolveTile(x: number, y: number) {
      const localX = x + cx;
      const localY = y + cy;
      if (localX < 0 || localY < 0 || localX >= width || localY >= height) {
        return { kind: 'forest' };
      }

      let tile = resolveTownTile({
        contextId: context.id,
        x,
        y,
        localX,
        localY,
        centerX: cx,
        centerY: cy,
      });
      if (localX === cx && localY === cy) {
        tile = {
          kind: 'town',
          note: 'Town square. Explore the buildings or leave at the gate.',
        };
      }
      if (localX === cx && localY === height - 2) {
        tile = { kind: 'door', note: 'Town gate. Press X to return outside.' };
      }
      return tile;
    },
    decorateTile(payload) {
      return plugins.decorateTownTile(payload) as TownTile;
    },
  });

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

export function resolveTownTile(options: {
  contextId: string;
  x: number;
  y: number;
  localX: number;
  localY: number;
  centerX: number;
  centerY: number;
}): TownTile {
  const offsetX = options.localX - options.centerX;
  const offsetY = options.localY - options.centerY;
  if (
    Math.abs(offsetX) === TOWN_EDGE_OFFSET ||
    Math.abs(offsetY) === TOWN_EDGE_OFFSET
  ) {
    return { kind: 'forest' };
  }

  if (isTownBuildingPlot(offsetX, offsetY)) {
    return {
      kind: 'shop',
      building: { id: `${options.contextId}:${options.x}:${options.y}` },
    };
  }

  if (
    isTownMainRoad(offsetX, offsetY) ||
    isTownFrontageRoad(offsetX, offsetY) ||
    isTownConnectorRoad(offsetX, offsetY)
  ) {
    return { kind: 'road' };
  }

  return { kind: 'plains' };
}

export function isTownBuildingPlot(offsetX: number, offsetY: number): boolean {
  return (
    Math.abs(offsetY) === TOWN_BUILDING_ROW_OFFSET &&
    Math.abs(offsetX) <= TOWN_BUILDING_SPAN &&
    offsetX % 2 === 0
  );
}

export function isTownMainRoad(offsetX: number, offsetY: number): boolean {
  const onCrossroad = offsetX === 0 || offsetY === 0;
  const plaza =
    Math.abs(offsetX) <= 1 && Math.abs(offsetY) <= 1 && !onCrossroad;
  return onCrossroad || plaza;
}

export function isTownFrontageRoad(offsetX: number, offsetY: number): boolean {
  return (
    Math.abs(offsetY) === TOWN_FRONTAGE_ROAD_OFFSET &&
    Math.abs(offsetX) <= TOWN_BUILDING_SPAN
  );
}

export function isTownConnectorRoad(offsetX: number, offsetY: number): boolean {
  return (
    Math.abs(offsetX) <= TOWN_BUILDING_SPAN &&
    Math.abs(offsetX) % TOWN_SIDE_STREET_INTERVAL === 0 &&
    Math.abs(offsetY) <= TOWN_FRONTAGE_ROAD_OFFSET
  );
}
