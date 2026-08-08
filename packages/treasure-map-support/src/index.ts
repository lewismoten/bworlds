import { hash2D } from '@bworlds/core';
import type { InventoryItemLike } from '@bworlds/plugin-api';

type Point = { x: number; y: number };

export type TreasureMapCell = {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  terrain: string;
  glyph: string;
  isPath: boolean;
  isDigSite: boolean;
};

export type TreasureMapDocument = {
  seed: string;
  title: string;
  gpsLabel: string;
  areaCenter: Point;
  digSite: Point;
  path: Point[];
  pathEntry: Point;
  width: number;
  height: number;
  cells: TreasureMapCell[];
  rows: string[];
};

export type TreasureMapSampler = (x: number, y: number) => { kind?: string };

const WATER_KINDS = new Set(['ocean', 'river']);
const FOREST_KINDS = new Set(['forest']);
const HILL_KINDS = new Set(['mountain', 'hill', 'quarry']);
const ROAD_KINDS = new Set(['road', 'bridge', 'dock', 'station', 'ship']);

export function createTreasureMap({
  seed,
  digSite,
  sampleOverworld,
  width = 15,
  height = 11,
}: {
  seed: string;
  digSite: Point;
  sampleOverworld: TreasureMapSampler;
  width?: number;
  height?: number;
}): TreasureMapDocument {
  const safeWidth = Math.max(9, width | 1);
  const safeHeight = Math.max(7, height | 1);
  const edge = pickMapEdge(seed, digSite);
  const pathEntry = createPathEntry(digSite, safeWidth, safeHeight, edge);
  const path = traceTreasurePath(pathEntry, digSite);
  const areaCenter = getTreasureMapAreaCenter(
    digSite,
    safeWidth,
    safeHeight,
    edge
  );
  const minX = areaCenter.x - Math.floor(safeWidth / 2);
  const minY = areaCenter.y - Math.floor(safeHeight / 2);
  const pathKeys = new Set(path.map((point) => `${point.x}:${point.y}`));
  const cells: TreasureMapCell[] = [];

  for (let y = 0; y < safeHeight; y += 1) {
    for (let x = 0; x < safeWidth; x += 1) {
      const worldX = minX + x;
      const worldY = minY + y;
      const terrain = sampleOverworld(worldX, worldY).kind ?? 'plains';
      const isDigSite = worldX === digSite.x && worldY === digSite.y;
      const isPath = pathKeys.has(`${worldX}:${worldY}`);
      cells.push({
        x,
        y,
        worldX,
        worldY,
        terrain,
        glyph: resolveTreasureGlyph({
          seed,
          terrain,
          x: worldX,
          y: worldY,
          isPath,
          isDigSite,
        }),
        isPath,
        isDigSite,
      });
    }
  }

  return {
    seed,
    title: `Treasure Map ${formatGps(areaCenter)}`,
    gpsLabel: formatGps(areaCenter),
    areaCenter,
    digSite,
    path,
    pathEntry,
    width: safeWidth,
    height: safeHeight,
    cells,
    rows: renderTreasureMapRows({
      width: safeWidth,
      height: safeHeight,
      cells,
    }),
  };
}

export function renderTreasureMapRows({
  width,
  height,
  cells,
}: Pick<TreasureMapDocument, 'width' | 'height' | 'cells'>): string[] {
  const rows = new Array<string>(height);
  for (let y = 0; y < height; y += 1) {
    const start = y * width;
    rows[y] = cells
      .slice(start, start + width)
      .map((cell) => cell.glyph)
      .join('');
  }
  return rows;
}

export function createTreasureMapInventoryItem({
  id,
  quantity = 1,
  label,
  map,
}: {
  id: string;
  quantity?: number;
  label?: string;
  map: TreasureMapDocument;
}): InventoryItemLike {
  return {
    id,
    quantity,
    label: label ?? map.title,
    kind: 'treasure-map',
    treasureMap: map,
  };
}

function resolveTreasureGlyph({
  seed,
  terrain,
  x,
  y,
  isPath,
  isDigSite,
}: {
  seed: string;
  terrain: string;
  x: number;
  y: number;
  isPath: boolean;
  isDigSite: boolean;
}): string {
  if (isDigSite) {
    return 'X';
  }
  if (isPath) {
    return ROAD_KINDS.has(terrain) ? '#' : ':';
  }

  const signal = hash2D(`${seed}:treasure-map-glyph`, x, y);
  if (WATER_KINDS.has(terrain)) {
    return signal > 0.5 ? '~' : '=';
  }
  if (FOREST_KINDS.has(terrain)) {
    return signal > 0.5 ? 'Y' : '"';
  }
  if (HILL_KINDS.has(terrain)) {
    return signal > 0.5 ? '^' : 'n';
  }
  if (ROAD_KINDS.has(terrain)) {
    return signal > 0.5 ? '-' : '_';
  }
  return signal > 0.66 ? '.' : signal > 0.33 ? ',' : '`';
}

function formatGps(point: Point): string {
  return `${point.y >= 0 ? 'N' : 'S'}${Math.abs(point.y)} ${point.x >= 0 ? 'E' : 'W'}${Math.abs(
    point.x
  )}`;
}

function pickMapEdge(seed: string, digSite: Point): 'north' | 'east' | 'south' | 'west' {
  const roll = hash2D(`${seed}:treasure-map-edge`, digSite.x, digSite.y);
  if (roll < 0.25) {
    return 'west';
  }
  if (roll < 0.5) {
    return 'east';
  }
  if (roll < 0.75) {
    return 'north';
  }
  return 'south';
}

function createPathEntry(
  digSite: Point,
  width: number,
  height: number,
  edge: 'north' | 'east' | 'south' | 'west'
): Point {
  const horizontalOffset = Math.max(3, Math.floor(width / 3));
  const verticalOffset = Math.max(2, Math.floor(height / 3));
  if (edge === 'west') {
    return { x: digSite.x - horizontalOffset, y: digSite.y };
  }
  if (edge === 'east') {
    return { x: digSite.x + horizontalOffset, y: digSite.y };
  }
  if (edge === 'north') {
    return { x: digSite.x, y: digSite.y - verticalOffset };
  }
  return { x: digSite.x, y: digSite.y + verticalOffset };
}

function getTreasureMapAreaCenter(
  digSite: Point,
  width: number,
  height: number,
  edge: 'north' | 'east' | 'south' | 'west'
): Point {
  const horizontalBias = Math.max(1, Math.floor(width / 4));
  const verticalBias = Math.max(1, Math.floor(height / 4));
  if (edge === 'west') {
    return { x: digSite.x - horizontalBias, y: digSite.y };
  }
  if (edge === 'east') {
    return { x: digSite.x + horizontalBias, y: digSite.y };
  }
  if (edge === 'north') {
    return { x: digSite.x, y: digSite.y - verticalBias };
  }
  return { x: digSite.x, y: digSite.y + verticalBias };
}

function traceTreasurePath(start: Point, end: Point): Point[] {
  const path: Point[] = [];
  let x = start.x;
  let y = start.y;
  const deltaX = Math.abs(end.x - start.x);
  const deltaY = Math.abs(end.y - start.y);
  const stepX = start.x < end.x ? 1 : -1;
  const stepY = start.y < end.y ? 1 : -1;
  let error = deltaX - deltaY;

  while (true) {
    path.push({ x, y });
    if (x === end.x && y === end.y) {
      return path;
    }
    const doubledError = error * 2;
    if (doubledError > -deltaY) {
      error -= deltaY;
      x += stepX;
    }
    if (doubledError < deltaX) {
      error += deltaX;
      y += stepY;
    }
  }
}
