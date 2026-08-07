import { describe, expect, it } from 'vitest';
import {
  createRouteTraversalProfile,
  createThresholdTerrainClassifier,
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
});
