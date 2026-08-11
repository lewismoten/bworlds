import { registerHashLabel } from '@bworlds/core/hash';
import { describe, expect, it } from 'vitest';
import { createDepthMapPlugin } from './index.ts';
import type { PluginRegistryLike } from '@bworlds/plugin-api';

const plugin = createDepthMapPlugin();
const CAVE_LAYOUT_SEED = registerHashLabel('cave-layout-spec');
const DEPTH_SPEC_SEED = registerHashLabel('depth-spec');

function createPlugins(): PluginRegistryLike {
  return {
    getTilePlugin() {
      return null;
    },
    getTileDefinition() {
      return null;
    },
    getDefaultTileKind(fallback = 'plains') {
      return fallback;
    },
    getDefaultTileDefinition(fallback = null) {
      return fallback;
    },
    resolveTileDefinition(_kind, fallback = null) {
      return fallback;
    },
    listTileDefinitions() {
      return [];
    },
    listResolvedTileDefinitions(fallbackEntries = []) {
      return fallbackEntries;
    },
    classifyTerrainTile() {
      return null;
    },
    classifyOverworldTile() {
      return undefined;
    },
    canOccupy3D() {
      return undefined;
    },
    getSurfaceProfile3D() {
      return undefined;
    },
    getTraversalProfile3D() {
      return undefined;
    },
    paint2DOverlay() {
      return undefined;
    },
    resolveFloorKind3D() {
      return undefined;
    },
    resolveWorldEnvironment() {
      return {};
    },
    createWorldAction() {
      return undefined;
    },
    decorateOverworldTile(payload) {
      return payload.tile;
    },
    decorateTownTile(payload) {
      return payload.tile;
    },
    decorateBuildingTile(payload) {
      return payload.tile;
    },
    decorateDepthTile(payload) {
      return payload.tile;
    },
    createMap() {
      return null;
    },
    resolveOverworldTile() {
      return null;
    },
    resolveOverworldAnchors() {
      return {
        townAnchors: [],
        bridgeAnchors: [],
        poiAnchors: [],
      };
    },
  };
}

describe('map depth long-running checks', () => {
  it('recreates deterministic cave layouts after bounded cache eviction churn', () => {
    const context = {
      id: 'cave-system:2,3|4,7',
      label: 'Lantern Grotto',
      type: 'cave' as const,
      depth: 1,
      origin: { x: 2, y: 3 },
      systemId: 'cave-system:2,3|4,7',
      entrances: [
        { x: 2, y: 3, name: 'South Mouth' },
        { x: 4, y: 7, name: 'East Mouth' },
      ],
    };

    const first = plugin.createMap?.({
      seed: CAVE_LAYOUT_SEED,
      plugins: createPlugins(),
      context,
    });

    if (!first) {
      throw new Error('expected cached cave depth map');
    }

    const baselineTiles = [
      first.getTile(0, 0),
      first.getTile(0, -7),
      first.getTile(0, 6),
      first.getTile(-3, 5),
      first.getTile(4, 0),
    ];

    for (let index = 0; index < 272; index += 1) {
      plugin.createMap?.({
        seed: DEPTH_SPEC_SEED + index,
        plugins: createPlugins(),
        context: {
          id: `cave-system:${index},${index + 1}`,
          label: `Cave ${index}`,
          type: 'cave',
          depth: (index % 3) + 1,
          origin: { x: index, y: index + 1 },
          systemId: `cave-system:${index},${index + 1}`,
          entrances: [{ x: index, y: index + 1, name: `Mouth ${index}` }],
        },
      });
    }

    const second = plugin.createMap?.({
      seed: 'cave-layout-spec',
      plugins: createPlugins(),
      context,
    });

    if (!second) {
      throw new Error('expected regenerated cave depth map');
    }

    expect([
      second.getTile(0, 0),
      second.getTile(0, -7),
      second.getTile(0, 6),
      second.getTile(-3, 5),
      second.getTile(4, 0),
    ]).toEqual(baselineTiles);
  }, 4_000);
});
