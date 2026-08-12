import { describe, expect, it } from 'vitest';
import {
  createTerrainRouteWidthPlan,
  type TerrainRouteClass,
} from './route-width-plan.ts';

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

  it('keeps road width continuous across chunk boundaries when world metadata matches', () => {
    const resolveRoadMetadata = (
      x: number,
      y: number
    ): {
      kind: 'road' | 'plains';
      roadSignal: number;
      routeClass?: TerrainRouteClass;
      trafficIntensity: number;
    } => ({
      kind: x === 2 ? 'road' : 'plains',
      roadSignal: x === 2 ? 0.84 : 0,
      routeClass: x === 2 ? 'main-road' : undefined,
      trafficIntensity: x === 2 ? 0.6 + y * 0.05 : 0,
    });

    const leftChunkBorder = [0, 1, 2].map((y) => {
      const metadata = resolveRoadMetadata(2, y);
      return createTerrainRouteWidthPlan(metadata);
    });
    const rightChunkBorder = [0, 1, 2].map((y) => {
      const metadata = resolveRoadMetadata(2, y);
      return createTerrainRouteWidthPlan(metadata);
    });

    expect(leftChunkBorder).toEqual(rightChunkBorder);
    expect(leftChunkBorder.every((plan) => plan.totalWidth > 0)).toBe(true);
  });

  it('keeps trail width continuous across chunk boundaries when world metadata matches', () => {
    const resolveTrailMetadata = (
      x: number,
      y: number
    ): {
      kind: 'path' | 'plains';
      roadSignal: number;
      routeClass?: TerrainRouteClass;
      trafficIntensity: number;
    } => ({
      kind: y === 4 ? 'path' : 'plains',
      roadSignal: y === 4 ? 0.12 : 0,
      routeClass: y === 4 ? 'trail' : undefined,
      trafficIntensity: y === 4 ? 0.2 + x * 0.04 : 0,
    });

    const topChunkBorder = [0, 1, 2].map((x) => {
      const metadata = resolveTrailMetadata(x, 4);
      return createTerrainRouteWidthPlan(metadata);
    });
    const bottomChunkBorder = [0, 1, 2].map((x) => {
      const metadata = resolveTrailMetadata(x, 4);
      return createTerrainRouteWidthPlan(metadata);
    });

    expect(topChunkBorder).toEqual(bottomChunkBorder);
    expect(topChunkBorder.every((plan) => plan.totalWidth > 0)).toBe(true);
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
