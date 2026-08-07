import { TILE_DEFINITIONS } from '@bworlds/core';

const TILE_PIXEL_SIZE = 16;
const ATLAS_COLUMNS = 4;
const atlasCache = new Map();

export function drawAtlas(context) {
  const atlas = getAtlasCanvas();
  const entries = Object.entries(TILE_DEFINITIONS);
  context.clearRect(0, 0, 256, 256);
  context.font = '10px sans-serif';
  context.textBaseline = 'middle';

  entries.slice(0, 16).forEach(([name], index) => {
    const x = (index % 2) * 128 + 10;
    const y = Math.floor(index / 2) * 30 + 8;
    drawTileSprite(context, name, x, y, 18);
    context.fillStyle = '#ecf4f7';
    context.fillText(name, x + 26, y + 10);
  });
}

export function drawTileSprite(context, kind, x, y, size) {
  const sprite = getTileSpriteRegion(kind);
  const atlas = getAtlasCanvas();
  context.drawImage(
    atlas,
    sprite.x,
    sprite.y,
    TILE_PIXEL_SIZE,
    TILE_PIXEL_SIZE,
    x,
    y,
    size,
    size
  );
}

function getTileSpriteRegion(kind) {
  const atlas = getAtlasCanvas();
  const kinds = Object.keys(TILE_DEFINITIONS);
  const index = Math.max(0, kinds.indexOf(kind));
  const column = index % ATLAS_COLUMNS;
  const row = Math.floor(index / ATLAS_COLUMNS);

  return {
    atlas,
    x: column * TILE_PIXEL_SIZE,
    y: row * TILE_PIXEL_SIZE,
  };
}

function getAtlasCanvas() {
  if (!atlasCache.has('default')) {
    atlasCache.set('default', buildAtlasCanvas());
  }
  return atlasCache.get('default');
}

function buildAtlasCanvas() {
  const kinds = Object.keys(TILE_DEFINITIONS);
  const rows = Math.ceil(kinds.length / ATLAS_COLUMNS);
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLUMNS * TILE_PIXEL_SIZE;
  canvas.height = rows * TILE_PIXEL_SIZE;

  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;

  kinds.forEach((kind, index) => {
    const column = index % ATLAS_COLUMNS;
    const row = Math.floor(index / ATLAS_COLUMNS);
    const x = column * TILE_PIXEL_SIZE;
    const y = row * TILE_PIXEL_SIZE;
    paintTileSprite(context, kind, x, y);
  });

  return canvas;
}

function paintTileSprite(context, kind, x, y) {
  const definition = TILE_DEFINITIONS[kind];
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, definition.color);

  const painters = {
    ocean: paintOceanTile,
    shore: paintShoreTile,
    plains: paintPlainsTile,
    forest: paintForestTile,
    mountain: paintMountainTile,
    river: paintRiverTile,
    road: paintRoadTile,
    bridge: paintBridgeTile,
    sign: paintSignTile,
    town: paintTownTile,
    dungeon: paintDungeonTile,
    cave: paintCaveTile,
    wall: paintWallTile,
    floor: paintFloorTile,
    door: paintDoorTile,
    stairsDown: paintStairsDownTile,
    stairsUp: paintStairsUpTile,
    shop: paintShopTile,
  };

  const painter = painters[kind] ?? paintGenericTile;
  painter(context, x, y, definition);
  shadeTileBorder(context, x, y, definition);
}

function paintGenericTile(context, x, y, definition) {
  speckle(context, x, y, definition.miniColor, 26, 0.28);
}

function paintOceanTile(context, x, y, definition) {
  for (let row = 0; row < TILE_PIXEL_SIZE; row += 3) {
    fillRect(context, x, y + row, TILE_PIXEL_SIZE, 1, definition.miniColor);
  }
  fillRect(context, x + 2, y + 3, 4, 1, '#d9f4ff');
  fillRect(context, x + 9, y + 9, 5, 1, '#d9f4ff');
}

