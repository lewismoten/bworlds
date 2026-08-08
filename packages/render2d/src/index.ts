import { drawTileSprite, getTileVariantIndex } from '@bworlds/atlas';
import { getDaylightCycleState } from '@bworlds/core';
import type {
  TileLike,
  TileDefinitionLike,
  WorldEnvironmentLike,
  WorldStateLike,
} from '@bworlds/plugin-api';

type Render2DState = Pick<WorldStateLike, 'player' | 'getCurrentTile'> &
  Partial<Pick<WorldStateLike, 'getTileDefinition'>>;

export interface Render2DViewport {
  width: number;
  height: number;
  rotation?: number;
  facingAngle?: number;
  zoom?: number;
  timeMs?: number;
  environment?: WorldEnvironmentLike;
  showTimeOverlay?: boolean;
}

type TileSampler = (worldX: number, worldY: number) => TileLike;
type Point2D = {
  x: number;
  y: number;
};
export type TextViewportCell = {
  glyph: string;
  color: string;
  kind: string;
  worldX: number;
  worldY: number;
};
export type TextViewportGrid = {
  rows: TextViewportCell[][];
  centerColumn: number;
  centerRow: number;
};

type ReliefTile = {
  kind: string;
  surfaceHeight?: unknown;
  train?: {
    direction?: 'forward' | 'backward';
    progress?: number;
  };
};

export function render2D(
  context: CanvasRenderingContext2D,
  state: Render2DState,
  viewport: Render2DViewport
) {
  const tileAt = createViewportTileSampler(state);
  const tileSize = getViewportTileSize(viewport);
  const diagonal = Math.ceil(
    Math.hypot(viewport.width, viewport.height) / tileSize / 2
  );
  const radiusX = diagonal + 2;
  const radiusY = diagonal + 2;
  const centerX = Math.floor(viewport.width / 2);
  const centerY = Math.floor(viewport.height / 2);
  const rotation = viewport.rotation ?? 0;
  const anchorX = Math.round(state.player.x);
  const anchorY = Math.round(state.player.y);
  const offsetX = state.player.x - anchorX;
  const offsetY = state.player.y - anchorY;

  context.fillStyle = '#081019';
  context.fillRect(0, 0, viewport.width, viewport.height);

  context.save();
  context.translate(centerX + tileSize / 2, centerY + tileSize / 2);
  context.rotate(rotation);

  for (let y = -radiusY; y <= radiusY; y += 1) {
    for (let x = -radiusX; x <= radiusX; x += 1) {
      const worldX = anchorX + x;
      const worldY = anchorY + y;
      const tile = tileAt(worldX, worldY);
      const drawX = (x - offsetX) * tileSize;
      const drawY = (y - offsetY) * tileSize;

      drawTileSprite(context, tile.kind, drawX, drawY, tileSize + 1, {
        variant: getTileVariantIndex(tile.kind, worldX, worldY),
        timeMs: viewport.timeMs,
        worldX,
        worldY,
      });

      if (tile.kind === 'river') {
        drawRiverOverlay(context, tileAt, worldX, worldY, drawX, drawY, tileSize);
      }

      drawReliefOverlay(context, tile, drawX, drawY, tileSize);
      drawTrainOverlay(context, tile, drawX, drawY, tileSize);
    }
  }

  context.restore();

  drawRotatedGrid(context, viewport, centerX, centerY, tileSize, rotation);

  drawFacingMarker(
    context,
    centerX + tileSize / 2,
    centerY + tileSize / 2,
    tileSize,
    viewport.facingAngle
  );

  if (viewport.showTimeOverlay !== false && typeof viewport.timeMs === 'number') {
    drawTimeOfDayOverlay(
      context,
      viewport,
      viewport.timeMs,
      viewport.environment ?? {}
    );
  }
}

export function getViewportTileSize(viewport: Render2DViewport) {
  const zoom = viewport.zoom ?? 1;
  return Math.max(
    14,
    Math.floor((Math.min(viewport.width, viewport.height) / 22) * zoom)
  );
}

const RIVER_OVERLAY_NETWORK_KINDS = new Set(['river', 'bridge', 'ocean']);

export function createViewportTileSampler(state: Render2DState): TileSampler {
  const tileCache = new Map<string, TileLike>();
  return (worldX: number, worldY: number) => {
    const key = `${worldX}:${worldY}`;
    if (!tileCache.has(key)) {
      tileCache.set(key, state.getCurrentTile(worldX, worldY));
    }
    return tileCache.get(key) ?? { kind: 'unknown' };
  };
}

