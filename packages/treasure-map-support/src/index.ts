import {
  appendHashSeedLabel,
  hash2DWithSeed,
  registerHashLabel,
  resolveHashSeed,
} from '@bworlds/core/hash';
import type { InventoryItemLike, Seed } from '@bworlds/plugin-api';

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

export type TreasureMapFragment = {
  mapId: string;
  title: string;
  fragmentIndex: number;
  fragmentCount: number;
  rowStart: number;
  rowEnd: number;
  rows: string[];
  width: number;
  gpsLabel?: string;
};

const WATER_KINDS = new Set(['ocean', 'river']);
const FOREST_KINDS = new Set(['forest']);
const HILL_KINDS = new Set(['mountain', 'hill', 'quarry']);
const ROAD_KINDS = new Set(['road', 'bridge', 'dock', 'station', 'ship']);
const TREASURE_MAP_GLYPH_SEED = registerHashLabel('treasure-map-glyph');
const TREASURE_MAP_GPS_FRAGMENT_SEED = registerHashLabel('treasure-map-gps-fragment');
const TREASURE_MAP_EDGE_SEED = registerHashLabel('treasure-map-edge');

function normalizeTreasureMapSeed(seed: Seed): number {
  return resolveHashSeed(seed);
}

export function createTreasureMap({
  seed,
  digSite,
  sampleOverworld,
  width = 15,
  height = 11,
}: {
  seed: Seed;
  digSite: Point;
  sampleOverworld: TreasureMapSampler;
  width?: number;
  height?: number;
}): TreasureMapDocument {
  const safeWidth = Math.max(9, width | 1);
  const safeHeight = Math.max(7, height | 1);
  const seedHash = normalizeTreasureMapSeed(seed);
  const glyphSeed = appendHashSeedLabel(seedHash, TREASURE_MAP_GLYPH_SEED);
  const edgeSeed = appendHashSeedLabel(seedHash, TREASURE_MAP_EDGE_SEED);
  const edge = pickMapEdge(edgeSeed, digSite);
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
          glyphSeed,
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
    seed: String(seed),
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

export function splitTreasureMapIntoFragments(
  map: TreasureMapDocument,
  fragmentCount = 3
): TreasureMapFragment[] {
  const safeFragmentCount = Math.max(
    2,
    Math.min(fragmentCount, map.height)
  );
  const boundaries = createFragmentRowBoundaries(map.height, safeFragmentCount);
  const gpsFragmentIndex = pickGpsFragmentIndex(
    appendHashSeedLabel(
      normalizeTreasureMapSeed(map.seed),
      TREASURE_MAP_GPS_FRAGMENT_SEED
    ),
    safeFragmentCount
  );

  return boundaries.map(([rowStart, rowEnd], fragmentIndex) => ({
    mapId: createTreasureMapId(map),
    title: `${map.title} Fragment ${fragmentIndex + 1}/${safeFragmentCount}`,
    fragmentIndex,
    fragmentCount: safeFragmentCount,
    rowStart,
    rowEnd,
    rows: map.rows.slice(rowStart, rowEnd + 1),
    width: map.width,
    gpsLabel: fragmentIndex === gpsFragmentIndex ? map.gpsLabel : undefined,
  }));
}

export function assembleTreasureMapFragments(
  fragments: TreasureMapFragment[]
): {
  complete: boolean;
  mapId: string | null;
  fragmentCount: number;
  recoveredRows: string[];
  missingFragmentIndices: number[];
  gpsLabel: string | null;
} {
  if (fragments.length === 0) {
    return {
      complete: false,
      mapId: null,
      fragmentCount: 0,
      recoveredRows: [],
      missingFragmentIndices: [],
      gpsLabel: null,
    };
  }

  const [first] = fragments;
  const mapId = first.mapId;
  const fragmentCount = first.fragmentCount;
  const ordered = new Map<number, TreasureMapFragment>();

  for (const fragment of fragments) {
    if (
      fragment.mapId !== mapId ||
      fragment.fragmentCount !== fragmentCount
    ) {
      return {
        complete: false,
        mapId,
        fragmentCount,
        recoveredRows: [],
        missingFragmentIndices: [],
        gpsLabel: null,
      };
    }
    if (!ordered.has(fragment.fragmentIndex)) {
      ordered.set(fragment.fragmentIndex, fragment);
    }
  }

  const missingFragmentIndices: number[] = [];
  const recoveredRows: string[] = [];
  let gpsLabel: string | null = null;

  for (let fragmentIndex = 0; fragmentIndex < fragmentCount; fragmentIndex += 1) {
    const fragment = ordered.get(fragmentIndex);
    if (!fragment) {
      missingFragmentIndices.push(fragmentIndex);
      continue;
    }
    recoveredRows.push(...fragment.rows);
    gpsLabel ??= fragment.gpsLabel ?? null;
  }

  return {
    complete: missingFragmentIndices.length === 0,
    mapId,
    fragmentCount,
    recoveredRows,
    missingFragmentIndices,
    gpsLabel,
  };
}

export function createTreasureMapFragmentInventoryItem({
  id,
  quantity = 1,
  fragment,
}: {
  id: string;
  quantity?: number;
  fragment: TreasureMapFragment;
}): InventoryItemLike {
  return {
    id,
    quantity,
    label: fragment.title,
    kind: 'treasure-map-fragment',
    treasureMapFragment: fragment,
  };
}

function resolveTreasureGlyph({
  glyphSeed,
  terrain,
  x,
  y,
  isPath,
  isDigSite,
}: {
  glyphSeed: number;
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

  const signal = hash2DWithSeed(glyphSeed, x, y);
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

function createTreasureMapId(map: TreasureMapDocument): string {
  return `${map.seed}:${map.digSite.x}:${map.digSite.y}:${map.width}:${map.height}`;
}

function pickGpsFragmentIndex(fragmentSeed: number, fragmentCount: number): number {
  return Math.min(
    fragmentCount - 1,
    Math.floor(hash2DWithSeed(fragmentSeed, fragmentCount, 0) * fragmentCount)
  );
}

function createFragmentRowBoundaries(
  rowCount: number,
  fragmentCount: number
): Array<[number, number]> {
  const boundaries: Array<[number, number]> = [];
  let rowStart = 0;

  for (let fragmentIndex = 0; fragmentIndex < fragmentCount; fragmentIndex += 1) {
    const remainingRows = rowCount - rowStart;
    const remainingFragments = fragmentCount - fragmentIndex;
    const size = Math.ceil(remainingRows / remainingFragments);
    const rowEnd = rowStart + size - 1;
    boundaries.push([rowStart, rowEnd]);
    rowStart = rowEnd + 1;
  }

  return boundaries;
}

function pickMapEdge(edgeSeed: number, digSite: Point): 'north' | 'east' | 'south' | 'west' {
  const roll = hash2DWithSeed(edgeSeed, digSite.x, digSite.y);
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
