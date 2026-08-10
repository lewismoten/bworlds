import {
  createOverworldAnchorResolver,
  createGeneratedNamedOverworldCellAnchorSpec,
  createGeneratedPoiOverworldCellAnchorSpec,
  resolveOverworldCellAnchor,
  type OverworldCellAnchorSpec,
  type OverworldTerrainSignalSampler,
} from '@bworlds/overworld-support';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type {
  OverworldAnchorLike,
  PoiAnchorLike,
  RuntimePlugin,
} from '@bworlds/plugin-api';

type NamedPoint = OverworldAnchorLike & { name: string };
type NamedPoiAnchor = PoiAnchorLike & { name: string };
type PoiType =
  | 'cave'
  | 'dungeon'
  | 'tower'
  | 'quarry'
  | 'lighthouse'
  | 'ship'
  | 'observatory'
  | 'station';

const TOWN_CELL_SIZE = 20;
const BRIDGE_CELL_SIZE = 16;
const MIN_POI_SPACING = 9;
const MOUNTAIN_ELEVATION_THRESHOLD = 0.72;
const FOREST_CONTINENT_MIN = 0.42;
const FOREST_CONTINENT_MAX = 0.9;
const FOREST_ELEVATION_MAX = 0.74;
const FOREST_RIVER_MAX = 0.86;
const FOREST_MOISTURE_MIN = 0.6;
const FOREST_CLUSTER_RADIUS = 2;
const OCEAN_CONTINENT_THRESHOLD = 0.38;
const LAND_CONTINENT_THRESHOLD = 0.42;
const SHIP_CONTINENT_MAX = 0.74;
const TOWER_ELEVATION_MIN = 0.44;
const TOWER_ELEVATION_MAX = 0.78;
const TOWER_MOISTURE_MAX = 0.62;
const OBSERVATORY_ELEVATION_MIN = 0.78;
const STATION_ELEVATION_MAX = 0.54;
const STATION_ROAD_SIGNAL_MIN = 0.42;

function hasMountainSummitCluster(
  x: number,
  y: number,
  sampleTerrainSignals: OverworldTerrainSignalSampler
): boolean {
  let elevatedCount = 0;
  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      if (
        sampleTerrainSignals(x + offsetX, y + offsetY).elevation >=
        MOUNTAIN_ELEVATION_THRESHOLD
      ) {
        elevatedCount += 1;
      }
    }
  }
  return elevatedCount >= 4;
}

function hasNearbyMountainTerrain(
  x: number,
  y: number,
  sampleTerrainSignals: OverworldTerrainSignalSampler,
  radius = 1
): boolean {
  for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
    for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
      if (offsetX === 0 && offsetY === 0) {
        continue;
      }
      if (
        sampleTerrainSignals(x + offsetX, y + offsetY).elevation >
        MOUNTAIN_ELEVATION_THRESHOLD
      ) {
        return true;
      }
    }
  }
  return false;
}

function isForestLikeTerrain(terrain: {
  continent: number;
  elevation: number;
  moisture: number;
  riverSignal: number;
}): boolean {
  return (
    terrain.continent > FOREST_CONTINENT_MIN &&
    terrain.continent < FOREST_CONTINENT_MAX &&
    terrain.elevation < FOREST_ELEVATION_MAX &&
    terrain.riverSignal < FOREST_RIVER_MAX &&
    terrain.moisture >= FOREST_MOISTURE_MIN
  );
}

function hasDenseForestCluster(
  x: number,
  y: number,
  sampleTerrainSignals: OverworldTerrainSignalSampler
): boolean {
  let forestLikeCount = 0;
  let totalSamples = 0;

  for (
    let sampleY = y - FOREST_CLUSTER_RADIUS;
    sampleY <= y + FOREST_CLUSTER_RADIUS;
    sampleY += 1
  ) {
    for (
      let sampleX = x - FOREST_CLUSTER_RADIUS;
      sampleX <= x + FOREST_CLUSTER_RADIUS;
      sampleX += 1
    ) {
      totalSamples += 1;
      if (isForestLikeTerrain(sampleTerrainSignals(sampleX, sampleY))) {
        forestLikeCount += 1;
      }
    }
  }

  return forestLikeCount >= Math.ceil(totalSamples * 0.68);
}

function hasNearbyOceanTerrain(
  x: number,
  y: number,
  sampleTerrainSignals: OverworldTerrainSignalSampler,
  maxDistance = 2
): boolean {
  for (let offsetY = -maxDistance; offsetY <= maxDistance; offsetY += 1) {
    for (let offsetX = -maxDistance; offsetX <= maxDistance; offsetX += 1) {
      const distance = Math.abs(offsetX) + Math.abs(offsetY);
      if (distance === 0 || distance > maxDistance) {
        continue;
      }
      if (
        sampleTerrainSignals(x + offsetX, y + offsetY).continent <=
        OCEAN_CONTINENT_THRESHOLD
      ) {
        return true;
      }
    }
  }

  return false;
}

