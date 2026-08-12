import { createBoundedCache } from '@bworlds/cache-support';
import { createPlayer, createWorldState } from '@bworlds/core';
import { registerHashSeed, resolveHashSeedInput } from '@bworlds/core/hash';
import {
  createFrontierContentPackDefinition,
  frontierContentPackManifest,
} from '@bworlds/content-pack-frontier';
import { createRuinsContentPackDefinition } from '@bworlds/content-pack-ruins';
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
  type RuntimePlugin,
  type Seed,
  type TileLike,
  type ViewMode,
  type WorldContextLike,
  type WorldMapLike,
  type WorldStateLike,
} from '@bworlds/plugin-api';
import {
  createOverworldTerrainSignalSampler,
  getOverworldPlacementChance,
  isNearOverworldLand,
} from '@bworlds/overworld-support';
export {
  getTerrainChunkCellBounds,
  getTerrainChunkCoordinates,
  getTerrainChunkHeightSampleBounds,
  TERRAIN_CHUNK_CELL_SIZE,
  TERRAIN_CHUNK_HEIGHT_SAMPLE_SIZE,
  type TerrainChunkCellBounds,
  type TerrainChunkCoordinates,
  type TerrainChunkHeightSampleBounds,
  type TerrainChunkId,
} from './terrain-chunks.ts';

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
const MAP_CACHE_LIMIT = 256;
const PREVIEW_TILE_CACHE_LIMIT = 8192;
const EMPTY_PREVIEW_ANCHORS: Array<never> = [];

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
  samplePreviewSurfaceKind(x: number, y: number): SpawnTile['kind'];
  samplePreviewOverworld(x: number, y: number): SpawnTile;
} {
  const seedHash = resolveHashSeedInput(seed);
  const mapCache = createBoundedCache<string, WorldMapLike>(MAP_CACHE_LIMIT);
  const terrainSignals = createOverworldTerrainSignalSampler(seedHash);
  const previewTileCache = createBoundedCache<string, SpawnTile>(
    PREVIEW_TILE_CACHE_LIMIT
  );
  const previewKindCache = createBoundedCache<string, SpawnTile['kind']>(
    PREVIEW_TILE_CACHE_LIMIT
  );
  const getPreviewKey = (x: number, y: number) => makeKey('preview', x, y);
  const defaultPreviewTileKind =
    plugins.getDefaultTileKind?.('plains') ?? 'plains';
  const resolvePreviewPlacementChance = (
    chanceKey: string,
    x: number,
    y: number
  ) => getOverworldPlacementChance(seedHash, chanceKey, x, y);
  const samplePreviewSurfaceKind = (
    x: number,
    y: number
  ): SpawnTile['kind'] => {
    const key = getPreviewKey(x, y);
    return previewKindCache.getOrCreate(key, () => {
      const signals = terrainSignals(x, y);
      const townChance = resolvePreviewPlacementChance('town', x, y);
      const caveChance = resolvePreviewPlacementChance('cave', x, y);
      const dungeonChance = resolvePreviewPlacementChance('dungeon', x, y);
      const signChance = resolvePreviewPlacementChance('sign', x, y);
      const previewTile = plugins.classifyTerrainTile({
        seed: seedHash,
        x,
        y,
        tile: { kind: defaultPreviewTileKind },
        nearLand: isNearOverworldLand(signals),
        townChance,
        caveChance,
        dungeonChance,
        signChance,
        getPlacementChance(chanceKey: string) {
          switch (chanceKey) {
            case 'town':
              return townChance;
            case 'cave':
              return caveChance;
            case 'dungeon':
              return dungeonChance;
            case 'sign':
              return signChance;
            default:
              return resolvePreviewPlacementChance(chanceKey, x, y);
          }
        },
        signals,
        sampleTerrainSignals: terrainSignals,
        townAnchors: EMPTY_PREVIEW_ANCHORS,
        bridgeAnchors: EMPTY_PREVIEW_ANCHORS,
        poiAnchors: EMPTY_PREVIEW_ANCHORS,
      }) ?? { kind: defaultPreviewTileKind };

      return previewTile.kind;
    });
  };
  const getMap = (context: Context) => {
    const key = makeKey(context.id, context.depth);
    return mapCache.getOrCreate(key, () => {
      const map = plugins.createMap({
        context,
        seed: seedHash,
        plugins,
      });
      if (!map) {
        throw new Error(
          `No map plugin registered for context type "${context.type}"`
        );
      }
      return map;
    });
  };

  return {
    getMap,
    sampleOverworld(x: number, y: number) {
      return getMap(OVERWORLD_CONTEXT).getTile(x, y) as SpawnTile;
    },
    samplePreviewSurfaceKind,
    samplePreviewOverworld(x: number, y: number) {
      const key = getPreviewKey(x, y);
      return previewTileCache.getOrCreate(key, () => {
        return { kind: samplePreviewSurfaceKind(x, y) } as SpawnTile;
      });
    },
  };
}

export function createDefaultRuntimePlugins(): RuntimePlugin[] {
  return createDefaultRuntimePluginsFromPack();
}

export function createDefaultTilePlugins(): RuntimePlugin[] {
  return createDefaultTilePluginsFromPack();
}

export function createDefaultPluginRegistry(): PluginRegistry {
  return createBuiltinContentPackCatalog().createRegistry([
    'default-content-pack',
  ]);
}

export function createBuiltinContentPackDefinitions(): PluginPackDefinitionLike[] {
  return [
    createDefaultContentPackDefinition(),
    createFrontierContentPackDefinition(),
    createRuinsContentPackDefinition(),
  ];
}

export function createBuiltinContentPackCatalog(): ReturnType<
  typeof createPluginPackCatalog
> {
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
): PluginRegistry {
  return createPluginPackCatalog(packDefinitions, packIds).createRegistry();
}

export function createPluginRegistryFromPack(
  packId = 'default-content-pack',
  packDefinitions: PluginPackDefinitionLike[] = createBuiltinContentPackDefinitions()
): PluginRegistry {
  return createPluginRegistryFromPacks([packId], packDefinitions);
}

export function createWorldRuntime({
  seed = registerHashSeed('bworlds-alpha'),
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
  viewMode?: ViewMode;
  activateRegistry?: boolean;
} = {}): {
  contentPacks: PluginPackManifestLike[];
  generator: ReturnType<typeof createWorldGenerator>;
  registry: PluginRegistry;
  state: WorldStateLike & {
    stack: WorldContextLike[];
    viewMode: ViewMode;
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
    viewMode: ViewMode;
  };

  if (viewMode === '2d' || viewMode === '3d' || viewMode === 'text') {
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
