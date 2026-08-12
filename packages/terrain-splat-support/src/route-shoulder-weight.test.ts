import { describe, expect, it } from 'vitest';
import { resolveTerrainRouteShoulderWeights } from './route-shoulder-weight.ts';
import { createTerrainRouteWidthPlan } from './route-width-plan.ts';

describe('terrain route shoulder weight', () => {
  it('keeps full weight inside the route surface and tapers through the shoulder', () => {
    const widthPlan = createTerrainRouteWidthPlan({
      kind: 'road',
      routeClass: 'local-road',
      trafficIntensity: 0.5,
    });

    expect(
      resolveTerrainRouteShoulderWeights({
        distanceFromCenter: 0,
        widthPlan,
      })
    ).toEqual({
      distanceFromCenter: 0,
      surfaceWeight: 1,
      shoulderWeight: 0,
      totalRouteWeight: 1,
    });

    const edge = resolveTerrainRouteShoulderWeights({
      distanceFromCenter:
        widthPlan.surfaceWidth * 0.5 + widthPlan.shoulderWidth * 0.5,
      widthPlan,
    });

    expect(edge.surfaceWeight).toBe(0);
    expect(edge.shoulderWeight).toBeCloseTo(0.5);
    expect(edge.totalRouteWeight).toBeCloseTo(0.5);
  });

  it('drops to zero outside the shoulder band', () => {
    const widthPlan = createTerrainRouteWidthPlan({
      kind: 'road',
      routeClass: 'main-road',
      trafficIntensity: 0.5,
    });

    const distanceFromCenter =
      widthPlan.surfaceWidth * 0.5 + widthPlan.shoulderWidth + 0.01;
    const weights = resolveTerrainRouteShoulderWeights({
      distanceFromCenter,
      widthPlan,
    });

    expect(weights.distanceFromCenter).toBeCloseTo(distanceFromCenter);
    expect(weights.surfaceWeight).toBe(0);
    expect(weights.shoulderWeight).toBe(0);
    expect(weights.totalRouteWeight).toBe(0);
  });

  it('keeps trail shoulders narrower than road shoulders when the width plans are narrower', () => {
    const trail = createTerrainRouteWidthPlan({
      kind: 'path',
      routeClass: 'trail',
      trafficIntensity: 0.2,
    });
    const road = createTerrainRouteWidthPlan({
      kind: 'road',
      routeClass: 'local-road',
      trafficIntensity: 0.2,
    });

    expect(trail.shoulderWidth).toBeLessThan(road.shoulderWidth);
    expect(trail.totalWidth).toBeLessThan(road.totalWidth);
  });
});
