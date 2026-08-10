import type {
  Kind,
  OrderedPluginFactoryLike,
  PluginName,
  PluginPackDefinitionLike,
  PluginPackLike,
  PluginPackManifestLike,
  RuntimePlugin,
  TileDefinitionLike,
  TilePlugin,
} from './types';

export const isCallable = (
  value: unknown
): value is (...args: unknown[]) => unknown => typeof value === 'function';

export const attemptCall = <TArgs extends unknown[], TResult>(
  value: ((...args: TArgs) => TResult) | null | undefined,
  ...args: TArgs
): TResult | void => (isCallable(value) ? value(...args) : void 0);

export function withPluginOrder<T extends RuntimePlugin>(
  plugin: T,
  order: NonNullable<RuntimePlugin['order']>
): T {
  return {
    ...plugin,
    order: {
      ...plugin.order,
      ...order,
    },
  };
}

export function definePluginPack(
  manifest: PluginPackManifestLike,
  createPack: () => PluginPackLike
): PluginPackDefinitionLike {
  return {
    manifest,
    createPack,
  };
}

export function createPluginPack(
  name: PluginName,
  groups: Omit<PluginPackLike, 'name'> = {}
): PluginPackLike {
  return {
    name,
    ...groups,
  };
}

export function createRuntimePlugin(
  name: PluginName,
  extras: Omit<RuntimePlugin, 'name'> = {}
): RuntimePlugin {
  return {
    ...extras,
    name,
  };
}

export function createTilePlugin<TTile extends TilePlugin>(
  name: PluginName,
  tiles: TTile[],
  extras: Omit<RuntimePlugin, 'name' | 'tiles'> = {}
): RuntimePlugin {
  return {
    ...extras,
    name,
    tiles,
  };
}

export function createSingleTilePlugin<TTile extends TilePlugin>(
  name: PluginName,
  tile: TTile,
  extras: Omit<RuntimePlugin, 'name' | 'tiles'> = {}
): RuntimePlugin {
  return createTilePlugin(name, [tile], extras);
}

export function withOverworldTileClassifier<TTile extends TilePlugin>(
  tile: TTile,
  classifyOverworldTile: NonNullable<TilePlugin['classifyOverworldTile']>
): TTile {
  return {
    ...tile,
    classifyOverworldTile,
  };
}

export function instantiateOrderedPlugins<TPlugin extends RuntimePlugin>(
  specs: OrderedPluginFactoryLike<TPlugin>[]
): TPlugin[] {
  return specs.map((spec) =>
    spec.order ? withPluginOrder(spec.create(), spec.order) : spec.create()
  );
}

const DEFAULT_TILE_DEFINITION: TileDefinitionLike = {
  name: 'Unknown Tile',
  color: '#64748b',
  miniColor: '#94a3b8',
  walkable: true,
  wallHeight: 0,
};

export function createFallbackTileDefinition(
  kind?: Kind | null,
  fallback: TileDefinitionLike = DEFAULT_TILE_DEFINITION
): TileDefinitionLike {
  if (!kind || kind === 'unknown') {
    return fallback;
  }

  return {
    ...fallback,
    name: `${String(kind).slice(0, 1).toUpperCase()}${String(kind).slice(1)}`,
  };
}

export function listTileDefinitionsFromPlugins(
  plugins: RuntimePlugin[]
): Array<[Kind, TileDefinitionLike]> {
  return plugins
    .flatMap((plugin) => plugin.tiles ?? [])
    .flatMap((tile) =>
      tile.definition ? [[tile.kind, tile.definition] as const] : []
    );
}

export function resolveTileDefinitionFromPlugins(
  plugins: RuntimePlugin[],
  kind: Kind,
  fallback?: TileDefinitionLike
): TileDefinitionLike {
  const definitions = new Map(listTileDefinitionsFromPlugins(plugins));
  const defaultTileDefinition =
    plugins
      .flatMap((plugin) => plugin.tiles ?? [])
      .find((tile) => tile.isDefaultTile)?.definition ?? null;

  return (
    definitions.get(kind) ??
    defaultTileDefinition ??
    fallback ??
    createFallbackTileDefinition(kind)
  );
}

export function withDefaultTileKind<T extends RuntimePlugin>(
  plugin: T,
  kind: Kind
): T {
  return {
    ...plugin,
    tiles:
      plugin.tiles?.map((tile) =>
        tile.kind === kind
          ? {
              ...tile,
              isDefaultTile: true,
            }
          : tile
      ) ?? [],
  };
}

export function listPluginPackManifests(
  packDefinitions: PluginPackDefinitionLike[]
): PluginPackManifestLike[] {
  return packDefinitions.map((definition) => definition.manifest);
}

export function dedupePluginPackIds(packIds: string[]): string[] {
  return [...new Set(packIds)];
}

export function resolvePluginPackDefinition(
  packId: string,
  packDefinitions: PluginPackDefinitionLike[]
): PluginPackDefinitionLike {
  const definition = packDefinitions.find(
    (candidate) => candidate.manifest.id === packId
  );
  if (!definition) {
    const available = listPluginPackManifests(packDefinitions)
      .map((pack) => pack.id)
      .join(', ');
    throw new Error(
      `Unknown content pack "${packId}". Available packs: ${available}`
    );
  }
  return definition;
}

export function selectPluginPackManifests(
  packIds: string[],
  packDefinitions: PluginPackDefinitionLike[]
): PluginPackManifestLike[] {
  return dedupePluginPackIds(packIds).map(
    (packId) => resolvePluginPackDefinition(packId, packDefinitions).manifest
  );
}
