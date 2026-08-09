import type {
  CanOccupy3DContext,
  PluginRegistryLike,
  ClassifyOverworldTileContext,
  CreateMapContext,
  CreateWorldActionContext,
  DecorateBuildingTileContext,
  DecorateDepthTileContext,
  DecorateOverworldTileContext,
  DecorateTownTileContext,
  Kind,
  OverworldAnchors,
  Paint2DOverlayContext,
  PluginPackLike,
  ResolveOverworldAnchorsContext,
  ResolveOverworldTileContext,
  ResolveWorldEnvironmentContext,
  RuntimePlugin,
  ResolveFloorKind3DContext,
  SurfaceProfile3D,
  SurfaceProfile3DContext,
  TileDefinitionLike,
  TileLike,
  TilePlugin,
  TraversalProfile3D,
  TraversalProfile3DContext,
  WorldEnvironmentLike,
  WorldActionLike,
  WorldMapLike,
  IndexedPlugin,
  PluginPackDefinitionLike,
} from './types';
export type { RenderBudgetPartMetadata } from './render-budget-parts';
export {
  getRenderBudgetPartMetadata,
  hasRenderBudgetPartMetadata,
  markOptionalDecorativeRenderBudgetPart,
  markStructuralRenderBudgetPart,
  RENDER_BUDGET_PART_PRIORITIES,
  RENDER_BUDGET_PART_USER_DATA_KEY,
  setRenderBudgetPartMetadata,
} from './render-budget-parts';
export type { RenderParticleEmitterMetadata } from './render-particle-emitters';
export {
  getRenderParticleEmitterMetadata,
  hasRenderParticleEmitterMetadata,
  markRenderParticleEmitter,
  RENDER_PARTICLE_EMITTER_USER_DATA_KEY,
} from './render-particle-emitters';
import {
  attemptCall,
  dedupePluginPackIds,
  isCallable,
  listPluginPackManifests,
  selectPluginPackManifests,
  resolvePluginPackDefinition,
} from './utils';

export type * from './types';
export {
  attemptCall,
  createFallbackTileDefinition,
  createPluginPack,
  createRuntimePlugin,
  createSingleTilePlugin,
  createTilePlugin,
  dedupePluginPackIds,
  definePluginPack,
  instantiateOrderedPlugins,
  isCallable,
  listPluginPackManifests,
  listTileDefinitionsFromPlugins,
  resolveTileDefinitionFromPlugins,
  selectPluginPackManifests,
  resolvePluginPackDefinition,
  withDefaultTileKind,
  withOverworldTileClassifier,
  withPluginOrder,
} from './utils';

export class PluginRegistry implements PluginRegistryLike {
  plugins: RuntimePlugin[];
  tilePlugins: Map<string, TilePlugin>;
  tileDefinitions: Map<string, TileDefinitionLike>;
  defaultTileKind: Kind | null;

  constructor() {
    this.plugins = [];
    this.tilePlugins = new Map();
    this.tileDefinitions = new Map();
    this.defaultTileKind = null;
  }

  register(plugin: RuntimePlugin): void {
    this.plugins.push(plugin);
    for (const tile of plugin.tiles ?? []) {
      this.tilePlugins.set(tile.kind, tile);
      if (tile.definition) {
        this.tileDefinitions.set(tile.kind, tile.definition);
      }
      if (tile.isDefaultTile) {
        this.defaultTileKind = tile.kind;
      }
    }
  }

  registerPack(pack: PluginPackLike): void {
    for (const plugin of sortPluginsForRegistration(pack.mapPlugins ?? [])) {
      this.register(plugin);
    }
    for (const plugin of sortPluginsForRegistration(
      pack.runtimePlugins ?? []
    )) {
      this.register(plugin);
    }
    for (const plugin of sortPluginsForRegistration(pack.tilePlugins ?? [])) {
      this.register(plugin);
    }
  }

  getTilePlugin(kind: Kind): TilePlugin | null {
    return this.tilePlugins.get(kind) ?? null;
  }

  getTileDefinition(kind: Kind): TileDefinitionLike | null {
    return this.tileDefinitions.get(kind) ?? null;
  }

  getDefaultTileKind(fallback: Kind = 'unknown'): Kind {
    return this.defaultTileKind ?? fallback;
  }

  getDefaultTileDefinition(
    fallback?: TileDefinitionLike | null
  ): TileDefinitionLike | null {
    if (!this.defaultTileKind) {
      return fallback ?? null;
    }
    return this.getTileDefinition(this.defaultTileKind) ?? fallback ?? null;
  }

  resolveTileDefinition(
    kind: Kind,
    fallback?: TileDefinitionLike | null
  ): TileDefinitionLike | null {
    return this.getTileDefinition(kind) ?? fallback ?? null;
  }

  listTileDefinitions(): [Kind, TileDefinitionLike][] {
    return [...this.tileDefinitions.entries()];
  }

