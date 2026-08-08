import { describe, expect, it } from 'vitest';
import {
  CARDINAL_DIRECTIONS,
  createAnchoredPoiTile,
  createAnchoredEnterablePoiTilePlugin,
  createAnchoredLandPoiClassifier,
  canPlaceLandPoi,
  createChanceBasedLandPoiClassifier,
  createEnterablePoiTilePlugin,
  createEnterablePoiTileFeatures,
  createGeneratedPoiTile,
  createPoiWorldAction,
  getNearestAccessibleRouteDistance,
  pickPreferredLandmarkFacing,
  resolvePlacementChance,
} from './index.ts';
import type { ClassifyOverworldTileContext, WorldStateLike } from '@bworlds/plugin-api';

function createPoiClassifierPayload(
  overrides: Partial<ClassifyOverworldTileContext> = {}
): ClassifyOverworldTileContext {
  return {
    seed: 'spec',
    x: 8,
    y: 9,
    tile: { kind: 'plains' },
    nearLand: true,
    signals: {
      continent: 0.5,
      elevation: 0.5,
      moisture: 0.5,
      riverSignal: 0.5,
      roadSignal: 0.5,
    },
    townAnchors: [],
    bridgeAnchors: [],
    poiAnchors: [],
    ...overrides,
  };
}

