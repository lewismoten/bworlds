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
type PoiType = 'cave' | 'dungeon';

const TOWN_CELL_SIZE = 20;
const BRIDGE_CELL_SIZE = 16;
const MIN_POI_SPACING = 9;

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
    isSuitableTerrain(terrain) {
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
  isSuitableTerrain(terrain) {
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
    isSuitableTerrain(terrain) {
      return (
        terrain.continent > 0.47 &&
        terrain.continent < 0.9 &&
        terrain.elevation < 0.78 &&
        terrain.riverSignal < 0.8
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
    isSuitableTerrain(terrain) {
      return (
        terrain.continent > 0.5 &&
        terrain.continent < 0.88 &&
        terrain.elevation > 0.34 &&
        terrain.elevation < 0.82 &&
        terrain.riverSignal < 0.78
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