export function buildTextViewportGrid(
  state: Render2DState,
  options: { columns: number; rows: number }
): TextViewportGrid {
  const tileAt = createViewportTileSampler(state);
  const columns = Math.max(1, Math.floor(options.columns));
  const rows = Math.max(1, Math.floor(options.rows));
  const centerColumn = Math.floor(columns / 2);
  const centerRow = Math.floor(rows / 2);
  const anchorX = Math.round(state.player.x);
  const anchorY = Math.round(state.player.y);
  const gridRows: TextViewportCell[][] = [];

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const row: TextViewportCell[] = [];
    const worldY = anchorY + (rowIndex - centerRow);
    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      const worldX = anchorX + (columnIndex - centerColumn);
      const tile = tileAt(worldX, worldY);
      const isPlayer = rowIndex === centerRow && columnIndex === centerColumn;
      row.push({
        glyph: isPlayer
          ? '@'
          : getTextViewportGlyph(tile.kind, resolveTileName(state, tile.kind)),
        color: isPlayer ? '#ffbf69' : resolveTileColor(state, tile.kind),
        kind: tile.kind,
        worldX,
        worldY,
      });
    }
    gridRows.push(row);
  }

  return {
    rows: gridRows,
    centerColumn,
    centerRow,
  };
}

export function getTextViewportGlyph(kind: string, tileName?: string): string {
  const fallbackGlyph = tileName?.trim().charAt(0) || kind.trim().charAt(0) || '?';
  const glyph = ASCII_TILE_GLYPHS[kind] ?? fallbackGlyph;
  return glyph.toUpperCase();
}

export function getTileReliefStrength(tile: ReliefTile): number {
  if (
    tile.kind === 'river' ||
    tile.kind === 'ocean' ||
    tile.kind === 'bridge' ||
    tile.kind === 'dock' ||
    tile.kind === 'mountain'
  ) {
    return 0;
  }
  const height = typeof tile.surfaceHeight === 'number' ? tile.surfaceHeight : 0;
  return Math.max(0, Math.min(1, height / 0.36));
}

function resolveTileDefinition(
  state: Render2DState,
  kind: string
): TileDefinitionLike | null {
  if (typeof state.getTileDefinition !== 'function') {
    return null;
  }
  return state.getTileDefinition(kind) ?? null;
}

function resolveTileName(state: Render2DState, kind: string): string | undefined {
  return resolveTileDefinition(state, kind)?.name;
}

function resolveTileColor(state: Render2DState, kind: string): string {
  const definition = resolveTileDefinition(state, kind);
  return definition?.miniColor ?? definition?.color ?? '#d9e8f4';
}

function drawReliefOverlay(
  context: CanvasRenderingContext2D,
  tile: ReliefTile,
  drawX: number,
  drawY: number,
  tileSize: number
) {
  const relief = getTileReliefStrength(tile);
  if (relief <= 0.04) {
    return;
  }

  context.fillStyle = `rgba(255,255,255,${(0.06 + relief * 0.16).toFixed(3)})`;
  context.fillRect(drawX, drawY, tileSize, Math.max(1, tileSize * 0.16));
  context.fillRect(drawX, drawY, Math.max(1, tileSize * 0.16), tileSize);

  context.fillStyle = `rgba(9,16,25,${(0.08 + relief * 0.18).toFixed(3)})`;
  context.fillRect(
    drawX,
    drawY + tileSize - Math.max(1, tileSize * 0.18),
    tileSize,
    Math.max(1, tileSize * 0.18)
  );
  context.fillRect(
    drawX + tileSize - Math.max(1, tileSize * 0.18),
    drawY,
    Math.max(1, tileSize * 0.18),
    tileSize
  );
}

function drawTrainOverlay(
  context: CanvasRenderingContext2D,
  tile: ReliefTile,
  drawX: number,
  drawY: number,
  tileSize: number
) {
  if (tile.kind !== 'rail' || !tile.train) {
    return;
  }

  const bodyWidth = Math.max(4, tileSize * 0.42);
  const bodyHeight = Math.max(3, tileSize * 0.22);
  const bodyX = drawX + (tileSize - bodyWidth) * 0.5;
  const bodyY = drawY + tileSize * 0.46;
  const directionOffset = tile.train.direction === 'backward' ? -1 : 1;

  context.fillStyle = '#1f2937';
  context.fillRect(bodyX, bodyY, bodyWidth, bodyHeight);
  context.fillStyle = '#d97706';
  context.fillRect(
    bodyX + bodyWidth * 0.18,
    bodyY - bodyHeight * 0.55,
    bodyWidth * 0.4,
    bodyHeight * 0.55
  );
  context.fillStyle = 'rgba(226,232,240,0.72)';
  context.fillRect(
    bodyX + bodyWidth * (directionOffset > 0 ? 0.68 : 0.08),
    bodyY - bodyHeight * 0.9,
    Math.max(2, tileSize * 0.12),
    Math.max(2, tileSize * 0.12)
  );
}

