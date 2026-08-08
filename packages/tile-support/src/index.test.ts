import { describe, expect, it } from 'vitest';
import {
  createBoundarySurfaceProfile,
  createRoadsideRouteProfile,
  createRouteTraversalProfile,
  createThresholdTerrainClassifier,
  isBridgeWaterKind,
  isWaterKind,
  isWaterOrCrossingKind,
  resolveDominantNeighborFloorKind3D,
  withTerrainTileClassifier,
} from './index.ts';
import type { ResolveFloorKind3DContext, TilePlugin } from '@bworlds/plugin-api';

describe('tile support', () => {
  it('creates a default route traversal profile', () => {
    expect(createRouteTraversalProfile()).toEqual({
      travelGroup: 'route',
    });
  });

  it('allows overrides on top of the route traversal profile', () => {
    expect(
      createRouteTraversalProfile({
        slideAxis: 'ew',
      })
    ).toEqual({
      travelGroup: 'route',
      slideAxis: 'ew',
    });
  });

  it('provides shared water and crossing kind helpers', () => {
    expect(isWaterKind('river')).toBe(true);
    expect(isWaterKind('bridge')).toBe(false);
    expect(isBridgeWaterKind('ocean')).toBe(true);
    expect(isBridgeWaterKind('bridge')).toBe(false);
    expect(isWaterOrCrossingKind('bridge')).toBe(true);
    expect(isWaterOrCrossingKind('forest')).toBe(false);
  });

  it('profiles roadside route junctions through the adjacent road tile', () => {
    const profile = createRoadsideRouteProfile({
      x: 9,
      y: 10,
      townAnchors: [{ x: 18, y: 10 }],
      bridgeAnchors: [],
      sampleTerrainSignals(x, y) {
        if (
          (x === 10 && y === 10) ||
          (x === 10 && (y === 9 || y === 11)) ||
          (x === 11 && y === 10)
        ) {
          return {
            continent: 0.6,
            elevation: 0.4,
            moisture: 0.5,
            riverSignal: 0.1,
            roadSignal: 0.96,
          };
        }
        return {
          continent: 0.6,
          elevation: 0.4,
          moisture: 0.5,
          riverSignal: 0.1,
          roadSignal: 0.2,
        };
      },
    });

    expect(profile.onRoute).toBe(false);
    expect(profile.adjacentRoadCount).toBe(1);
    expect(profile.atJunction).toBe(true);
    expect(profile.routeSpan).toBeGreaterThanOrEqual(4);
  });

  it('creates reusable boundary surface profiles for 3D terrain transitions', () => {
    expect(
      createBoundarySurfaceProfile({
        surfaceHeight: -0.12,
        boundaryRole: 'channel',
        underlayKind: 'river',
        boundaryTransition: {
          maxChamferDrop: 0.08,
          bodyInset: 0.08,
        },
      })
    ).toEqual({
      surfaceHeight: -0.12,
      boundaryRole: 'channel',
      underlayKind: 'river',
      chamferEligible: false,
      boundaryTransition: {
        maxChamferDrop: 0.08,
        bodyInset: 0.08,
      },
    });
  });

  it('creates threshold-based terrain classifiers with shared base-kind logic', () => {
    const classifyForest = createThresholdTerrainClassifier({
      kind: 'forest',
      threshold: 0.6,
      getSignal(context) {
        return context.signals.moisture;
      },
    });

    expect(
      classifyForest({
        seed: 'spec',
        x: 0,
        y: 0,
        tile: { kind: 'plains' },
        nearLand: true,
        signals: {
          continent: 0.5,
          elevation: 0.5,
          moisture: 0.75,
          riverSignal: 0.5,
          roadSignal: 0.5,
        },
        townAnchors: [],
        bridgeAnchors: [],
      })
    ).toEqual({ kind: 'forest' });
    expect(
      classifyForest({
        seed: 'spec',
        x: 0,
        y: 0,
        tile: { kind: 'river' },
        nearLand: true,
        signals: {
          continent: 0.5,
          elevation: 0.5,
          moisture: 0.75,
          riverSignal: 0.5,
          roadSignal: 0.5,
        },
        townAnchors: [],
        bridgeAnchors: [],
      })
    ).toBeNull();
  });

  it('supports alternate comparisons and custom tile creation', () => {
    const classifyOcean = createThresholdTerrainClassifier({
      kind: 'ocean',
      threshold: 0.38,
      comparator: 'lt',
      getSignal(context) {
        return context.signals.continent;
      },
      createTile() {
        return { kind: 'ocean', note: 'Open water.' };
      },
    });

    expect(
      classifyOcean({
        seed: 'spec',
        x: 1,
        y: 2,
        tile: { kind: 'plains' },
        nearLand: false,
        signals: {
          continent: 0.2,
          elevation: 0.5,
          moisture: 0.5,
          riverSignal: 0.5,
          roadSignal: 0.5,
        },
        townAnchors: [],
        bridgeAnchors: [],
      })
    ).toEqual({ kind: 'ocean', note: 'Open water.' });
  });

  it('wraps terrain classifiers into reusable tile entries', () => {
    const tile = withTerrainTileClassifier<TilePlugin>(
      {
        kind: 'forest',
        definition: {
          name: 'Forest',
          color: '#000000',
          miniColor: '#111111',
          walkable: true,
          wallHeight: 0.3,
        },
      },
      createThresholdTerrainClassifier({
        kind: 'forest',
        threshold: 0.6,
        getSignal(context) {
          return context.signals.moisture;
        },
      })
    );

    expect(
      tile.classifyTerrainTile?.({
        seed: 'spec',
        x: 0,
        y: 0,
        tile: { kind: 'plains' },
        nearLand: true,
        signals: {
          continent: 0.5,
          elevation: 0.5,
          moisture: 0.75,
          riverSignal: 0.5,
          roadSignal: 0.5,
        },
        townAnchors: [],
        bridgeAnchors: [],
      })
    ).toEqual({ kind: 'forest' });
  });

  it('resolves the dominant neighboring floor kind for 3D tile overlays', () => {
    const payload: ResolveFloorKind3DContext = {
      tile: { kind: 'road' },
      tileX: 0,
      tileY: 0,
      state: {
        player: { x: 0, y: 0, facing: 0 },
        getCurrentContext() {
          return { id: 'overworld', type: 'overworld', depth: 0 };
        },
        getCurrentTile(x: number, y: number) {
          const key = `${x}:${y}`;
          const kinds: Record<string, string> = {
            '-1:-1': 'plains',
            '0:-1': 'plains',
            '1:-1': 'forest',
            '-1:0': 'plains',
            '1:0': 'road',
            '-1:1': 'forest',
            '0:1': 'plains',
            '1:1': 'river',
          };
          return { kind: kinds[key] ?? 'road' };
        },
        getTileDefinition(kind: string) {
          return {
            name: kind,
            color: '#000000',
            miniColor: '#111111',
            walkable: true,
            wallHeight: 0,
          };
        },
      },
    };
    expect(
      resolveDominantNeighborFloorKind3D(
        payload,
        {
          isExcludedKind(kind) {
            return kind === 'road' || kind === 'river';
          },
        }
      )
    ).toBe('plains');
  });
});
