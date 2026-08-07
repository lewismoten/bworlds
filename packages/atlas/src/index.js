import { hash2D, TILE_DEFINITIONS } from '@bworlds/core';

const TILE_PIXEL_SIZE = 16;
const VARIANT_GRID_SIZE = 3;
const VARIANTS_PER_TILE = VARIANT_GRID_SIZE * VARIANT_GRID_SIZE;
const KIND_COLUMNS = 4;
const atlasCache = new Map();

export function drawAtlas(context) {
  const entries = Object.entries(TILE_DEFINITIONS);
  context.clearRect(0, 0, 256, 256);
  context.font = '10px sans-serif';
  context.textBaseline = 'middle';

  entries.slice(0, 16).forEach(([name], index) => {
    const x = (index % 2) * 128 + 10;
    const y = Math.floor(index / 2) * 30 + 6;

    drawTileSprite(context, name, x, y + 2, 18, { variant: 4 });
    context.fillStyle = '#ecf4f7';
    context.fillText(name, x + 26, y + 12);
  });
}

export function drawTileSprite(context, kind, x, y, size, options = {}) {
  const variant =
    options.variant ??
    getTileVariantIndex(kind, options.worldX ?? 0, options.worldY ?? 0);
  const sprite = getTileSpriteRegion(kind, variant);
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

  if (kind === 'ocean' && typeof options.timeMs === 'number') {
    drawOceanShimmer(context, x, y, size, {
      timeMs: options.timeMs,
      worldX: options.worldX ?? 0,
      worldY: options.worldY ?? 0,
      variant,
    });
  }
}

export function getTileVariantIndex(kind, worldX, worldY) {
  const hash = hash2D(`tile-variant:${kind}`, worldX, worldY);
  return Math.floor(hash * VARIANTS_PER_TILE) % VARIANTS_PER_TILE;
}