const ASCII_TILE_GLYPHS: Record<string, string> = {
  plains: '.',
  floor: '.',
  interior: '.',
  shore: ',',
  road: '=',
  rail: '=',
  river: '~',
  ocean: '~',
  bridge: '#',
  dock: '#',
  mountain: '^',
  forest: 'T',
  wall: '#',
  door: '+',
  town: 'T',
  cave: 'C',
  dungeon: 'D',
  sign: '!',
  ruins: 'R',
  quarry: 'Q',
  lighthouse: 'L',
  ship: 'S',
  observatory: 'O',
  unknown: '?',
};

export interface RiverOverlayDirection {
  id:
    | 'north'
    | 'east'
    | 'south'
    | 'west'
    | 'northeast'
    | 'southeast'
    | 'southwest'
    | 'northwest';
  dx: number;
  dy: number;
  edgeX: number;
  edgeY: number;
  inwardX: number;
  inwardY: number;
  angle: number;
}

export function getRiverOverlayConnections(
  tileAt: TileSampler,
  worldX: number,
  worldY: number
): RiverOverlayDirection[] {
  const directions = [
    createRiverOverlayDirection('north', 0, -1, 0.5, 0, 0.5, 0.22),
    createRiverOverlayDirection('east', 1, 0, 1, 0.5, 0.78, 0.5),
    createRiverOverlayDirection('south', 0, 1, 0.5, 1, 0.5, 0.78),
    createRiverOverlayDirection('west', -1, 0, 0, 0.5, 0.22, 0.5),
    createRiverOverlayDirection('northeast', 1, -1, 1, 0, 0.74, 0.26),
    createRiverOverlayDirection('southeast', 1, 1, 1, 1, 0.74, 0.74),
    createRiverOverlayDirection('southwest', -1, 1, 0, 1, 0.26, 0.74),
    createRiverOverlayDirection('northwest', -1, -1, 0, 0, 0.26, 0.26),
  ];

  return directions
    .filter(({ dx, dy }) =>
      RIVER_OVERLAY_NETWORK_KINDS.has(
        tileAt(worldX + dx, worldY + dy).kind
      )
    )
    .sort((left, right) => left.angle - right.angle);
}

function createRiverOverlayDirection(
  id: RiverOverlayDirection['id'],
  dx: number,
  dy: number,
  edgeX: number,
  edgeY: number,
  inwardX: number,
  inwardY: number
): RiverOverlayDirection {
  return {
    id,
    dx,
    dy,
    edgeX,
    edgeY,
    inwardX,
    inwardY,
    angle: Math.atan2(edgeY - 0.5, edgeX - 0.5),
  };
}

function drawRiverOverlay(
  context: CanvasRenderingContext2D,
  tileAt: TileSampler,
  worldX: number,
  worldY: number,
  x: number,
  y: number,
  size: number
) {
  const connections = getRiverOverlayConnections(tileAt, worldX, worldY);
  const bodyWidth = Math.max(3, size * 0.28);
  const highlightWidth = Math.max(1, bodyWidth * 0.28);
  const center = pointAt(x, y, size, 0.5, 0.5);

  if (connections.length === 0) {
    const stub = [
      center,
      pointAt(x, y, size, 0.48, 0.64),
      pointAt(x, y, size, 0.5, 0.82),
      pointAt(x, y, size, 0.5, 1),
    ];
    drawRiverStroke(context, stub, bodyWidth, '#38bdf8');
    drawRiverStroke(context, stub, highlightWidth, 'rgba(217,244,255,0.92)');
    return;
  }

  drawRiverPool(context, center.x, center.y, Math.max(2, bodyWidth * 0.42));

  if (connections.length === 2) {
    const [start, end] = connections;
    const curve = [
      pointAt(x, y, size, start.edgeX, start.edgeY),
      pointAt(x, y, size, start.inwardX, start.inwardY),
      pointAt(x, y, size, end.inwardX, end.inwardY),
      pointAt(x, y, size, end.edgeX, end.edgeY),
    ];
    drawRiverStroke(context, curve, bodyWidth, '#38bdf8');
    drawRiverStroke(context, curve, highlightWidth, 'rgba(217,244,255,0.92)');
    return;
  }

  connections.forEach((connection) => {
    const branch = [
      center,
      pointAt(
        x,
        y,
        size,
        0.5 + (connection.inwardX - 0.5) * 0.58,
        0.5 + (connection.inwardY - 0.5) * 0.58
      ),
      pointAt(x, y, size, connection.inwardX, connection.inwardY),
      pointAt(x, y, size, connection.edgeX, connection.edgeY),
    ];
    drawRiverStroke(context, branch, bodyWidth * 0.9, '#38bdf8');
    drawRiverStroke(
      context,
      branch,
      Math.max(1, highlightWidth * 0.95),
      'rgba(217,244,255,0.9)'
    );
  });
}

