import { createBuildingMapPlugin } from '@bworlds/map-building';
import { createDepthMapPlugin } from '@bworlds/map-depth';
import { createLighthouseMapPlugin } from '@bworlds/map-lighthouse';
import { createOverworldCompositionPlugin } from '@bworlds/map-overworld';
import { createQuarryMapPlugin } from '@bworlds/map-quarry';
import { createTownMapPlugin } from '@bworlds/map-town';
import type {
  Kind,
  PluginPackDefinitionLike,
  PluginPackLike,
  PluginPackManifestLike,
  RuntimePlugin,
  TileDefinitionLike,
} from '@bworlds/plugin-api';
import {
  createFallbackTileDefinition,
  createPluginPack,
  definePluginPack,
  instantiateOrderedPlugins,
  listTileDefinitionsFromPlugins,
  resolveTileDefinitionFromPlugins,
  withDefaultTileKind,
} from '@bworlds/plugin-api';
import { createCelestialRuntimePlugin } from '@bworlds/runtime-celestial';
import { createCelestialPhenomenaRuntimePlugin } from '@bworlds/runtime-celestial-phenomena';
import { createCelestialSystemRuntimePlugin } from '@bworlds/runtime-celestial-system';
import { createDepthFlavorRuntimePlugin } from '@bworlds/runtime-depth-flavor';
import { createOverworldAnchorsRuntimePlugin } from '@bworlds/runtime-overworld-anchors';
import { createStartRegionRuntimePlugin } from '@bworlds/runtime-start-region';
import { createWayfindingRuntimePlugin } from '@bworlds/runtime-wayfinding';
import { createCaveTilePlugin } from '@bworlds/tile-cave';
import { createDungeonTilePlugin } from '@bworlds/tile-dungeon';
import { createForestTilePlugin } from '@bworlds/tile-forest';
import { createInteriorTilePlugin } from '@bworlds/tile-interior';
import { createLighthouseTilePlugin } from '@bworlds/tile-lighthouse';
import { createMountainTilePlugin } from '@bworlds/tile-mountain';
import { createPlainsTilePlugin } from '@bworlds/tile-plains';
import { createQuarryTilePlugin } from '@bworlds/tile-quarry';
import { createRouteTilePlugin } from '@bworlds/tile-route';
import { createSignTilePlugin } from '@bworlds/tile-sign';
import { createTownTilePlugin } from '@bworlds/tile-town';
import { createWaterTilePlugin } from '@bworlds/tile-water';

function createDefaultBaseTilePlugin(): RuntimePlugin {
  return withDefaultTileKind(createPlainsTilePlugin(), 'plains');
}

export function createDefaultMapPlugins(): RuntimePlugin[] {
  return instantiateOrderedPlugins([
    {
      create: createTownMapPlugin,
      order: { priority: 10 },
    },
    {
      create: createBuildingMapPlugin,
      order: { priority: 20 },
    },
    {
      create: createDepthMapPlugin,
      order: { priority: 30 },
    },
    {
      create: createQuarryMapPlugin,
      order: { priority: 35 },
    },
    {
      create: createLighthouseMapPlugin,
      order: { priority: 36 },
    },
    {
      create: createOverworldCompositionPlugin,
      order: { priority: 40 },
    },
  ]);
}

export function createDefaultRuntimePlugins(): RuntimePlugin[] {
  return instantiateOrderedPlugins([
    {
      create: createCelestialRuntimePlugin,
      order: { priority: 1 },
    },
    {
      create: createCelestialPhenomenaRuntimePlugin,
      order: { priority: 2, after: ['runtime-celestial'] },
    },
    {
      create: createCelestialSystemRuntimePlugin,
      order: { priority: 3, after: ['runtime-celestial-phenomena'] },
    },
    {
      create: createStartRegionRuntimePlugin,
      order: { priority: 5 },
    },
    {
      create: createWayfindingRuntimePlugin,
      order: { priority: 10 },
    },
    {
      create: createOverworldAnchorsRuntimePlugin,
      order: {
        priority: 15,
        after: ['runtime-start-region'],
      },
    },
    {
      create: createDepthFlavorRuntimePlugin,
      order: {
        priority: 20,
        after: ['runtime-wayfinding', 'runtime-overworld-anchors'],
      },
    },
  ]);
}

export function createDefaultTilePlugins(): RuntimePlugin[] {
  return instantiateOrderedPlugins([
    {
      create: createInteriorTilePlugin,
      order: { priority: 5 },
    },
    {
      create: createDefaultBaseTilePlugin,
      order: { priority: 8 },
    },
    {
      create: createWaterTilePlugin,
      order: { priority: 10 },
    },
    {
      create: createMountainTilePlugin,
      order: { priority: 20 },
    },
    {
      create: createForestTilePlugin,
      order: { priority: 30 },
    },
    {
      create: createCaveTilePlugin,
      order: { priority: 40 },
    },
    {
      create: createQuarryTilePlugin,
      order: { priority: 45 },
    },
    {
      create: createLighthouseTilePlugin,
      order: { priority: 48 },
    },
    {
      create: createDungeonTilePlugin,
      order: { priority: 50 },
    },
    {
      create: createSignTilePlugin,
      order: { priority: 60 },
    },
    {
      create: createTownTilePlugin,
      order: { priority: 70 },
    },
    {
      create: createRouteTilePlugin,
      order: {
        priority: 80,
        after: ['tile-sign', 'tile-town', 'tile-cave', 'tile-dungeon'],
      },
    },
  ]);
}

export function listDefaultTileDefinitions(): Array<[Kind, TileDefinitionLike]> {
  return listTileDefinitionsFromPlugins(createDefaultTilePlugins());
}

export function getDefaultTileDefinition(kind: Kind): TileDefinitionLike {
  return resolveTileDefinitionFromPlugins(
    createDefaultTilePlugins(),
    kind,
    createFallbackTileDefinition(kind)
  );
}

export function createDefaultContentPack(): PluginPackLike {
  return createPluginPack('default-content-pack', {
    mapPlugins: createDefaultMapPlugins(),
    runtimePlugins: createDefaultRuntimePlugins(),
    tilePlugins: createDefaultTilePlugins(),
  });
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
