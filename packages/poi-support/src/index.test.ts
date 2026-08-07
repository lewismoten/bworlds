import { describe, expect, it } from 'vitest';
import {
  CARDINAL_DIRECTIONS,
  canPlaceLandPoi,
  createChanceBasedLandPoiClassifier,
  createEnterablePoiTileFeatures,
  createGeneratedPoiTile,
  createPoiWorldAction,
  getNearestAccessibleRouteDistance,
  pickPreferredLandmarkFacing,
} from './index.ts';

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
      })
    ).toBeNull();
  });

  it('checks basic land-poi placement eligibility', () => {
    expect(canPlaceLandPoi(true, 'plains')).toBe(true);
    expect(canPlaceLandPoi(false, 'plains')).toBe(false);
    expect(canPlaceLandPoi(true, 'river')).toBe(false);
  });

  it('finds reachable route distances for a facing direction', () => {
    const east = CARDINAL_DIRECTIONS.find((direction) => direction.label === 'east')!;
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

function createMockState(
  tileMap: Record<string, { kind: string }>
) {
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
