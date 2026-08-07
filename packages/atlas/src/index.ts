import { hash2D } from '@bworlds/core';
import { getActivePluginRegistry } from '@bworlds/plugin-api';

const TILE_PIXEL_SIZE = 16;
const VARIANT_GRID_SIZE = 3;
const VARIANTS_PER_TILE = VARIANT_GRID_SIZE * VARIANT_GRID_SIZE;
const KIND_COLUMNS = 4;
const atlasCache = new Map();
const FALLBACK_TILE_DEFINITION = {
  name: 'Unknown Tile',
  color: '#64748b',
  miniColor: '#94a3b8',
  walkable: true,
  wallHeight: 0,
};
type DrawTileSpriteOptions = {
  variant?: number;
  worldX?: number;
  worldY?: number;
  timeMs?: number;
};

export function drawAtlas(context) {
  const entries = getTileDefinitionEntries();
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

export function drawTileSprite(
  context,
  kind,
  x,
  y,
  size,
  options: DrawTileSpriteOptions = {}
) {
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

  const registry = getActivePluginRegistry();
  registry.paint2DOverlay({
    context,
    tile: { kind },
    definition: registry.resolveTileDefinition(kind, FALLBACK_TILE_DEFINITION),
    x,
    y,
    size,
    worldX: options.worldX ?? 0,
    worldY: options.worldY ?? 0,
    variant,
    timeMs: options.timeMs,
  });
}

export function getTileVariantIndex(kind, worldX, worldY) {
  const hash = hash2D(`tile-variant:${kind}`, worldX, worldY);
  return Math.floor(hash * VARIANTS_PER_TILE) % VARIANTS_PER_TILE;
}

export function getTileAtlasCanvas() {
  return getAtlasCanvas();
}

export function getTilePixelSize() {
  return TILE_PIXEL_SIZE;
}

export function getTileSpriteRect(kind, variant) {
  return getTileSpriteRegion(kind, variant);
}

function getTileSpriteRegion(kind, variant) {
  const kinds = getTileDefinitionEntries().map(([name]) => name);
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
  const kinds = getTileDefinitionEntries().map(([kind]) => kind);
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
  const definition = getActivePluginRegistry().resolveTileDefinition(
    kind,
    FALLBACK_TILE_DEFINITION
  );
  const motif = createVariantMotif(kind, variant);
  fillRect(context, x, y, TILE_PIXEL_SIZE, TILE_PIXEL_SIZE, definition.color);

  const tilePlugin = getActivePluginRegistry().getTilePlugin(kind);
  const handled = tilePlugin?.paint2D?.({
    context,
    kind,
    definition,
    motif,
    x,
    y,
    tilePixelSize: TILE_PIXEL_SIZE,
    fillRect,
    speckle,
  });
  if (handled) {
    shadeTileBorder(context, x, y, definition, motif);
    return;
  }
  paintGenericTile(context, x, y, definition, motif);
  shadeTileBorder(context, x, y, definition, motif);
}

function paintGenericTile(context, x, y, definition, motif) {
  speckle(context, x, y, definition.miniColor, 26, 0.28, motif);
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

function getTileDefinitionEntries() {
  const entries = getActivePluginRegistry().listTileDefinitions();
  if (entries.length > 0) {
    return entries;
  }
  return [['unknown', FALLBACK_TILE_DEFINITION]];
}