function drawRiverPool(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number
) {
  context.fillStyle = '#38bdf8';
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = 'rgba(217,244,255,0.82)';
  context.beginPath();
  context.arc(
    centerX - radius * 0.15,
    centerY - radius * 0.12,
    radius * 0.38,
    0,
    Math.PI * 2
  );
  context.fill();
}

function drawRiverStroke(
  context: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  lineWidth: number,
  strokeStyle: string
) {
  context.strokeStyle = strokeStyle;
  context.lineWidth = lineWidth;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  context.bezierCurveTo(
    points[1].x,
    points[1].y,
    points[2].x,
    points[2].y,
    points[3].x,
    points[3].y
  );
  context.stroke();
}

function pointAt(
  x: number,
  y: number,
  size: number,
  px: number,
  py: number
): Point2D {
  return {
    x: x + size * px,
    y: y + size * py,
  };
}

function drawRotatedGrid(
  context: CanvasRenderingContext2D,
  viewport: Render2DViewport,
  centerX: number,
  centerY: number,
  tileSize: number,
  rotation: number
) {
  context.save();
  context.translate(centerX + tileSize / 2, centerY + tileSize / 2);
  context.rotate(rotation);
  context.strokeStyle = 'rgba(255,255,255,0.08)';

  for (let x = -viewport.width; x <= viewport.width; x += tileSize) {
    context.beginPath();
    context.moveTo(x + 0.5, -viewport.height * 1.5);
    context.lineTo(x + 0.5, viewport.height * 1.5);
    context.stroke();
  }

  for (let y = -viewport.height; y <= viewport.height; y += tileSize) {
    context.beginPath();
    context.moveTo(-viewport.width * 1.5, y + 0.5);
    context.lineTo(viewport.width * 1.5, y + 0.5);
    context.stroke();
  }

  context.restore();
}

function drawFacingMarker(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  tileSize: number,
  facingAngle = -Math.PI / 2
) {
  context.save();
  context.translate(centerX, centerY);
  context.rotate(facingAngle);

  context.fillStyle = '#ffbf69';
  context.beginPath();
  context.moveTo(tileSize * 0.42, 0);
  context.lineTo(-tileSize * 0.18, -tileSize * 0.24);
  context.lineTo(-tileSize * 0.18, -tileSize * 0.11);
  context.lineTo(-tileSize * 0.38, -tileSize * 0.11);
  context.lineTo(-tileSize * 0.38, tileSize * 0.11);
  context.lineTo(-tileSize * 0.18, tileSize * 0.11);
  context.lineTo(-tileSize * 0.18, tileSize * 0.24);
  context.closePath();
  context.fill();

  context.strokeStyle = '#081019';
  context.lineWidth = Math.max(2, tileSize * 0.06);
  context.stroke();
  context.restore();
}

function drawTimeOfDayOverlay(
  context: CanvasRenderingContext2D,
  viewport: Render2DViewport,
  timeMs: number,
  environment: WorldEnvironmentLike
) {
  const cycle = getDaylightCycleState(timeMs, environment.cycle ?? {});

  context.save();

  const nightAlpha = cycle.night * 0.54;
  if (nightAlpha > 0.01) {
    context.fillStyle = `rgba(8, 16, 34, ${nightAlpha})`;
    context.fillRect(0, 0, viewport.width, viewport.height);
  }

  const duskAlpha = (1 - cycle.daylight) * 0.18;
  if (duskAlpha > 0.01) {
    const gradient = context.createLinearGradient(0, 0, 0, viewport.height);
    gradient.addColorStop(0, `rgba(255, 168, 110, ${duskAlpha * 0.9})`);
    gradient.addColorStop(1, `rgba(45, 68, 122, ${duskAlpha * 0.4})`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, viewport.width, viewport.height);
  }

  context.restore();
}
