import { describe, expect, it } from 'vitest';
import { blendTerrainRouteEdgeIntoSample } from './route-edge-blend.ts';

describe('terrain route edge blend', () => {
  it('blends a route layer gradually into surrounding terrain', () => {
    const result = blendTerrainRouteEdgeIntoSample({
      baseSample: {
        entries: [
          { layerId: 'grass-a', weight: 0.7 },
          { layerId: 'soil', weight: 0.3 },
        ],
      },
      routeLayerId: 'dirt-road',
      routeWeight: 0.4,
    });

    expect(result.routeWeight).toBe(0.4);
    expect(result.sample.entries[0]).toEqual({
      layerId: 'grass-a',
      weight: 0.42,
    });
    expect(result.sample.entries[1]).toEqual({
      layerId: 'dirt-road',
      weight: 0.4,
    });
    expect(result.sample.entries[2]?.layerId).toBe('soil');
    expect(result.sample.entries[2]?.weight).toBeCloseTo(0.18);
  });

  it('preserves the surrounding terrain when route weight is zero', () => {
    const result = blendTerrainRouteEdgeIntoSample({
      baseSample: {
        entries: [
          { layerId: 'grass-a', weight: 0.7 },
          { layerId: 'soil', weight: 0.3 },
        ],
      },
      routeLayerId: 'dirt-road',
      routeWeight: 0,
    });

    expect(result.sample.entries[0]).toEqual({
      layerId: 'grass-a',
      weight: 0.7,
    });
    expect(result.sample.entries[1]?.layerId).toBe('soil');
    expect(result.sample.entries[1]?.weight).toBeCloseTo(0.3);
  });

  it('clamps invalid route weights and lets a full route layer replace the base sample', () => {
    const result = blendTerrainRouteEdgeIntoSample({
      baseSample: {
        entries: [
          { layerId: 'grass-a', weight: 0.7 },
          { layerId: 'soil', weight: 0.3 },
        ],
      },
      routeLayerId: 'gravel-road',
      routeWeight: 2,
    });

    expect(result.routeWeight).toBe(1);
    expect(result.sample.entries).toEqual([
      { layerId: 'gravel-road', weight: 1 },
    ]);
  });
});
