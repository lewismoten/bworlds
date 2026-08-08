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
