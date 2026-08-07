import { createBuildingMapPlugin } from '@bworlds/map-building';
import { createDepthMapPlugin } from '@bworlds/map-depth';
import { createOverworldCompositionPlugin } from '@bworlds/map-overworld';
import { createTownMapPlugin } from '@bworlds/map-town';
import type {
  PluginPackDefinitionLike,
  PluginPackLike,
  PluginPackManifestLike,
  RuntimePlugin,
  TileDefinitionLike,
} from '@bworlds/plugin-api';
import { definePluginPack, withPluginOrder } from '@bworlds/plugin-api';
import { createDepthFlavorRuntimePlugin } from '@bworlds/runtime-depth-flavor';
import { createOverworldAnchorsRuntimePlugin } from '@bworlds/runtime-overworld-anchors';
import { createStartRegionRuntimePlugin } from '@bworlds/runtime-start-region';
import { createWayfindingRuntimePlugin } from '@bworlds/runtime-wayfinding';
import { createCaveTilePlugin } from '@bworlds/tile-cave';
import { createDungeonTilePlugin } from '@bworlds/tile-dungeon';
import { createForestTilePlugin } from '@bworlds/tile-forest';
import { createInteriorTilePlugin } from '@bworlds/tile-interior';
import { createMountainTilePlugin } from '@bworlds/tile-mountain';
import { createPlainsTilePlugin } from '@bworlds/tile-plains';
import { createRouteTilePlugin } from '@bworlds/tile-route';
import { createSignTilePlugin } from '@bworlds/tile-sign';
import { createTownTilePlugin } from '@bworlds/tile-town';
import { createWaterTilePlugin } from '@bworlds/tile-water';

export function createDefaultMapPlugins() {
  return [
    withPluginOrder(createTownMapPlugin(), { priority: 10 }),
    withPluginOrder(createBuildingMapPlugin(), { priority: 20 }),
    withPluginOrder(createDepthMapPlugin(), { priority: 30 }),
    withPluginOrder(createOverworldCompositionPlugin(), { priority: 40 }),
  ];
}

export function createDefaultRuntimePlugins() {
  return [
    withPluginOrder(createStartRegionRuntimePlugin(), { priority: 5 }),
    withPluginOrder(createWayfindingRuntimePlugin(), { priority: 10 }),
    withPluginOrder(createOverworldAnchorsRuntimePlugin(), {
      priority: 15,
      after: ['runtime-start-region'],
    }),
    withPluginOrder(createDepthFlavorRuntimePlugin(), {
      priority: 20,
      after: ['runtime-wayfinding', 'runtime-overworld-anchors'],
    }),
  ];
}

export function createDefaultTilePlugins() {
  return [
    withPluginOrder(createInteriorTilePlugin(), { priority: 5 }),
    withPluginOrder(createPlainsTilePlugin(), { priority: 8 }),
    withPluginOrder(createWaterTilePlugin(), { priority: 10 }),
    withPluginOrder(createMountainTilePlugin(), { priority: 20 }),
    withPluginOrder(createForestTilePlugin(), { priority: 30 }),
    withPluginOrder(createCaveTilePlugin(), { priority: 40 }),
    withPluginOrder(createDungeonTilePlugin(), { priority: 50 }),
    withPluginOrder(createSignTilePlugin(), { priority: 60 }),
    withPluginOrder(createTownTilePlugin(), { priority: 70 }),
    withPluginOrder(createRouteTilePlugin(), {
      priority: 80,
      after: ['tile-sign', 'tile-town', 'tile-cave', 'tile-dungeon'],
    }),
  ];
}

export function listDefaultTileDefinitions(): Array<[string, TileDefinitionLike]> {
  return createDefaultTilePlugins()
    .flatMap((plugin) => plugin.tiles ?? [])
    .flatMap((tile) => (tile.definition ? [[tile.kind, tile.definition] as const] : []));
}

export function getDefaultTileDefinition(kind: string): TileDefinitionLike {
  const entries = listDefaultTileDefinitions();
  const definitions = new Map(entries);
  return (
    definitions.get(kind) ??
    definitions.get('plains') ?? {
      name: 'Unknown Tile',
      color: '#64748b',
      miniColor: '#94a3b8',
      walkable: true,
      wallHeight: 0,
    }
  );
}

export function createDefaultContentPack(): PluginPackLike {
  return {
    name: 'default-content-pack',
    mapPlugins: createDefaultMapPlugins(),
    runtimePlugins: createDefaultRuntimePlugins(),
    tilePlugins: createDefaultTilePlugins(),
  };
}

export const defaultContentPackManifest: PluginPackManifestLike = {
  id: 'default-content-pack',
  name: 'Default Content Pack',
  description:
    'The built-in overworld, interior, runtime flavor, and tile plugin stack.',
  tags: ['builtin', 'default', 'overworld', 'towns', 'dungeons'],
};

export function createDefaultContentPackDefinition(): PluginPackDefinitionLike {
  return definePluginPack(defaultContentPackManifest, createDefaultContentPack);
}
