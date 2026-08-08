import { createBalloonMapPlugin } from '@bworlds/map-balloon';
import { createBlimpMapPlugin } from '@bworlds/map-blimp';
import { createBoatMapPlugin } from '@bworlds/map-boat';
import { createBuildingMapPlugin } from '@bworlds/map-building';
import { createCanoeMapPlugin } from '@bworlds/map-canoe';
import { createDepthMapPlugin } from '@bworlds/map-depth';
import { createGliderMapPlugin } from '@bworlds/map-glider';
import { createLighthouseMapPlugin } from '@bworlds/map-lighthouse';
import { createObservatoryMapPlugin } from '@bworlds/map-observatory';
import { createOverworldCompositionPlugin } from '@bworlds/map-overworld';
import { createQuarryMapPlugin } from '@bworlds/map-quarry';
import { createShipMapPlugin } from '@bworlds/map-ship';
import { createStationMapPlugin } from '@bworlds/map-station';
import { createTowerMapPlugin } from '@bworlds/map-tower';
import { createTrainMapPlugin } from '@bworlds/map-train';
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
import { createDockTrafficRuntimePlugin } from '@bworlds/runtime-dock-traffic';
import { createOverworldAnchorsRuntimePlugin } from '@bworlds/runtime-overworld-anchors';
import { createOverworldReliefRuntimePlugin } from '@bworlds/runtime-overworld-relief';
import { createPlayerPoiRuntimePlugin } from '@bworlds/runtime-player-poi';
import { createRailNetworkRuntimePlugin } from '@bworlds/runtime-rail-network';
import { createStartRegionRuntimePlugin } from '@bworlds/runtime-start-region';
import { createWayfindingRuntimePlugin } from '@bworlds/runtime-wayfinding';
import { createWeatherRuntimePlugin } from '@bworlds/runtime-weather';
import { createRailTilePlugin } from '@bworlds/tile-rail';
import { createCaveTilePlugin } from '@bworlds/tile-cave';
import { createDungeonTilePlugin } from '@bworlds/tile-dungeon';
import { createForestTilePlugin } from '@bworlds/tile-forest';
import { createInteriorTilePlugin } from '@bworlds/tile-interior';
import { createLighthouseTilePlugin } from '@bworlds/tile-lighthouse';
import { createMountainTilePlugin } from '@bworlds/tile-mountain';
import { createObservatoryTilePlugin } from '@bworlds/tile-observatory';
import { createPlainsTilePlugin } from '@bworlds/tile-plains';
import { createQuarryTilePlugin } from '@bworlds/tile-quarry';
import { createRouteTilePlugin } from '@bworlds/tile-route';
import { createShipTilePlugin } from '@bworlds/tile-ship';
import { createSignTilePlugin } from '@bworlds/tile-sign';
import { createStationTilePlugin } from '@bworlds/tile-station';
import { createTowerTilePlugin } from '@bworlds/tile-tower';
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
      create: createBalloonMapPlugin,
      order: { priority: 32.25 },
    },
    {
      create: createBlimpMapPlugin,
      order: { priority: 32.35 },
    },
    {
      create: createGliderMapPlugin,
      order: { priority: 32.5 },
    },
    {
      create: createBoatMapPlugin,
      order: { priority: 33 },
    },
    {
      create: createCanoeMapPlugin,
      order: { priority: 34 },
    },
    {
      create: createTowerMapPlugin,
      order: { priority: 35.5 },
    },
    {
      create: createQuarryMapPlugin,
      order: { priority: 36 },
    },
    {
      create: createLighthouseMapPlugin,
      order: { priority: 37 },
    },
    {
      create: createShipMapPlugin,
      order: { priority: 38 },
    },
    {
      create: createObservatoryMapPlugin,
      order: { priority: 39 },
    },
    {
      create: createStationMapPlugin,
      order: { priority: 40 },
    },
    {
      create: createTrainMapPlugin,
      order: { priority: 40.5 },
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
      create: createPlayerPoiRuntimePlugin,
      order: { priority: 4 },
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
        after: ['runtime-start-region', 'runtime-player-poi'],
      },
    },
    {
      create: createRailNetworkRuntimePlugin,
      order: {
        priority: 16,
        after: ['runtime-overworld-anchors'],
      },
    },
    {
      create: createDockTrafficRuntimePlugin,
      order: {
        priority: 17,
        after: ['runtime-overworld-anchors'],
      },
    },
    {
      create: createOverworldReliefRuntimePlugin,
      order: {
        priority: 18,
        after: [
          'runtime-overworld-anchors',
          'runtime-rail-network',
          'runtime-dock-traffic',
        ],
      },
    },
    {
      create: createDepthFlavorRuntimePlugin,
      order: {
        priority: 20,
        after: [
          'runtime-wayfinding',
          'runtime-overworld-anchors',
          'runtime-overworld-relief',
        ],
      },
    },
    {
      create: createWeatherRuntimePlugin,
      order: {
        priority: 25,
        after: ['runtime-celestial', 'runtime-depth-flavor'],
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
      create: createTowerTilePlugin,
      order: { priority: 46 },
    },
    {
      create: createLighthouseTilePlugin,
      order: { priority: 48 },
    },
    {
      create: createShipTilePlugin,
      order: { priority: 49 },
    },
    {
      create: createObservatoryTilePlugin,
      order: { priority: 50 },
    },
    {
      create: createStationTilePlugin,
      order: { priority: 51 },
    },
    {
      create: createRailTilePlugin,
      order: { priority: 51 },
    },
    {
      create: createDungeonTilePlugin,
      order: { priority: 52 },
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
