import { describe, expect, it } from 'vitest';
import { createTowerMapPlugin } from './index.ts';
import type { PluginRegistryLike } from '@bworlds/plugin-api';

const plugin = createTowerMapPlugin();

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

describe('map tower', () => {
  it('creates puzzle floors for pushing an obstruction, unlocking a door, and jumping a gap', () => {
    const firstFloor = plugin.createMap?.({
      seed: 'tower-spec',
      plugins: createPlugins(),
      context: {
        id: 'tower:5:4:1',
        label: 'Old Watchtower',
        type: 'tower',
        depth: 1,
        origin: { x: 5, y: 4 },
      },
    });
    expect(firstFloor).toBeDefined();
    if (!firstFloor) {
      throw new Error('expected tower map');
    }

    expect(firstFloor.getTile(0, 0)).toEqual(
      expect.objectContaining({
        kind: 'tower',
        note: expect.stringContaining('push'),
      })
    );
    expect(firstFloor.getTile(0, 1).note).toContain('shoved');
    expect(firstFloor.getAction?.(0, -5)).toMatchObject({
      type: 'deepen',
      context: {
        type: 'tower',
        depth: 2,
      },
    });

    const secondFloor = plugin.createMap?.({
      seed: 'tower-spec',
      plugins: createPlugins(),
      context: {
        id: 'tower:5:4:2',
        label: 'Old Watchtower Level 2',
        type: 'tower',
        depth: 2,
        origin: { x: 5, y: 4 },
      },
    });
    if (!secondFloor) {
      throw new Error('expected second tower floor');
    }
    expect(secondFloor?.getTile(-2, 0).note).toContain('brass key');
    expect(secondFloor?.getTile(0, -1)).toEqual(
      expect.objectContaining({
        kind: 'door',
        note: expect.stringContaining('lock'),
      })
    );

    const thirdFloor = plugin.createMap?.({
      seed: 'tower-spec',
      plugins: createPlugins(),
      context: {
        id: 'tower:5:4:3',
        label: 'Old Watchtower Level 3',
        type: 'tower',
        depth: 3,
        origin: { x: 5, y: 4 },
      },
    });
    if (!thirdFloor) {
      throw new Error('expected third tower floor');
    }
    expect(thirdFloor.getTile(0, 0).note).toContain('jump');
    expect(thirdFloor.getTile(0, -1).note).toContain('running jump');
    expect(thirdFloor.getTile(0, -5)).toEqual(
      expect.objectContaining({
        kind: 'tower',
      })
    );
  });

  it('uses the door tile to leave the tower or descend to the prior floor', () => {
    const firstFloor = plugin.createMap?.({
      seed: 'tower-exit',
      plugins: createPlugins(),
      context: {
        id: 'tower:2:3:1',
        label: 'Northwatch Tower',
        type: 'tower',
        depth: 1,
        origin: { x: 2, y: 3 },
      },
    });
    const upperFloor = plugin.createMap?.({
      seed: 'tower-exit',
      plugins: createPlugins(),
      context: {
        id: 'tower:2:3:2',
        label: 'Northwatch Tower Level 2',
        type: 'tower',
        depth: 2,
        origin: { x: 2, y: 3 },
      },
    });
    if (!firstFloor || !upperFloor) {
      throw new Error('expected tower floors for exit test');
    }

    expect(firstFloor.getExit?.(0, 5)).toEqual(
      expect.objectContaining({
        spawn: expect.objectContaining({ x: 2, y: 3 }),
      })
    );
    expect(upperFloor.getExit?.(0, 5)).toEqual(
      expect.objectContaining({
        spawn: expect.objectContaining({ x: 0, y: -4 }),
      })
    );
  });
});