  listResolvedTileDefinitions(
    fallbackEntries: Array<[Kind, TileDefinitionLike]> = []
  ): [Kind, TileDefinitionLike][] {
    const entries = new Map(fallbackEntries);
    for (const [kind, definition] of this.tileDefinitions.entries()) {
      entries.set(kind, definition);
    }
    return [...entries.entries()];
  }

  classifyTerrainTile(payload: ClassifyOverworldTileContext): TileLike | null {
    for (const plugin of this.plugins) {
      for (const tile of plugin.tiles ?? []) {
        if (!isCallable(tile.classifyTerrainTile)) continue;
        const result = tile.classifyTerrainTile(payload);
        if (result) {
          return result;
        }
      }
    }
    return null;
  }

  classifyOverworldTile(
    payload: ClassifyOverworldTileContext
  ): TileLike | undefined {
    for (const plugin of this.plugins) {
      for (const tile of plugin.tiles ?? []) {
        if (!isCallable(tile.classifyOverworldTile)) continue;
        const result = tile.classifyOverworldTile(payload);
        if (result) {
          return result;
        }
      }
    }
  }

  canOccupy3D(payload: CanOccupy3DContext): boolean | void {
    const tilePlugin = this.getTilePlugin(payload.tile.kind);
    return attemptCall(tilePlugin?.canOccupy3D, payload) ?? undefined;
  }

  getSurfaceProfile3D(
    payload: SurfaceProfile3DContext
  ): void | SurfaceProfile3D {
    const tilePlugin = this.getTilePlugin(payload.tile.kind);
    return attemptCall(tilePlugin?.getSurfaceProfile3D, payload) ?? undefined;
  }

  getTraversalProfile3D(
    payload: TraversalProfile3DContext
  ): void | TraversalProfile3D {
    const tilePlugin = this.getTilePlugin(payload.tile.kind);
    return attemptCall(tilePlugin?.getTraversalProfile3D, payload) ?? undefined;
  }

  paint2DOverlay(payload: Paint2DOverlayContext): boolean | void {
    const tilePlugin = this.getTilePlugin(payload.tile.kind);
    return attemptCall(tilePlugin?.paint2DOverlay, payload);
  }

  resolveFloorKind3D(payload: ResolveFloorKind3DContext): void | Kind {
    const tilePlugin = this.getTilePlugin(payload.tile.kind);
    return attemptCall(tilePlugin?.resolveFloorKind3D, payload) ?? undefined;
  }

  resolveWorldEnvironment(
    payload: ResolveWorldEnvironmentContext
  ): WorldEnvironmentLike {
    const merged: WorldEnvironmentLike = {};

    for (const plugin of this.plugins) {
      const resolved = attemptCall(plugin.resolveWorldEnvironment, payload);
      if (!resolved) continue;
      if (resolved.cycle) {
        merged.cycle = {
          ...(merged.cycle ?? {}),
          ...resolved.cycle,
        };
      }
      if (resolved.sky) {
        merged.sky = {
          ...(merged.sky ?? {}),
          ...resolved.sky,
        };
      }
      if (resolved.lighting) {
        merged.lighting = {
          ...(merged.lighting ?? {}),
          ...resolved.lighting,
        };
      }
      if (resolved.stars) {
        merged.stars = {
          ...(merged.stars ?? {}),
          ...resolved.stars,
        };
      }
      if (resolved.weather) {
        merged.weather = {
          ...(merged.weather ?? {}),
          ...resolved.weather,
        };
      }
      if (resolved.celestial) {
        merged.celestial = {
          ...(merged.celestial ?? {}),
          ...resolved.celestial,
        };
      }
    }

    return merged;
  }

  createWorldAction(payload: CreateWorldActionContext): void | WorldActionLike {
    const tilePlugin = this.getTilePlugin(payload.tile.kind);
    return attemptCall(tilePlugin?.createWorldAction, payload) ?? undefined;
  }

  decorateOverworldTile(payload: DecorateOverworldTileContext): TileLike {
    for (const plugin of this.plugins) {
      plugin.decorateOverworldTile?.(payload);
    }
    return payload.tile;
  }

  decorateTownTile(payload: DecorateTownTileContext): TileLike {
    for (const plugin of this.plugins) {
      plugin.decorateTownTile?.(payload);
    }
    return payload.tile;
  }

  decorateBuildingTile(payload: DecorateBuildingTileContext): TileLike {
    for (const plugin of this.plugins) {
      plugin.decorateBuildingTile?.(payload);
    }
    return payload.tile;
  }

  decorateDepthTile(payload: DecorateDepthTileContext): TileLike {
    for (const plugin of this.plugins) {
      plugin.decorateDepthTile?.(payload);
    }
    return payload.tile;
  }

  createMap(payload: CreateMapContext): WorldMapLike | null {
    for (const plugin of this.plugins) {
      const map = attemptCall(plugin?.createMap, payload);
      if (map) return map;
    }
    return null;
  }