function paintShoreTile(context, x, y) {
  speckle(context, x, y, '#fff1c8', 28, 0.35);
  fillRect(context, x, y + 11, TILE_PIXEL_SIZE, 2, '#4ea3ff');
  fillRect(context, x, y + 13, TILE_PIXEL_SIZE, 1, '#d9f4ff');
}

function paintPlainsTile(context, x, y) {
  speckle(context, x, y, '#b7df90', 20, 0.28);
  for (let blade = 2; blade < TILE_PIXEL_SIZE; blade += 4) {
    fillRect(context, x + blade, y + 10, 1, 4, '#4f7f3c');
  }
}

function paintForestTile(context, x, y) {
  paintPlainsTile(context, x, y);
  for (let tree = 1; tree <= 3; tree += 1) {
    const offset = tree * 4 - 2;
    fillRect(context, x + offset + 1, y + 8, 1, 4, '#4a2f1b');
    context.fillStyle = '#163b20';
    context.beginPath();
    context.arc(x + offset + 1.5, y + 7, 2.6, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(x + offset - 0.2, y + 6.2, 2, 0, Math.PI * 2);
    context.fill();
  }
}

function paintMountainTile(context, x, y) {
  context.fillStyle = '#4b5563';
  context.beginPath();
  context.moveTo(x + 1, y + 14);
  context.lineTo(x + 6, y + 4);
  context.lineTo(x + 10, y + 11);
  context.lineTo(x + 15, y + 3);
  context.lineTo(x + 15, y + 14);
  context.closePath();
  context.fill();
  fillRect(context, x + 5, y + 5, 2, 2, '#f8fafc');
  fillRect(context, x + 13, y + 4, 2, 2, '#f8fafc');
}

function paintRiverTile(context, x, y) {
  paintPlainsTile(context, x, y);
  context.fillStyle = '#38bdf8';
  context.beginPath();
  context.moveTo(x + 4, y);
  context.lineTo(x + 9, y);
  context.lineTo(x + 12, y + TILE_PIXEL_SIZE);
  context.lineTo(x + 7, y + TILE_PIXEL_SIZE);
  context.closePath();
  context.fill();
  fillRect(context, x + 7, y + 2, 1, 12, '#d9f4ff');
}

function paintRoadTile(context, x, y) {
  paintPlainsTile(context, x, y);
  fillRect(context, x, y + 6, TILE_PIXEL_SIZE, 4, '#8a5a19');
  fillRect(context, x, y + 7, TILE_PIXEL_SIZE, 1, '#d7b172');
}

function paintBridgeTile(context, x, y) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#2a78c8');
  for (let plank = 1; plank < TILE_PIXEL_SIZE; plank += 3) {
    fillRect(context, x + plank, y + 4, 2, 8, '#a86b2d');
  }
  fillRect(context, x, y + 3, TILE_PIXEL_SIZE, 1, '#6b3f15');
  fillRect(context, x, y + 12, TILE_PIXEL_SIZE, 1, '#6b3f15');
}

function paintSignTile(context, x, y) {
  paintPlainsTile(context, x, y);
  fillRect(context, x + 7, y + 5, 2, 7, '#5b3716');
  fillRect(context, x + 4, y + 3, 8, 4, '#f3c266');
  fillRect(context, x + 5, y + 4, 6, 1, '#8a5a19');
}

function paintTownTile(context, x, y) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#88b871');
  fillRect(context, x + 1, y + 6, 14, 4, '#9f6f32');
  fillRect(context, x + 2, y + 2, 5, 4, '#f8fafc');
  fillRect(context, x + 9, y + 2, 5, 4, '#f8fafc');
  fillRect(context, x + 2, y + 3, 5, 1, '#e879f9');
  fillRect(context, x + 9, y + 3, 5, 1, '#fb7185');
  fillRect(context, x + 4, y + 10, 2, 3, '#7c3f1d');
  fillRect(context, x + 11, y + 10, 2, 3, '#7c3f1d');
}

function paintDungeonTile(context, x, y) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#4b1d1d');
  speckle(context, x, y, '#7f1d1d', 20, 0.3);
  fillRect(context, x + 4, y + 4, 8, 8, '#111827');
  fillRect(context, x + 6, y + 6, 4, 6, '#dc2626');
}

