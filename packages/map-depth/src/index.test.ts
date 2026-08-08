import { describe, expect, it } from 'vitest';
import { createDepthMapPlugin } from './index.ts';
import type { PluginRegistryLike } from '@bworlds/plugin-api';

const plugin = createDepthMapPlugin();

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

describe('map depth', () => {
  it('generates cave interiors with pools, rope bridges, and cave features', () => {
    const map = plugin.createMap?.({
      seed: 'cave-layout-spec',
      plugins: createPlugins(),
      context: {
        id: 'cave-system:2,3|4,7',
        label: 'Lantern Grotto',
        type: 'cave',
        depth: 1,
        origin: { x: 2, y: 3 },
        systemId: 'cave-system:2,3|4,7',
        entrances: [
          { x: 2, y: 3, name: 'South Mouth' },
          { x: 4, y: 7, name: 'East Mouth' },
        ],
      },
    });
    expect(map).toBeDefined();
    if (!map) {
      throw new Error('expected cave depth map');
    }

    const featureKinds = new Set<string>();
    for (let y = -13; y <= 13; y += 1) {
      for (let x = -13; x <= 13; x += 1) {
        featureKinds.add(map.getTile(x, y).kind);
      }
    }

    expect(featureKinds.has('river')).toBe(true);
    expect(featureKinds.has('bridge')).toBe(true);
    expect(featureKinds.has('cave-mushrooms')).toBe(true);
    expect(featureKinds.has('cave-dripstone')).toBe(true);
    expect(featureKinds.has('cave-obstacle')).toBe(true);
  });

  it('creates multiple overworld exits for shared cave systems', () => {
    const map = plugin.createMap?.({
      seed: 'spec',
      plugins: createPlugins(),
      context: {
        id: 'cave-system:5,5|11,5',
        label: 'Twin Mouth Cave',
        type: 'cave',
        depth: 1,
        origin: { x: 5, y: 5 },
        systemId: 'cave-system:5,5|11,5',
        entrances: [
          { x: 5, y: 5, name: 'West Mouth' },
          { x: 11, y: 5, name: 'East Mouth' },
        ],
      },
    });
    expect(map).toBeDefined();
    if (!map) {
      throw new Error('expected cave depth map');
    }

    expect(map.getTile(0, 6)).toEqual(
      expect.objectContaining({
        kind: 'stairsUp',
      })
    );
    expect(map.getTile(-3, 5)).toEqual(
      expect.objectContaining({
        kind: 'stairsUp',
      })
    );
    expect(map.getExit?.(0, 6)).toEqual(
      expect.objectContaining({
        spawn: expect.objectContaining({ x: 5, y: 5 }),
      })
    );
    expect(map.getExit?.(-3, 5)).toEqual(
      expect.objectContaining({
        spawn: expect.objectContaining({ x: 11, y: 5 }),
      })
    );
  });
});
