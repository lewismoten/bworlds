import { describe, expect, it } from 'vitest';
import {
  createBoundarySurfaceProfile,
  createRouteTraversalProfile,
  createThresholdTerrainClassifier,
  resolveDominantNeighborFloorKind3D,
} from './index.ts';

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

  it('resolves the dominant neighboring floor kind for 3D tile overlays', () => {
    expect(
      resolveDominantNeighborFloorKind3D(
        {
          tile: { kind: 'road' },
          tileX: 0,
          tileY: 0,
          state: {
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
          } as any,
        },
        {
          isExcludedKind(kind) {
            return kind === 'road' || kind === 'river';
          },
        }
      )
    ).toBe('plains');
  });
});