describe('poi support', () => {
  it('creates deterministic generated poi tiles', () => {
    expect(
      createGeneratedPoiTile({
        kind: 'cave',
        note: 'A cave mouth opens in the terrain.',
        poiType: 'cave',
        seed: 'spec',
        x: 5,
        y: 7,
      })
    ).toMatchObject({
      kind: 'cave',
      poi: {
        type: 'cave',
        name: expect.any(String),
      },
    });
  });

  it('creates anchored poi tiles that preserve anchor names', () => {
    expect(
      createAnchoredPoiTile({
        kind: 'town',
        note: 'A lively town rises where several roads meet.',
        poiType: 'town',
        seed: 'spec',
        tile: { kind: 'plains' },
        anchor: {
          x: 8,
          y: 9,
          type: 'town',
          name: 'Ashford',
        },
      })
    ).toMatchObject({
      kind: 'town',
      poi: {
        type: 'town',
        name: 'Ashford',
      },
    });
  });

  it('creates anchored poi tiles with deterministic fallback names when anchors are unnamed', () => {
    expect(
      createAnchoredPoiTile({
        kind: 'cave',
        note: 'A cave mouth opens in the terrain.',
        poiType: 'cave',
        seed: 'spec',
        tile: { kind: 'plains' },
        anchor: {
          x: 5,
          y: 7,
          type: 'cave',
        },
      })
    ).toMatchObject({
      kind: 'cave',
      poi: {
        type: 'cave',
        name: expect.any(String),
      },
    });
  });

  it('creates enter actions for poi tiles', () => {
    expect(
      createPoiWorldAction(
        {
          seed: 'spec',
          x: 3,
          y: 4,
          tile: {
            kind: 'town',
            poi: { type: 'town', name: 'Ashford' },
          },
        },
        {
          spawn: { x: 0, y: 0 },
          facing: 0,
        }
      )
    ).toMatchObject({
      type: 'enter',
      context: {
        id: 'town:3:4:0',
        label: 'Ashford',
        type: 'town',
      },
    });
  });

  it('creates shared enterable-poi tile features', () => {
    const features = createEnterablePoiTileFeatures({
      traversalProfile: { slideAxis: 'ew' },
      worldAction: { spawn: { x: 2, y: 3 }, facing: Math.PI / 2 },
    });

    expect(
      features.getTraversalProfile3D?.({
        state: createMockState({}),
        tile: { kind: 'town' },
        tileX: 0,
        tileY: 0,
      })
    ).toEqual({
      travelGroup: 'route',
      slideAxis: 'ew',
    });
    expect(
      features.createWorldAction?.({
        seed: 'spec',
        x: 3,
        y: 4,
        tile: {
          kind: 'town',
          poi: { type: 'town', name: 'Ashford' },
        },
      })
    ).toMatchObject({
      type: 'enter',
      spawn: { x: 2, y: 3 },
      facing: Math.PI / 2,
      context: {
        id: 'town:3:4:0',
      },
    });
  });

  it('creates a shared chance-based land-poi classifier', () => {
    const classify = createChanceBasedLandPoiClassifier({
      kind: 'cave',
      poiType: 'cave',
      note: 'A cave mouth opens in the terrain.',
      threshold: 0.997,
      getChance(context) {
        return context.caveChance;
      },
    });

    expect(
      classify({
        seed: 'spec',
        x: 5,
        y: 7,
        tile: { kind: 'plains' },
        nearLand: true,
        caveChance: 0.999,
        signals: {
          continent: 0.5,
          elevation: 0.5,
          moisture: 0.5,
          riverSignal: 0.5,
          roadSignal: 0.5,
        },
        townAnchors: [],
        bridgeAnchors: [],
        poiAnchors: [],
      })
    ).toMatchObject({
      kind: 'cave',
      poi: {
        type: 'cave',
        name: expect.any(String),
      },
    });

    expect(
      classify({
        seed: 'spec',
        x: 5,
        y: 7,
        tile: { kind: 'river' },
        nearLand: true,
        caveChance: 0.999,
        signals: {
          continent: 0.5,
          elevation: 0.5,
          moisture: 0.5,
          riverSignal: 0.5,
          roadSignal: 0.5,
        },
        townAnchors: [],
        bridgeAnchors: [],
        poiAnchors: [],
      })
    ).toBeNull();
  });

  it('creates a shared anchored land-poi classifier', () => {
    const classify = createAnchoredLandPoiClassifier({
      kind: 'cave',
      note: 'A cave mouth opens in the terrain.',
    });

    expect(
      classify(
        createPoiClassifierPayload({
          poiAnchors: [{ x: 8, y: 9, type: 'cave', name: 'Stone Hollow' }],
        })
      )
    ).toMatchObject({
      kind: 'cave',
      poi: {
        type: 'cave',
        name: 'Stone Hollow',
      },
    });
  });

  it('creates a shared anchored enterable-poi tile plugin', () => {
    const plugin = createAnchoredEnterablePoiTilePlugin({
      pluginName: 'tile-town',
      kind: 'town',
      definition: {
        name: 'Town',
        color: '#ffffff',
        miniColor: '#cccccc',
        walkable: true,
        wallHeight: 0.5,
      },
      note: 'A lively town rises where several roads meet.',
      paint2D() {
        return true;
      },
    });
    const townTile = plugin.tiles?.find((tile) => tile.kind === 'town');

    expect(
      townTile?.classifyOverworldTile?.(
        createPoiClassifierPayload({
          poiAnchors: [{ x: 8, y: 9, type: 'town', name: 'Ashford' }],
        })
      )
    ).toMatchObject({
      kind: 'town',
      poi: {
        type: 'town',
        name: 'Ashford',
      },
    });

    expect(
      townTile?.getTraversalProfile3D?.({
        state: createMockState({}),
        tile: { kind: 'town' },
        tileX: 0,
        tileY: 0,
      })
    ).toEqual({
      travelGroup: 'route',
    });
  });

  it('creates a shared base enterable-poi tile plugin from a supplied classifier', () => {
    const plugin = createEnterablePoiTilePlugin({
      pluginName: 'tile-landmark',
      kind: 'landmark',
      definition: {
        name: 'Landmark',
        color: '#ffffff',
        miniColor: '#cccccc',
        walkable: true,
        wallHeight: 0.4,
      },
      classifyPoi(context) {
        if (context.x === 2 && context.y === 3) {
          return {
            kind: 'landmark',
            poi: { type: 'landmark', name: 'Stone Marker' },
          };
        }
        return null;
      },
    });
    const landmarkTile = plugin.tiles?.find((tile) => tile.kind === 'landmark');

    expect(
      landmarkTile?.classifyOverworldTile?.(
        createPoiClassifierPayload({
          x: 2,
          y: 3,
        })
      )
    ).toEqual({
      kind: 'landmark',
      poi: { type: 'landmark', name: 'Stone Marker' },
    });
    expect(
      landmarkTile?.getTraversalProfile3D?.({
        state: createMockState({}),
        tile: { kind: 'landmark' },
        tileX: 0,
        tileY: 0,
      })
    ).toEqual({
      travelGroup: 'route',
    });
  });

  it('checks basic land-poi placement eligibility', () => {
    expect(canPlaceLandPoi(true, 'plains')).toBe(true);
    expect(canPlaceLandPoi(false, 'plains')).toBe(false);
    expect(canPlaceLandPoi(true, 'river')).toBe(false);
  });

  it('resolves placement chances from the generic keyed API', () => {
    expect(
      resolvePlacementChance(
        {
          seed: 'spec',
          x: 5,
          y: 7,
          tile: { kind: 'plains' },
          nearLand: true,
          placementChances: { ruins: 0.998 },
          signals: {
            continent: 0.5,
            elevation: 0.5,
            moisture: 0.5,
            riverSignal: 0.5,
            roadSignal: 0.5,
          },
          townAnchors: [],
          bridgeAnchors: [],
          poiAnchors: [],
        },
        'ruins'
      )
    ).toBe(0.998);

    expect(
      resolvePlacementChance(
        {
          seed: 'spec',
          x: 5,
          y: 7,
          tile: { kind: 'plains' },
          nearLand: true,
          signals: {
            continent: 0.5,
            elevation: 0.5,
            moisture: 0.5,
            riverSignal: 0.5,
            roadSignal: 0.5,
          },
          townAnchors: [],
          bridgeAnchors: [],
          poiAnchors: [],
          getPlacementChance(chanceKey: string) {
            return chanceKey === 'ruins' ? 0.999 : 0;
          },
        },
        'ruins'
      )
    ).toBe(0.999);
  });

  it('finds reachable route distances for a facing direction', () => {
    const east = CARDINAL_DIRECTIONS.find(
      (direction) => direction.label === 'east'
    )!;
    const state = createMockState({
      '1:0': { kind: 'plains' },
      '2:0': { kind: 'road' },
    });

    expect(getNearestAccessibleRouteDistance(state, 0, 0, east)).toBe(2);
  });

  it('prefers landmark facings with route and land access', () => {
    const state = createMockState({
      '1:0': { kind: 'plains' },
      '2:0': { kind: 'road' },
      '0:-1': { kind: 'ocean' },
      '0:1': { kind: 'mountain' },
      '-1:0': { kind: 'plains' },
    });

    expect(
      pickPreferredLandmarkFacing({
        state,
        tileX: 0,
        tileY: 0,
        seedKey: 'spec-facing',
        preferLandFacing: true,
      }).label
    ).toBe('east');
  });
});

function createMockState(tileMap: Record<string, { kind: string }>): WorldStateLike {
  return {
    player: { x: 0, y: 0, facing: 0 },
    getCurrentContext() {
      return { id: 'overworld', type: 'overworld', depth: 0 };
    },
    getCurrentTile(x = 0, y = 0) {
      return tileMap[`${x}:${y}`] ?? { kind: 'plains' };
    },
    getTileDefinition(kind: string) {
      return {
        name: kind,
        color: '#000000',
        miniColor: '#111111',
        walkable: !['ocean', 'river', 'mountain', 'wall'].includes(kind),
        wallHeight: 0,
      };
    },
  };
}