function hasAdjacentLandNeighbor(
  x: number,
  y: number,
  sampleTerrainSignals: OverworldTerrainSignalSampler
): boolean {
  return (
    sampleTerrainSignals(x + 1, y).continent >= LAND_CONTINENT_THRESHOLD ||
    sampleTerrainSignals(x - 1, y).continent >= LAND_CONTINENT_THRESHOLD ||
    sampleTerrainSignals(x, y + 1).continent >= LAND_CONTINENT_THRESHOLD ||
    sampleTerrainSignals(x, y - 1).continent >= LAND_CONTINENT_THRESHOLD
  );
}

const TOWN_ANCHOR_SPEC: OverworldCellAnchorSpec<NamedPoint> =
  createGeneratedNamedOverworldCellAnchorSpec({
    id: 'town',
    nameType: 'town',
    cellSize: TOWN_CELL_SIZE,
    chanceKey: 'town-anchor',
    offsetXKey: 'town-anchor-x',
    offsetYKey: 'town-anchor-y',
    threshold: 0.64,
    priority: 0,
    isSuitableTerrain({ terrain }) {
      return (
        terrain.continent > 0.47 &&
        terrain.continent < 0.9 &&
        terrain.elevation < 0.7 &&
        terrain.riverSignal < 0.82
      );
    },
  });

const BRIDGE_ANCHOR_SPEC: OverworldCellAnchorSpec<OverworldAnchorLike> = {
  id: 'bridge',
  cellSize: BRIDGE_CELL_SIZE,
  chanceKey: 'bridge-anchor',
  offsetXKey: 'bridge-anchor-x',
  offsetYKey: 'bridge-anchor-y',
  threshold: 0.68,
  priority: 0,
  isSuitableTerrain({ terrain }) {
    return (
      terrain.continent > 0.46 &&
      terrain.continent < 0.88 &&
      terrain.elevation < 0.68 &&
      terrain.riverSignal > 0.76
    );
  },
  createAnchor({ x, y }) {
    return { x, y };
  },
};

