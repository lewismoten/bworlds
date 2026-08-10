export type CoreWorldTileKind =
  | 'unknown'
  | 'plains'
  | 'shore'
  | 'mountain'
  | 'forest'
  | 'interior'
  | 'floor'
  | 'wall'
  | 'door'
  | 'road'
  | 'ruins'
  | 'ocean'
  | 'river'
  | 'bridge'
  | 'sign'
  | 'town'
  | 'cave'
  | 'dungeon'
  | 'quarry'
  | 'lighthouse'
  | 'ship'
  | 'observatory'
  | 'shop'
  | 'stairsUp'
  | 'stairsDown'
  | (string & {});

export type CoreTileDefinitionLike = {
  name: string;
  color: string;
  miniColor: string;
  walkable: boolean;
  wallHeight: number;
};

export type CoreWorldTileLike = {
  kind: CoreWorldTileKind;
};

export const DEFAULT_TILE_DEFINITION: CoreTileDefinitionLike = {
  name: 'Unknown Tile',
  color: '#64748b',
  miniColor: '#94a3b8',
  walkable: true,
  wallHeight: 0,
};

export function getTileDefinition(
  kind: CoreWorldTileKind
): CoreTileDefinitionLike {
  return {
    ...DEFAULT_TILE_DEFINITION,
    name: kind
      ? `${String(kind).slice(0, 1).toUpperCase()}${String(kind).slice(1)}`
      : DEFAULT_TILE_DEFINITION.name,
  };
}
