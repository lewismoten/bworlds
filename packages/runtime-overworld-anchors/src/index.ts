import { generatePoiName } from '@bworlds/core';
import {
  collectNearbyOverworldCellAnchors,
  resolveOverworldCellAnchor,
  type OverworldCellAnchorSpec,
  type OverworldTerrainSignalSampler,
} from '@bworlds/overworld-support';
import { createRuntimePlugin } from '@bworlds/plugin-api';
import type {
  OverworldAnchorLike,
  PoiAnchorLike,
  ResolveOverworldAnchorsContext,
  RuntimePlugin,
} from '@bworlds/plugin-api';

type NamedPoint = OverworldAnchorLike & { name: string };
type NamedPoiAnchor = PoiAnchorLike & { name: string };
type PoiType = 'cave' | 'dungeon';

const TOWN_CELL_SIZE = 20;
const BRIDGE_CELL_SIZE = 16;
const MIN_POI_SPACING = 9;

const TOWN_ANCHOR_SPEC: OverworldCellAnchorSpec<NamedPoint> = {
  id: 'town',
  cellSize: TOWN_CELL_SIZE,
  chanceKey: 'town-anchor',
  offsetXKey: 'town-anchor-x',
  offsetYKey: 'town-anchor-y',
  threshold: 0.64,
  priority: 0,
  isSuitableTerrain(terrain) {
    return (
      terrain.continent > 0.47 &&
      terrain.continent < 0.9 &&
      terrain.elevation < 0.7 &&
      terrain.riverSignal < 0.82
    );
  },
  createAnchor({ seed, x, y }) {
    return {
      x,
      y,
      name: generatePoiName(seed, 'town', x, y),
    };
  },
};

const BRIDGE_ANCHOR_SPEC: OverworldCellAnchorSpec<OverworldAnchorLike> = {
  id: 'bridge',
  cellSize: BRIDGE_CELL_SIZE,
  chanceKey: 'bridge-anchor',
  offsetXKey: 'bridge-anchor-x',
  offsetYKey: 'bridge-anchor-y',
  threshold: 0.72,
  priority: 0,
  isSuitableTerrain(terrain) {
    return (
      terrain.continent > 0.46 &&
      terrain.continent < 0.88 &&
      terrain.elevation < 0.68 &&
      terrain.riverSignal > 0.8
    );
  },
  createAnchor({ x, y }) {
    return { x, y };
  },
};

const POI_SPECS: Record<PoiType, OverworldCellAnchorSpec<NamedPoiAnchor>> = {
  cave: {
    id: 'cave',
    cellSize: 18,
    chanceKey: 'cave-anchor',
    offsetXKey: 'cave-anchor-x',
    offsetYKey: 'cave-anchor-y',
    threshold: 0.74,
    priority: 10,
    isSuitableTerrain(terrain) {
      return (
        terrain.continent > 0.47 &&
        terrain.continent < 0.9 &&
        terrain.elevation < 0.78 &&
        terrain.riverSignal < 0.8
      );
    },
    createAnchor({ seed, x, y }) {
      return {
        x,
        y,
        type: 'cave',
        name: generatePoiName(seed, 'cave', x, y),
      };
    },
  },
  dungeon: {
    id: 'dungeon',
    cellSize: 22,
    chanceKey: 'dungeon-anchor',
    offsetXKey: 'dungeon-anchor-x',
    offsetYKey: 'dungeon-anchor-y',
    threshold: 0.78,
    priority: 20,
    isSuitableTerrain(terrain) {
      return (
        terrain.continent > 0.5 &&
        terrain.continent < 0.88 &&
        terrain.elevation > 0.34 &&
        terrain.elevation < 0.82 &&
        terrain.riverSignal < 0.78
      );
    },
    createAnchor({ seed, x, y }) {
      return {
        x,
        y,
        type: 'dungeon',
        name: generatePoiName(seed, 'dungeon', x, y),
      };
    },
  },
};

const POI_SPEC_LIST = Object.values(POI_SPECS);

export function createOverworldAnchorsRuntimePlugin(): RuntimePlugin {
  const townAnchorCache = new Map<string, NamedPoint | null>();
  const bridgeAnchorCache = new Map<string, OverworldAnchorLike | null>();
  const caveAnchorCache = new Map<string, NamedPoiAnchor | null>();
  const dungeonAnchorCache = new Map<string, NamedPoiAnchor | null>();

  return createRuntimePlugin('runtime-overworld-anchors', {
    resolveOverworldAnchors({
      seed,
      x,
      y,
      sampleTerrainSignals,
    }: ResolveOverworldAnchorsContext) {
      return {
        townAnchors: getNearbyTownAnchors(
          seed,
          x,
          y,
          sampleTerrainSignals,
          townAnchorCache
        ),
        bridgeAnchors: getNearbyBridgeAnchors(
          seed,
          x,
          y,
          sampleTerrainSignals,
          bridgeAnchorCache
        ),
        poiAnchors: getNearbyPoiAnchors(
          seed,
          x,
          y,
          sampleTerrainSignals,
          townAnchorCache,
          caveAnchorCache,
          dungeonAnchorCache
        ),
      };
    },
  });
}

function getNearbyTownAnchors(
  seed: string | number,
  x: number,
  y: number,
  sampleTerrainSignals: OverworldTerrainSignalSampler,
  cache: Map<string, NamedPoint | null>
) {
  return collectNearbyOverworldCellAnchors({
    seed,
    x,
    y,
    spec: TOWN_ANCHOR_SPEC,
    sampleTerrainSignals,
    cache,
  });
}

function getNearbyBridgeAnchors(
  seed: string | number,
  x: number,
  y: number,
  sampleTerrainSignals: OverworldTerrainSignalSampler,
  cache: Map<string, OverworldAnchorLike | null>
) {
  return collectNearbyOverworldCellAnchors({
    seed,
    x,
    y,
    spec: BRIDGE_ANCHOR_SPEC,
    sampleTerrainSignals,
    cache,
  });
}

function getNearbyPoiAnchors(
  seed: string | number,
  x: number,
  y: number,
  sampleTerrainSignals: OverworldTerrainSignalSampler,
  townCache: Map<string, NamedPoint | null>,
  caveCache: Map<string, NamedPoiAnchor | null>,
  dungeonCache: Map<string, NamedPoiAnchor | null>
) {
  const townAnchors = getNearbyTownAnchors(
    seed,
    x,
    y,
    sampleTerrainSignals,
    townCache
  );
  const anchors: NamedPoiAnchor[] = townAnchors.map((anchor) => ({
    ...anchor,
    type: 'town',
  }));
  const caches: Record<PoiType, Map<string, NamedPoiAnchor | null>> = {
    cave: caveCache,
    dungeon: dungeonCache,
  };

  for (const poiType of Object.keys(POI_SPECS) as PoiType[]) {
    anchors.push(
      ...collectNearbyOverworldCellAnchors({
        seed,
        x,
        y,
        spec: POI_SPECS[poiType],
        sampleTerrainSignals,
        cache: caches[poiType],
        minSpacing: MIN_POI_SPACING,
        blockingAnchors: townAnchors,
        conflictSpecs: POI_SPEC_LIST,
      })
    );
  }

  return anchors;
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
