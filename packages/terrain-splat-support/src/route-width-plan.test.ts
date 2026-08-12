import { describe, expect, it } from 'vitest';
import { createTerrainRouteWidthPlan } from './route-width-plan.ts';

describe('terrain route width plan', () => {
  it('generates narrower widths for trails from metadata and traffic intensity', () => {
    const plan = createTerrainRouteWidthPlan({
      kind: 'path',
      routeClass: 'trail',
      trafficIntensity: 0.25,
    });

    expect(plan).toEqual({
      routeClass: 'trail',
      surfaceWidth: 0.16,
      shoulderWidth: 0.075,
      totalWidth: 0.31,
      reason: 'trail width comes from trail metadata and traffic intensity',
    });
  });

  it('generates broader widths for main roads from route metadata', () => {
    const plan = createTerrainRouteWidthPlan({
      kind: 'road',
      routeClass: 'main-road',
      trafficIntensity: 0.5,
    });

    expect(plan.routeClass).toBe('main-road');
    expect(plan.surfaceWidth).toBeCloseTo(0.32);
    expect(plan.shoulderWidth).toBeCloseTo(0.13);
    expect(plan.totalWidth).toBeCloseTo(0.58);
    expect(plan.reason).toBe(
      'road width comes from route class metadata and traffic intensity'
    );
  });

  it('falls back to road signal when explicit route class metadata is unavailable', () => {
    const local = createTerrainRouteWidthPlan({
      kind: 'road',
      roadSignal: 0.3,
    });
    const highway = createTerrainRouteWidthPlan({
      kind: 'road',
      roadSignal: 0.95,
    });

    expect(local.routeClass).toBe('local-road');
    expect(highway.routeClass).toBe('highway');
    expect(highway.totalWidth).toBeGreaterThan(local.totalWidth);
  });

  it('returns a no-op width plan for unrelated terrain kinds', () => {
    const plan = createTerrainRouteWidthPlan({
      kind: 'forest',
      roadSignal: 0.7,
    });

    expect(plan).toEqual({
      routeClass: null,
      surfaceWidth: 0,
      shoulderWidth: 0,
      totalWidth: 0,
      reason: 'terrain kind does not require a route width plan',
    });
  });
});