function getTileSpriteRegion(kind, variant) {
  const kinds = Object.keys(TILE_DEFINITIONS);
  const index = Math.max(0, kinds.indexOf(kind));
  const kindColumn = index % KIND_COLUMNS;
  const kindRow = Math.floor(index / KIND_COLUMNS);
  const variantColumn = variant % VARIANT_GRID_SIZE;
  const variantRow = Math.floor(variant / VARIANT_GRID_SIZE);

  return {
    x: (kindColumn * VARIANT_GRID_SIZE + variantColumn) * TILE_PIXEL_SIZE,
    y: (kindRow * VARIANT_GRID_SIZE + variantRow) * TILE_PIXEL_SIZE,
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
  const kindRows = Math.ceil(kinds.length / KIND_COLUMNS);
  const canvas = document.createElement('canvas');
  canvas.width = KIND_COLUMNS * VARIANT_GRID_SIZE * TILE_PIXEL_SIZE;
  canvas.height = kindRows * VARIANT_GRID_SIZE * TILE_PIXEL_SIZE;

  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;

  kinds.forEach((kind) => {
    for (let variant = 0; variant < VARIANTS_PER_TILE; variant += 1) {
      const sprite = getTileSpriteRegion(kind, variant);
      paintTileSprite(context, kind, variant, sprite.x, sprite.y);
    }
  });

  return canvas;
}

function paintTileSprite(context, kind, variant, x, y) {
  const definition = TILE_DEFINITIONS[kind];
  const motif = createVariantMotif(kind, variant);
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
  painter(context, x, y, definition, motif);
  shadeTileBorder(context, x, y, definition, motif);
}

function paintGenericTile(context, x, y, definition, motif) {
  speckle(context, x, y, definition.miniColor, 26, 0.28, motif);
}

function paintOceanTile(context, x, y, definition, motif) {
  const waveOffset = motif.int(0, 2);
  for (let row = waveOffset; row < TILE_PIXEL_SIZE; row += 3) {
    fillRect(context, x, y + row, TILE_PIXEL_SIZE, 1, definition.miniColor);
  }
  fillRect(context, x + motif.int(1, 3), y + 3, 4, 1, '#d9f4ff');
  fillRect(context, x + motif.int(8, 10), y + 9, 5, 1, '#d9f4ff');
}

function paintShoreTile(context, x, y, definition, motif) {
  speckle(context, x, y, '#fff1c8', 28, 0.35, motif);
  const tideHeight = 10 + motif.int(0, 2);
  fillRect(
    context,
    x,
    y + tideHeight,
    TILE_PIXEL_SIZE,
    2,
    definition.miniColor
  );
  fillRect(context, x, y + tideHeight + 2, TILE_PIXEL_SIZE, 1, '#d9f4ff');
}

function paintPlainsTile(context, x, y, _definition, motif) {
  speckle(context, x, y, '#b7df90', 20, 0.28, motif);
  const start = 1 + motif.int(0, 2);
  for (let blade = start; blade < TILE_PIXEL_SIZE; blade += 4) {
    fillRect(
      context,
      x + blade,
      y + 9 + ((blade + motif.seed) % 3),
      1,
      4,
      '#4f7f3c'
    );
  }
}

function paintForestTile(context, x, y, definition, motif) {
  paintPlainsTile(context, x, y, definition, motif);
  const trees = 2 + motif.int(0, 2);
  for (let tree = 0; tree < trees; tree += 1) {
    const offset = 2 + tree * 4 + motif.int(-1, 1);
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

function paintMountainTile(context, x, y, _definition, motif) {
  const leftPeak = 5 + motif.int(-1, 1);
  const rightPeak = 14 + motif.int(-1, 0);
  context.fillStyle = '#4b5563';
  context.beginPath();
  context.moveTo(x + 1, y + 14);
  context.lineTo(x + leftPeak, y + 4 + motif.int(-1, 1));
  context.lineTo(x + 10, y + 11);
  context.lineTo(x + rightPeak, y + 3 + motif.int(0, 1));
  context.lineTo(x + 15, y + 14);
  context.closePath();
  context.fill();
  fillRect(context, x + leftPeak - 1, y + 5, 2, 2, '#f8fafc');
  fillRect(context, x + rightPeak - 1, y + 4, 2, 2, '#f8fafc');
}

function paintRiverTile(context, x, y, definition, motif) {
  paintPlainsTile(context, x, y, definition, motif);
  const channel = 4 + motif.int(-1, 1);
  context.fillStyle = '#38bdf8';
  context.beginPath();
  context.moveTo(x + channel, y);
  context.lineTo(x + channel + 5, y);
  context.lineTo(x + channel + 8, y + TILE_PIXEL_SIZE);
  context.lineTo(x + channel + 3, y + TILE_PIXEL_SIZE);
  context.closePath();
  context.fill();
  fillRect(context, x + channel + 3, y + 2, 1, 12, '#d9f4ff');
}

function paintRoadTile(context, x, y, definition, motif) {
  paintPlainsTile(context, x, y, definition, motif);
  const roadY = 5 + motif.int(0, 2);
  fillRect(context, x, y + roadY, TILE_PIXEL_SIZE, 4, '#8a5a19');
  fillRect(context, x, y + roadY + 1, TILE_PIXEL_SIZE, 1, '#d7b172');
}

function paintBridgeTile(context, x, y, _definition, motif) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#2a78c8');
  const offset = motif.int(0, 1);
  for (let plank = 1 + offset; plank < TILE_PIXEL_SIZE; plank += 3) {
    fillRect(context, x + plank, y + 4, 2, 8, '#a86b2d');
  }
  fillRect(context, x, y + 3, TILE_PIXEL_SIZE, 1, '#6b3f15');
  fillRect(context, x, y + 12, TILE_PIXEL_SIZE, 1, '#6b3f15');
}

function paintSignTile(context, x, y, definition, motif) {
  paintPlainsTile(context, x, y, definition, motif);
  const postX = 6 + motif.int(0, 2);
  fillRect(context, x + postX, y + 5, 2, 7, '#5b3716');
  fillRect(context, x + postX - 3, y + 3, 8, 4, '#f3c266');
  fillRect(context, x + postX - 2, y + 4, 6, 1, '#8a5a19');
}

function paintTownTile(context, x, y, _definition, motif) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#88b871');
  fillRect(context, x + 1, y + 6, 14, 4, '#9f6f32');
  const left = 1 + motif.int(0, 1);
  const right = 9 + motif.int(-1, 0);
  fillRect(context, x + left, y + 2, 5, 4, '#f8fafc');
  fillRect(context, x + right, y + 2, 5, 4, '#f8fafc');
  fillRect(context, x + left, y + 3, 5, 1, '#e879f9');
  fillRect(context, x + right, y + 3, 5, 1, '#fb7185');
  fillRect(context, x + left + 2, y + 10, 2, 3, '#7c3f1d');
  fillRect(context, x + right + 2, y + 10, 2, 3, '#7c3f1d');
}

function paintDungeonTile(context, x, y, _definition, motif) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#4b1d1d');
  speckle(context, x, y, '#7f1d1d', 20, 0.3, motif);
  const mouth = 4 + motif.int(-1, 1);
  fillRect(context, x + mouth, y + 4, 8, 8, '#111827');
  fillRect(context, x + mouth + 2, y + 6, 4, 6, '#dc2626');
}

function paintCaveTile(context, x, y, definition, motif) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#7fb069');
  speckle(context, x, y, '#9ecf82', 14, 0.22, motif);
  context.fillStyle = '#27272a';
  context.beginPath();
  context.arc(x + 8 + motif.int(-1, 1), y + 8, 5.5, 0, Math.PI * 2);
  context.fill();
  fillRect(context, x + 5, y + 8, 6, 4, '#09090b');
  paintPlainsTile(context, x, y, definition, motif);
}

