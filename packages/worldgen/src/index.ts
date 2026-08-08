import {
  createPlayer,
  createWorldState,
} from '@bworlds/core';
import {
  createFrontierContentPackDefinition,
  frontierContentPackManifest,
} from '@bworlds/content-pack-frontier';
import {
  createRuinsContentPackDefinition,
  ruinsContentPackManifest,
} from '@bworlds/content-pack-ruins';
import {
  createDefaultContentPackDefinition,
  createDefaultRuntimePlugins as createDefaultRuntimePluginsFromPack,
  createDefaultTilePlugins as createDefaultTilePluginsFromPack,
} from '@bworlds/content-pack-default';
import {
  createFallbackTileDefinition,
  createPluginPackCatalog,
  PluginRegistry,
  setActivePluginRegistry,
  type PluginPackDefinitionLike,
  type PluginPackManifestLike,
  type RuntimePlayerLike,
  type Seed,
  type TileLike,
  type WorldContextLike,
  type WorldMapLike,
  type WorldStateLike,
} from '@bworlds/plugin-api';

type Point = { x: number; y: number };
type SpawnTile = TileLike & {
  building?: { id: string };
};
type Context = WorldContextLike & {
  origin: Point;
};

const OVERWORLD_CONTEXT: Context = {
  id: 'overworld',
  label: 'Overworld',
  type: 'overworld',
  depth: 0,
  origin: { x: 0, y: 0 },
};

function makeKey(...parts: Array<string | number>): string {
  return parts.join(':');
}

export function createWorldGenerator({
  seed,
  plugins,
}: {
  seed: Seed;
  plugins: PluginRegistry;
}): {
  getMap(context: Context): WorldMapLike;
  sampleOverworld(x: number, y: number): SpawnTile;
} {
  const mapCache = new Map<string, WorldMapLike>();
  const getMap = (context: Context) => {
    const key = makeKey(context.id, context.depth);
    if (!mapCache.has(key)) {
      const map = plugins.createMap({
        context,
        seed,
        plugins,
      });
      if (!map) {
        throw new Error(
          `No map plugin registered for context type "${context.type}"`
        );
      }
      mapCache.set(key, map);
    }
    return mapCache.get(key) as WorldMapLike;
  };

  return {
    getMap,
    sampleOverworld(x: number, y: number) {
      return getMap(OVERWORLD_CONTEXT).getTile(x, y) as SpawnTile;
    },
  };
}

export function createDefaultRuntimePlugins() {
  return createDefaultRuntimePluginsFromPack();
}

export function createDefaultTilePlugins() {
  return createDefaultTilePluginsFromPack();
}

export function createDefaultPluginRegistry() {
  return createBuiltinContentPackCatalog().createRegistry(['default-content-pack']);
}

export function createBuiltinContentPackDefinitions(): PluginPackDefinitionLike[] {
  return [
    createDefaultContentPackDefinition(),
    createFrontierContentPackDefinition(),
    createRuinsContentPackDefinition(),
  ];
}

export function createBuiltinContentPackCatalog() {
  return createPluginPackCatalog(createBuiltinContentPackDefinitions(), [
    'default-content-pack',
    frontierContentPackManifest.id,
  ]);
}

export function listContentPacks(
  packDefinitions: PluginPackDefinitionLike[] = createBuiltinContentPackDefinitions()
): PluginPackManifestLike[] {
  return createPluginPackCatalog(packDefinitions).list();
}

export function listBuiltinContentPacks(): PluginPackManifestLike[] {
  return createBuiltinContentPackCatalog().list();
}

export function createPluginRegistryFromPacks(
  packIds: string[] = createBuiltinContentPackCatalog().defaultPackIds,
  packDefinitions: PluginPackDefinitionLike[] = createBuiltinContentPackDefinitions()
) {
  return createPluginPackCatalog(packDefinitions, packIds).createRegistry();
}

export function createPluginRegistryFromPack(
  packId = 'default-content-pack',
  packDefinitions: PluginPackDefinitionLike[] = createBuiltinContentPackDefinitions()
) {
  return createPluginRegistryFromPacks([packId], packDefinitions);
}

export function createWorldRuntime({
  seed = 'bworlds-alpha',
  packIds = createBuiltinContentPackCatalog().defaultPackIds,
  packDefinitions = createBuiltinContentPackDefinitions(),
  player,
  stack,
  viewMode,
  activateRegistry = true,
}: {
  seed?: Seed;
  packIds?: string[];
  packDefinitions?: PluginPackDefinitionLike[];
  player?: Partial<RuntimePlayerLike>;
  stack?: WorldContextLike[];
  viewMode?: string;
  activateRegistry?: boolean;
} = {}): {
  contentPacks: PluginPackManifestLike[];
  generator: ReturnType<typeof createWorldGenerator>;
  registry: PluginRegistry;
  state: WorldStateLike & {
    stack: WorldContextLike[];
    viewMode: string;
  };
} {
  const packCatalog = createPluginPackCatalog(packDefinitions, packIds);
  const registry = packCatalog.createRegistry();
  if (activateRegistry) {
    setActivePluginRegistry(registry);
  }

  const generator = createWorldGenerator({
    seed,
    plugins: registry,
  });
  const state = createWorldState({
    generator,
    player: createPlayer(player),
    resolveTileDefinition(kind) {
      const fallback =
        registry.getDefaultTileDefinition(createFallbackTileDefinition(kind)) ??
        createFallbackTileDefinition(kind);
      return registry.resolveTileDefinition(kind, fallback);
    },
  }) as WorldStateLike & {
    stack: WorldContextLike[];
    viewMode: string;
  };

  if (viewMode === '2d' || viewMode === '3d') {
    state.viewMode = viewMode;
  }
  if (Array.isArray(stack) && stack.length > 0) {
    state.stack = stack;
  }

  return {
    contentPacks: packCatalog.listSelected(),
    generator,
    registry,
    state,
  };
}
