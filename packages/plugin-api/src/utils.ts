import type {
  PluginName,
  PluginPackDefinitionLike,
  PluginPackLike,
  PluginPackManifestLike,
  RuntimePlugin,
  TilePlugin,
} from './types';

export const isCallable = (
  value: unknown
): value is (...args: unknown[]) => unknown => typeof value === 'function';

export const attemptCall = <T extends (...args: any[]) => any>(
  value: T,
  ...args: Parameters<T>
): ReturnType<T> => (isCallable(value) ? value(...args) : void 0);

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
