import type { TileDefinitionLike, TileLike } from '@bworlds/plugin-api';

export type MapTileSymbolState = {
  kind: TileLike['kind'];
  note?: TileLike['note'];
  surfaceHeight?: unknown;
  train?: TileLike['train'];
  boat?: TileLike['boat'];
};

export type MapTileSymbolDescriptor = {
  glyph: string;
  color: string;
  annotation?: string;
  reliefStrength: number;
};

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

export function getMapTileSymbolGlyph(kind: string, tileName?: string): string {
  const fallbackGlyph =
    tileName?.trim().charAt(0) || kind.trim().charAt(0) || '?';
  const glyph = ASCII_TILE_GLYPHS[kind] ?? fallbackGlyph;
  return glyph.toUpperCase();
}

export function getMapTileReliefStrength(tile: MapTileSymbolState): number {
  if (
    tile.kind === 'river' ||
    tile.kind === 'ocean' ||
    tile.kind === 'bridge' ||
    tile.kind === 'dock' ||
    tile.kind === 'mountain'
  ) {
    return 0;
  }
  const height =
    typeof tile.surfaceHeight === 'number' ? tile.surfaceHeight : 0;
  return Math.max(0, Math.min(1, height / 0.36));
}

export function resolveMapTileSymbolDescriptor(params: {
  tile: MapTileSymbolState;
  tileDefinition?: Pick<TileDefinitionLike, 'name' | 'color' | 'miniColor'> | null;
}): MapTileSymbolDescriptor {
  const color =
    params.tileDefinition?.miniColor ??
    params.tileDefinition?.color ??
    '#d9e8f4';
  const annotation = resolveMapTileAnnotation(params.tile);
  return {
    glyph: getMapTileSymbolGlyph(params.tile.kind, params.tileDefinition?.name),
    color,
    ...(annotation == null ? {} : { annotation }),
    reliefStrength: getMapTileReliefStrength(params.tile),
  };
}

function resolveMapTileAnnotation(tile: MapTileSymbolState): string | undefined {
  const tags: string[] = [];
  if (tile.kind === 'rail' && tile.train) {
    tags.push('TRN');
  }
  if (
    (tile.kind === 'ocean' || tile.kind === 'bridge' || tile.kind === 'dock') &&
    tile.boat
  ) {
    tags.push('BOT');
  }
  if (getMapTileReliefStrength(tile) > 0.04) {
    tags.push('RLF');
  }
  return tags.length > 0 ? tags.join(' ') : undefined;
}