function paintCaveTile(context, x, y) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#7fb069');
  context.fillStyle = '#27272a';
  context.beginPath();
  context.arc(x + 8, y + 8, 5.5, 0, Math.PI * 2);
  context.fill();
  fillRect(context, x + 5, y + 8, 6, 4, '#09090b');
}

function paintWallTile(context, x, y) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#475569');
  for (let row = 0; row < TILE_PIXEL_SIZE; row += 4) {
    fillRect(context, x, y + row, TILE_PIXEL_SIZE, 1, '#334155');
  }
  for (
    let column = (y / 4) % 2 === 0 ? 0 : 4;
    column < TILE_PIXEL_SIZE;
    column += 8
  ) {
    fillRect(context, x + column, y + 4, 1, TILE_PIXEL_SIZE - 4, '#334155');
  }
}

function paintFloorTile(context, x, y) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#b8c5d3');
  for (let row = 0; row < TILE_PIXEL_SIZE; row += 4) {
    fillRect(context, x, y + row, TILE_PIXEL_SIZE, 1, '#94a3b8');
  }
  for (let column = 0; column < TILE_PIXEL_SIZE; column += 4) {
    fillRect(context, x + column, y, 1, TILE_PIXEL_SIZE, '#94a3b8');
  }
}

function paintDoorTile(context, x, y) {
  paintFloorTile(context, x, y);
  fillRect(context, x + 4, y + 2, 8, 11, '#b45309');
  fillRect(context, x + 5, y + 3, 6, 9, '#ea580c');
  fillRect(context, x + 9, y + 7, 1, 1, '#fde68a');
}

function paintStairsDownTile(context, x, y) {
  paintFloorTile(context, x, y);
  for (let step = 0; step < 5; step += 1) {
    fillRect(
      context,
      x + 3 + step,
      y + 3 + step * 2,
      10 - step * 2,
      1,
      '#0f766e'
    );
  }
}

function paintStairsUpTile(context, x, y) {
  paintFloorTile(context, x, y);
  for (let step = 0; step < 5; step += 1) {
    fillRect(
      context,
      x + 3 + step,
      y + 11 - step * 2,
      10 - step * 2,
      1,
      '#0891b2'
    );
  }
}

function paintShopTile(context, x, y) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#8cc071');
  fillRect(context, x + 2, y + 5, 12, 7, '#fff1f2');
  fillRect(context, x + 2, y + 3, 12, 2, '#fb7185');
  for (let stripe = 2; stripe < 14; stripe += 4) {
    fillRect(context, x + stripe, y + 3, 2, 2, '#fecdd3');
  }
  fillRect(context, x + 7, y + 8, 2, 4, '#7c2d12');
}

function shadeTileBorder(context, x, y, definition) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, 1, 'rgba(255,255,255,0.12)');
  fillRect(context, x, y, 1, TILE_PIXEL_SIZE, 'rgba(255,255,255,0.1)');
  fillRect(
    context,
    x,
    y + TILE_PIXEL_SIZE - 1,
    TILE_PIXEL_SIZE,
    1,
    'rgba(0,0,0,0.16)'
  );
  fillRect(
    context,
    x + TILE_PIXEL_SIZE - 1,
    y,
    1,
    TILE_PIXEL_SIZE,
    'rgba(0,0,0,0.18)'
  );
  fillRect(context, x + 1, y + 1, 1, 1, definition.miniColor);
}

function speckle(context, x, y, color, count, alpha) {
  context.fillStyle = withAlpha(color, alpha);
  for (let index = 0; index < count; index += 1) {
    const px = x + ((index * 7 + 3) % TILE_PIXEL_SIZE);
    const py = y + ((index * 11 + 5) % TILE_PIXEL_SIZE);
    context.fillRect(px, py, 1, 1);
  }
}

function fillRect(context, x, y, width, height, color) {
  context.fillStyle = color;
  context.fillRect(x, y, width, height);
}

function withAlpha(hex, alpha) {
  const normalized = hex.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