const POI_SPECS: Record<PoiType, OverworldCellAnchorSpec<NamedPoiAnchor>> = {
  cave: createGeneratedPoiOverworldCellAnchorSpec({
    id: 'cave',
    poiType: 'cave',
    cellSize: 18,
    chanceKey: 'cave-anchor',
    offsetXKey: 'cave-anchor-x',
    offsetYKey: 'cave-anchor-y',
    threshold: 0.74,
    priority: 10,
    isSuitableTerrain({ terrain, x, y, sampleTerrainSignals }) {
      return (
        terrain.continent > 0.47 &&
        terrain.continent < 0.9 &&
        terrain.elevation < 0.78 &&
        terrain.riverSignal < 0.8 &&
        hasNearbyMountainTerrain(x, y, sampleTerrainSignals)
      );
    },
  }),
  dungeon: createGeneratedPoiOverworldCellAnchorSpec({
    id: 'dungeon',
    poiType: 'dungeon',
    cellSize: 22,
    chanceKey: 'dungeon-anchor',
    offsetXKey: 'dungeon-anchor-x',
    offsetYKey: 'dungeon-anchor-y',
    threshold: 0.78,
    priority: 20,
    isSuitableTerrain({ terrain, x, y, sampleTerrainSignals }) {
      return (
        terrain.continent > 0.5 &&
        terrain.continent < 0.88 &&
        terrain.elevation > 0.34 &&
        terrain.elevation < 0.82 &&
        terrain.riverSignal < 0.78 &&
        hasDenseForestCluster(x, y, sampleTerrainSignals)
      );
    },
  }),
  tower: createGeneratedPoiOverworldCellAnchorSpec({
    id: 'tower',
    poiType: 'tower',
    cellSize: 20,
    chanceKey: 'tower-anchor',
    offsetXKey: 'tower-anchor-x',
    offsetYKey: 'tower-anchor-y',
    threshold: 0.76,
    priority: 24,
    isSuitableTerrain({ terrain, x, y, sampleTerrainSignals }) {
      return (
        terrain.continent > 0.5 &&
        terrain.continent < 0.88 &&
        terrain.elevation >= TOWER_ELEVATION_MIN &&
        terrain.elevation <= TOWER_ELEVATION_MAX &&
        terrain.moisture <= TOWER_MOISTURE_MAX &&
        terrain.riverSignal < 0.76 &&
        !hasNearbyOceanTerrain(x, y, sampleTerrainSignals, 2) &&
        hasNearbyMountainTerrain(x, y, sampleTerrainSignals, 2)
      );
    },
  }),
  quarry: createGeneratedPoiOverworldCellAnchorSpec({
    id: 'quarry',
    poiType: 'quarry',
    cellSize: 18,
    chanceKey: 'quarry-anchor',
    offsetXKey: 'quarry-anchor-x',
    offsetYKey: 'quarry-anchor-y',
    threshold: 0.72,
    priority: 15,
    isSuitableTerrain({ terrain, x, y, sampleTerrainSignals }) {
      return (
        terrain.continent > 0.5 &&
        terrain.continent < 0.9 &&
        terrain.elevation > 0.42 &&
        terrain.elevation < 0.7 &&
        terrain.moisture < 0.66 &&
        terrain.riverSignal < 0.78 &&
        hasNearbyMountainTerrain(x, y, sampleTerrainSignals, 2)
      );
    },
  }),
  lighthouse: createGeneratedPoiOverworldCellAnchorSpec({
    id: 'lighthouse',
    poiType: 'lighthouse',
    cellSize: 20,
    chanceKey: 'lighthouse-anchor',
    offsetXKey: 'lighthouse-anchor-x',
    offsetYKey: 'lighthouse-anchor-y',
    threshold: 0.7,
    priority: 25,
    isSuitableTerrain({ terrain, x, y, sampleTerrainSignals }) {
      return (
        terrain.continent >= LAND_CONTINENT_THRESHOLD &&
        terrain.continent < 0.68 &&
        terrain.elevation < 0.62 &&
        terrain.riverSignal < 0.82 &&
        hasNearbyOceanTerrain(x, y, sampleTerrainSignals, 2) &&
        hasAdjacentLandNeighbor(x, y, sampleTerrainSignals)
      );
    },
  }),
  ship: createGeneratedPoiOverworldCellAnchorSpec({
    id: 'ship',
    poiType: 'ship',
    cellSize: 20,
    chanceKey: 'ship-anchor',
    offsetXKey: 'ship-anchor-x',
    offsetYKey: 'ship-anchor-y',
    threshold: 0.72,
    priority: 23,
    isSuitableTerrain({ terrain, x, y, sampleTerrainSignals }) {
      return (
        terrain.continent >= LAND_CONTINENT_THRESHOLD &&
        terrain.continent < SHIP_CONTINENT_MAX &&
        terrain.elevation < 0.58 &&
        terrain.riverSignal < 0.8 &&
        terrain.moisture > 0.38 &&
        hasNearbyOceanTerrain(x, y, sampleTerrainSignals, 2) &&
        hasAdjacentLandNeighbor(x, y, sampleTerrainSignals)
      );
    },
  }),
  observatory: createGeneratedPoiOverworldCellAnchorSpec({
    id: 'observatory',
    poiType: 'observatory',
    cellSize: 24,
    chanceKey: 'observatory-anchor',
    offsetXKey: 'observatory-anchor-x',
    offsetYKey: 'observatory-anchor-y',
    threshold: 0.72,
    priority: 24,
    isSuitableTerrain({ terrain, x, y, sampleTerrainSignals }) {
      return (
        terrain.continent >= LAND_CONTINENT_THRESHOLD &&
        terrain.elevation >= OBSERVATORY_ELEVATION_MIN &&
        terrain.riverSignal < 0.72 &&
        hasMountainSummitCluster(x, y, sampleTerrainSignals)
      );
    },
  }),
  station: createGeneratedPoiOverworldCellAnchorSpec({
    id: 'station',
    poiType: 'station',
    cellSize: 24,
    chanceKey: 'station-anchor',
    offsetXKey: 'station-anchor-x',
    offsetYKey: 'station-anchor-y',
    threshold: 0.76,
    priority: 16,
    isSuitableTerrain({ terrain }) {
      return (
        terrain.continent > 0.5 &&
        terrain.continent < 0.9 &&
        terrain.elevation < STATION_ELEVATION_MAX &&
        terrain.riverSignal < 0.72 &&
        terrain.roadSignal >= STATION_ROAD_SIGNAL_MIN
      );
    },
  }),
};

export function createOverworldAnchorsRuntimePlugin(): RuntimePlugin {
  return createRuntimePlugin('runtime-overworld-anchors', {
    resolveOverworldAnchors: createOverworldAnchorResolver({
      town: {
        spec: TOWN_ANCHOR_SPEC,
      },
      bridge: {
        spec: BRIDGE_ANCHOR_SPEC,
      },
      poi: {
        specs: POI_SPECS,
        minSpacing: MIN_POI_SPACING,
        baseAnchors({ townAnchors }) {
          return townAnchors.map((anchor) => ({
            ...anchor,
            type: 'town',
          }));
        },
      },
    }),
  });
}

export function resolveTownAnchor(
  seed: string | number,
  cellX: number,
  cellY: number,
  sampleTerrainSignals: OverworldTerrainSignalSampler,
  cache: Map<string, NamedPoint | null>
) {
  return resolveOverworldCellAnchor({
    seed,
    cellX,
    cellY,
    spec: TOWN_ANCHOR_SPEC,
    sampleTerrainSignals,
    cache,
  });
}