  resolveOverworldTile(payload: ResolveOverworldTileContext): TileLike | null {
    for (const plugin of this.plugins) {
      const tile = attemptCall(plugin?.resolveOverworldTile, payload);
      if (tile) return tile;
    }
    return null;
  }

  resolveOverworldAnchors(
    payload: ResolveOverworldAnchorsContext
  ): OverworldAnchors {
    const merged: OverworldAnchors = {
      townAnchors: [],
      bridgeAnchors: [],
      poiAnchors: [],
    };

    for (const plugin of this.plugins) {
      const resolved = attemptCall(plugin.resolveOverworldAnchors, payload);
      if (!resolved) continue;
      if (resolved.townAnchors) {
        merged.townAnchors.push(...resolved.townAnchors);
      }
      if (resolved.bridgeAnchors) {
        merged.bridgeAnchors.push(...resolved.bridgeAnchors);
      }
      if (resolved.poiAnchors) {
        merged.poiAnchors.push(...resolved.poiAnchors);
      }
    }

    return merged;
  }
}

let activePluginRegistry = new PluginRegistry();

export function getActivePluginRegistry(): PluginRegistry {
  return activePluginRegistry;
}

export function setActivePluginRegistry(registry: PluginRegistry): void {
  activePluginRegistry = registry;
}

export function createPluginRegistryFromPackDefinitions(
  packIds: string[],
  packDefinitions: PluginPackDefinitionLike[]
): PluginRegistry {
  const registry = new PluginRegistry();
  const uniquePackIds = dedupePluginPackIds(packIds);
  const packs = uniquePackIds.map((packId) =>
    resolvePluginPackDefinition(packId, packDefinitions).createPack()
  );

  for (const plugin of sortPluginsForRegistration(
    packs.flatMap((pack) => pack.mapPlugins ?? [])
  )) {
    registry.register(plugin);
  }
  for (const plugin of sortPluginsForRegistration(
    packs.flatMap((pack) => pack.runtimePlugins ?? [])
  )) {
    registry.register(plugin);
  }
  for (const plugin of sortPluginsForRegistration(
    packs.flatMap((pack) => pack.tilePlugins ?? [])
  )) {
    registry.register(plugin);
  }
  return registry;
}

export function createPluginPackCatalog(
  packDefinitions: PluginPackDefinitionLike[],
  defaultPackIds: string[] = []
) {
  const normalizedDefaultPackIds = dedupePluginPackIds(defaultPackIds);

  return {
    packDefinitions,
    defaultPackIds: normalizedDefaultPackIds,
    list() {
      return listPluginPackManifests(packDefinitions);
    },
    listSelected(packIds = normalizedDefaultPackIds) {
      return selectPluginPackManifests(packIds, packDefinitions);
    },
    resolve(packId: string) {
      return resolvePluginPackDefinition(packId, packDefinitions);
    },
    createRegistry(packIds: string[] = normalizedDefaultPackIds) {
      return createPluginRegistryFromPackDefinitions(packIds, packDefinitions);
    },
  };
}

function sortPluginsForRegistration(plugins: RuntimePlugin[]): RuntimePlugin[] {
  const indexed = plugins.map((plugin, index) => ({ plugin, index }));
  const names = new Set(indexed.map(({ plugin }) => plugin.name));
  const dependents = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  for (const { plugin } of indexed) {
    dependents.set(plugin.name, new Set());
    inDegree.set(plugin.name, 0);
  }

  function addEdge(from: string, to: string) {
    if (from === to || !names.has(from) || !names.has(to)) return;
    const outgoing = dependents.get(from)!;
    if (outgoing.has(to)) return;
    outgoing.add(to);
    inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
  }

  for (const { plugin } of indexed) {
    for (const dependency of plugin.order?.after ?? []) {
      addEdge(dependency, plugin.name);
    }
    for (const successor of plugin.order?.before ?? []) {
      addEdge(plugin.name, successor);
    }
  }

  const remaining = new Map(indexed.map((entry) => [entry.plugin.name, entry]));
  const ordered: RuntimePlugin[] = [];

  while (remaining.size > 0) {
    const available = [...remaining.values()]
      .filter(({ plugin }) => (inDegree.get(plugin.name) ?? 0) === 0)
      .sort(comparePluginOrder);

    if (available.length === 0) {
      return indexed.sort(comparePluginOrder).map(({ plugin }) => plugin);
    }

    const next = available[0];
    remaining.delete(next.plugin.name);
    ordered.push(next.plugin);

    for (const dependent of dependents.get(next.plugin.name) ?? []) {
      inDegree.set(dependent, Math.max(0, (inDegree.get(dependent) ?? 0) - 1));
    }
  }

  return ordered;
}
const pluginPriority = (indexed: IndexedPlugin): number =>
  indexed.plugin.order?.priority ?? 0;

function comparePluginOrder(left: IndexedPlugin, right: IndexedPlugin): number {
  const leftPriority = pluginPriority(left);
  const rightPriority = pluginPriority(right);
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }
  return left.index - right.index;
}
