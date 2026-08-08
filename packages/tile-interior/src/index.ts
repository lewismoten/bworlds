import { composeTilePainter } from '@bworlds/paint-support';
import type { TilePainter2D } from '@bworlds/paint-support';
import { createTilePlugin } from '@bworlds/plugin-api';
import type { Paint2DContext, RuntimePlugin } from '@bworlds/plugin-api';

const TILE_PIXEL_SIZE = 16;

export function createInteriorTilePlugin(): RuntimePlugin {
  return createTilePlugin('tile-interior', [
    {
      kind: 'wall',
      definition: {
        name: 'Wall',
        color: '#334155',
        miniColor: '#64748b',
        walkable: false,
        wallHeight: 1,
      },
      paint2D: paintWallTile,
    },
    {
      kind: 'floor',
      definition: {
        name: 'Floor',
        color: '#94a3b8',
        miniColor: '#cbd5e1',
        walkable: true,
        wallHeight: 0,
      },
      paint2D: paintFloorTile,
    },
    {
      kind: 'door',
      definition: {
        name: 'Door',
        color: '#f97316',
        miniColor: '#fb923c',
        walkable: true,
        wallHeight: 0.1,
      },
      paint2D: createFloorBackedInteriorPainter(paintDoorOverlay),
    },
    {
      kind: 'stairsDown',
      definition: {
        name: 'Stairs Down',
        color: '#0f766e',
        miniColor: '#14b8a6',
        walkable: true,
        wallHeight: 0.1,
      },
      paint2D: createFloorBackedInteriorPainter(paintStairsDownOverlay),
    },
    {
      kind: 'stairsUp',
      definition: {
        name: 'Stairs Up',
        color: '#0891b2',
        miniColor: '#06b6d4',
        walkable: true,
        wallHeight: 0.1,
      },
      paint2D: createFloorBackedInteriorPainter(paintStairsUpOverlay),
    },
    {
      kind: 'shop',
      definition: {
        name: 'Shop',
        color: '#fb7185',
        miniColor: '#fda4af',
        walkable: true,
        wallHeight: 0.4,
      },
      paint2D: paintShopTile,
    },
  ]);
}

function paintWallTile({
  context,
  x,
  y,
  fillRect,
  motif,
}: Paint2DContext) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#475569');
  for (let row = 0; row < TILE_PIXEL_SIZE; row += 4) {
    fillRect(context, x, y + row, TILE_PIXEL_SIZE, 1, '#334155');
  }
  const stagger = motif.int(0, 1) * 4;
  for (let column = stagger; column < TILE_PIXEL_SIZE; column += 8) {
    fillRect(context, x + column, y + 4, 1, TILE_PIXEL_SIZE - 4, '#334155');
  }
  return true;
}

function paintFloorTile({
  context,
  x,
  y,
  fillRect,
  motif,
}: Paint2DContext) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#b8c5d3');
  const rowOffset = motif.int(0, 1);
  for (let row = rowOffset; row < TILE_PIXEL_SIZE; row += 4) {
    fillRect(context, x, y + row, TILE_PIXEL_SIZE, 1, '#94a3b8');
  }
  const colOffset = motif.int(0, 1);
  for (let column = colOffset; column < TILE_PIXEL_SIZE; column += 4) {
    fillRect(context, x + column, y, 1, TILE_PIXEL_SIZE, '#94a3b8');
  }
  return true;
}

function createFloorBackedInteriorPainter(
  overlayPainter: TilePainter2D
): TilePainter2D {
  return composeTilePainter(paintFloorTile, overlayPainter);
}

function paintDoorOverlay(paint: Paint2DContext): boolean {
  const { context, x, y, fillRect, motif } = paint;
  const doorX = 4 + motif.int(-1, 1);
  fillRect(context, x + doorX, y + 2, 8, 11, '#b45309');
  fillRect(context, x + doorX + 1, y + 3, 6, 9, '#ea580c');
  fillRect(context, x + doorX + 5, y + 7, 1, 1, '#fde68a');
  return true;
}

function paintStairsDownOverlay(paint: Paint2DContext): boolean {
  const { context, x, y, fillRect, motif } = paint;
  const inset = motif.int(0, 1);
  for (let step = 0; step < 5; step += 1) {
    fillRect(
      context,
      x + 3 + step + inset,
      y + 3 + step * 2,
      10 - step * 2,
      1,
      '#0f766e'
    );
  }
  return true;
}

function paintStairsUpOverlay(paint: Paint2DContext): boolean {
  const { context, x, y, fillRect, motif } = paint;
  const inset = motif.int(0, 1);
  for (let step = 0; step < 5; step += 1) {
    fillRect(
      context,
      x + 3 + step + inset,
      y + 11 - step * 2,
      10 - step * 2,
      1,
      '#0891b2'
    );
  }
  return true;
}

function paintShopTile({
  context,
  x,
  y,
  fillRect,
  motif,
}: Paint2DContext) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#8cc071');
  fillRect(context, x + 2, y + 5, 12, 7, '#fff1f2');
  fillRect(context, x + 2, y + 3, 12, 2, '#fb7185');
  const stripeOffset = motif.int(0, 1);
  for (let stripe = 2 + stripeOffset; stripe < 14; stripe += 4) {
    fillRect(context, x + stripe, y + 3, 2, 2, '#fecdd3');
  }
  fillRect(context, x + 6 + motif.int(0, 1), y + 8, 2, 4, '#7c2d12');
  return true;
}
