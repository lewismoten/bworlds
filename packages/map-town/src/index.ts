import {
  createChildContext,
  createContextMapPlugin,
  createDecoratedMapTileGetter,
  createEnterMapAction,
  createExitMapAction,
} from '@bworlds/map-support';
import {
  getTownBuildingLabel,
  getTownBuildings,
  getTownProfile,
} from '@bworlds/town-support';
import type { TownBuilding, TownBuildingRole } from '@bworlds/town-support';
import type {
  CreateMapContext,
  RuntimePlugin,
  TileLike,
  WorldContextLike,
  WorldMapLike,
} from '@bworlds/plugin-api';

type Point = { x: number; y: number };

type TownTile = TileLike & {
  building?: {
    id: string;
    role?: TownBuildingRole;
    professionFamily?: TownBuilding['professionFamily'];
    residents?: string[];
    workers?: string[];
  };
};

type TownContext = WorldContextLike & {
  origin: Point;
};

const TOWN_WIDTH = 25;
const TOWN_HEIGHT = 25;
const TOWN_EDGE_OFFSET = 9;
const TOWN_BUILDING_ROW_OFFSET = 5;
const TOWN_APPROACH_PATH_OFFSET = 4;
const TOWN_FRONTAGE_ROAD_OFFSET = 3;
const TOWN_BUILDING_SPAN = 8;
const TOWN_SIDE_STREET_INTERVAL = 4;
const TOWN_FENCE_HALF_WIDTH = 1;

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
  const townProfile = getTownProfile(context.origin.x, context.origin.y);
  const buildingSummaries = new Map(
    getTownBuildings(context.origin.x, context.origin.y).map((building) => [
      `${building.x}:${building.y}`,
      building,
    ])
  );

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
        buildingSummaries,
      });
      if (localX === cx && localY === cy) {
        tile = {
          kind: 'town',
          note: `Town square. Level ${townProfile.level} town, population ${townProfile.population}.`,
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
  buildingSummaries?: Map<string, TownBuilding>;
}): TownTile {
  const offsetX = options.localX - options.centerX;
  const offsetY = options.localY - options.centerY;
  if (
    Math.abs(offsetX) === TOWN_EDGE_OFFSET ||
    Math.abs(offsetY) === TOWN_EDGE_OFFSET
  ) {
    return { kind: 'forest' };
  }

  const building = options.buildingSummaries?.get(`${offsetX}:${offsetY}`);
  if (building) {
    const buildingLabel = getTownBuildingLabel(
      building.professionFamily,
      building.role === 'professional' ? 'professional' : 'residential'
    );
    const occupants =
      building.role === 'professional'
        ? building.workerNpcIds.length > 0
          ? ` Workers: ${building.workerNpcIds.join(', ')}.`
          : ''
        : building.residentNpcIds.length > 0
          ? ` Residents: ${building.residentNpcIds.join(', ')}.`
          : '';
    return {
      kind: 'shop',
      building: {
        id: building.id,
        role: building.role,
        professionFamily: building.professionFamily,
        residents: [...building.residentNpcIds],
        workers: [...building.workerNpcIds],
      },
      note:
        building.role === 'professional'
          ? `A ${buildingLabel} stands near the square.${occupants}`
          : `A residential home lines the town lane.${occupants}`,
    };
  }

  if (isTownFenceTile(offsetX, offsetY)) {
    return {
      kind: 'wall',
      note: 'A low fence leaves an opening toward the lane.',
    };
  }

  if (
    isTownMainRoad(offsetX, offsetY) ||
    isTownFrontageRoad(offsetX, offsetY) ||
    isTownApproachPath(offsetX, offsetY) ||
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

export function isTownApproachPath(offsetX: number, offsetY: number): boolean {
  return (
    Math.abs(offsetY) === TOWN_APPROACH_PATH_OFFSET &&
    Math.abs(offsetX) <= TOWN_BUILDING_SPAN &&
    offsetX % 2 === 0
  );
}

export function isTownConnectorRoad(offsetX: number, offsetY: number): boolean {
  return (
    Math.abs(offsetX) <= TOWN_BUILDING_SPAN &&
    Math.abs(offsetX) % TOWN_SIDE_STREET_INTERVAL === 0 &&
    Math.abs(offsetY) <= TOWN_FRONTAGE_ROAD_OFFSET
  );
}

export function hasTownFence(offsetX: number, offsetY: number): boolean {
  if (!isTownBuildingPlot(offsetX, offsetY)) {
    return false;
  }
  const plotIndex = Math.abs(offsetX / 2);
  const rowSign = offsetY > 0 ? 1 : -1;
  return (plotIndex + (rowSign > 0 ? 1 : 0)) % 2 === 0;
}

export function isTownFenceTile(offsetX: number, offsetY: number): boolean {
  const rowSign = offsetY === 0 ? 0 : offsetY > 0 ? 1 : -1;
  if (rowSign === 0) {
    return false;
  }

  const buildingY = rowSign * TOWN_BUILDING_ROW_OFFSET;
  const frontY = rowSign * TOWN_APPROACH_PATH_OFFSET;
  const backY = rowSign * (TOWN_BUILDING_ROW_OFFSET + 1);

  for (
    let buildingX = -TOWN_BUILDING_SPAN;
    buildingX <= TOWN_BUILDING_SPAN;
    buildingX += 2
  ) {
    if (!hasTownFence(buildingX, buildingY)) {
      continue;
    }
    const leftX = buildingX - TOWN_FENCE_HALF_WIDTH;
    const rightX = buildingX + TOWN_FENCE_HALF_WIDTH;
    const withinY =
      Math.abs(offsetY) >= Math.abs(frontY) && Math.abs(offsetY) <= Math.abs(backY);
    const sideFence =
      withinY && (offsetX === leftX || offsetX === rightX);
    const backFence =
      offsetY === backY && offsetX >= leftX && offsetX <= rightX;
    const frontFence =
      offsetY === frontY &&
      offsetX >= leftX &&
      offsetX <= rightX &&
      offsetX !== buildingX;

    if (sideFence || backFence || frontFence) {
      return true;
    }
  }

  return false;
}