function paintWallTile(context, x, y, _definition, motif) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#475569');
  for (let row = 0; row < TILE_PIXEL_SIZE; row += 4) {
    fillRect(context, x, y + row, TILE_PIXEL_SIZE, 1, '#334155');
  }
  const stagger = motif.int(0, 1) * 4;
  for (let column = stagger; column < TILE_PIXEL_SIZE; column += 8) {
    fillRect(context, x + column, y + 4, 1, TILE_PIXEL_SIZE - 4, '#334155');
  }
}

function paintFloorTile(context, x, y, _definition, motif) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#b8c5d3');
  const rowOffset = motif.int(0, 1);
  for (let row = rowOffset; row < TILE_PIXEL_SIZE; row += 4) {
    fillRect(context, x, y + row, TILE_PIXEL_SIZE, 1, '#94a3b8');
  }
  const colOffset = motif.int(0, 1);
  for (let column = colOffset; column < TILE_PIXEL_SIZE; column += 4) {
    fillRect(context, x + column, y, 1, TILE_PIXEL_SIZE, '#94a3b8');
  }
}

function paintDoorTile(context, x, y, definition, motif) {
  paintFloorTile(context, x, y, definition, motif);
  const doorX = 4 + motif.int(-1, 1);
  fillRect(context, x + doorX, y + 2, 8, 11, '#b45309');
  fillRect(context, x + doorX + 1, y + 3, 6, 9, '#ea580c');
  fillRect(context, x + doorX + 5, y + 7, 1, 1, '#fde68a');
}

function paintStairsDownTile(context, x, y, definition, motif) {
  paintFloorTile(context, x, y, definition, motif);
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
}

function paintStairsUpTile(context, x, y, definition, motif) {
  paintFloorTile(context, x, y, definition, motif);
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
}

function paintShopTile(context, x, y, _definition, motif) {
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, '#8cc071');
  fillRect(context, x + 2, y + 5, 12, 7, '#fff1f2');
  fillRect(context, x + 2, y + 3, 12, 2, '#fb7185');
  const stripeOffset = motif.int(0, 1);
  for (let stripe = 2 + stripeOffset; stripe < 14; stripe += 4) {
    fillRect(context, x + stripe, y + 3, 2, 2, '#fecdd3');
  }
  fillRect(context, x + 6 + motif.int(0, 1), y + 8, 2, 4, '#7c2d12');
}

function shadeTileBorder(context, x, y, definition, motif) {
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
  fillRect(context, x + 1 + motif.int(0, 1), y + 1, 1, 1, definition.miniColor);
}

function drawOceanShimmer(context, x, y, size, options) {
  const { timeMs, worldX, worldY, variant } = options;
  const time = timeMs * 0.0012;
  const seed = hash2D(`ocean-shimmer:${variant}`, worldX, worldY);
  const drift = (seed - 0.5) * 1.8;

  context.save();
  context.beginPath();
  context.rect(x, y, size, size);
  context.clip();

  for (let band = 0; band < 3; band += 1) {
    const phase = time + band * 1.7 + drift;
    const centerX = x + (Math.sin(phase) * 0.5 + 0.5) * size;
    const centerY =
      y + size * (0.22 + band * 0.22) + Math.cos(phase * 1.3) * size * 0.04;
    const glow = context.createRadialGradient(
      centerX,
      centerY,
      0,
      centerX,
      centerY,
      size * 0.38
    );
    glow.addColorStop(0, 'rgba(255,255,255,0.34)');
    glow.addColorStop(0.35, 'rgba(217,244,255,0.18)');
    glow.addColorStop(1, 'rgba(217,244,255,0)');
    context.fillStyle = glow;
    context.fillRect(x, y, size, size);
  }

  context.strokeStyle = 'rgba(255,255,255,0.16)';
  context.lineWidth = Math.max(1, size * 0.045);
  for (let streak = 0; streak < 2; streak += 1) {
    const phase = time * 1.4 + streak * 2.1 + drift;
    const startX = x + (Math.sin(phase) * 0.5 + 0.5) * size * 0.8 + size * 0.1;
    const startY = y + size * (0.28 + streak * 0.26);
    context.beginPath();
    context.moveTo(startX - size * 0.1, startY);
    context.quadraticCurveTo(
      startX + size * 0.06,
      startY - size * 0.05,
      startX + size * 0.18,
      startY
    );
    context.stroke();
  }

  context.restore();
}

function speckle(context, x, y, color, count, alpha, motif) {
  context.fillStyle = withAlpha(color, alpha);
  for (let index = 0; index < count; index += 1) {
    const px = x + ((index * 7 + 3 + motif.seed) % TILE_PIXEL_SIZE);
    const py = y + ((index * 11 + 5 + motif.seed * 2) % TILE_PIXEL_SIZE);
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

function createVariantMotif(kind, variant) {
  const seed = Math.floor(
    hash2D(`atlas:${kind}`, variant, variant * 13) * 100000
  );
  return {
    seed,
    int(min, max) {
      const span = max - min + 1;
      const value = Math.floor(
        hash2D(`motif:${kind}:${variant}`, min, max) * span
      );
      return min + value;
    },
  };
}
