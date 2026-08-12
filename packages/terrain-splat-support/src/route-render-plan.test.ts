import { describe, expect, it } from 'vitest';
import { createTerrainRouteRenderPlan } from './route-render-plan.ts';

describe('terrain route render plan', () => {
  it('keeps simple flat roads on terrain splat layers and removes separate road meshes', () => {
    const plan = createTerrainRouteRenderPlan({
      kind: 'road',
      roadSignal: 0.24,
      dirtRoadLayerId: 'dirt-road',
      gravelRoadLayerId: 'gravel-road',
    });

    expect(plan.mode).toBe('splat');
    expect(plan.classification).toBe('simple-road');
    expect(plan.removeSeparateRoadMesh).toBe(true);
    expect(plan.requiresSeparateRouteMesh).toBe(false);
    expect(plan.reason).toContain('simple roads stay on terrain splat layers');
  });

  it('keeps light trails on terrain splat layers when their shape is narrow but splat-safe', () => {
    const plan = createTerrainRouteRenderPlan({
      kind: 'path',
      roadSignal: 0.12,
      dirtRoadLayerId: 'dirt-road',
      gravelRoadLayerId: 'gravel-road',
      grassTrailLayerId: 'grass-trail',
    });

    expect(plan.mode).toBe('splat');
    expect(plan.classification).toBe('trail');
    expect(plan.surfacePlan.layerId).toBe('grass-trail');
    expect(plan.removeSeparateRoadMesh).toBe(true);
    expect(plan.requiresSeparateRouteMesh).toBe(false);
  });

  it('classifies busier splat-safe paths as worn paths instead of separate meshes', () => {
    const plan = createTerrainRouteRenderPlan({
      kind: 'path',
      roadSignal: 0.28,
      trafficIntensity: 0.42,
      routeSurface: 'dirt',
      dirtRoadLayerId: 'dirt-road',
      gravelRoadLayerId: 'gravel-road',
      dirtTrailLayerId: 'dirt-trail',
    });

    expect(plan.mode).toBe('splat');
    expect(plan.classification).toBe('worn-path');
    expect(plan.appearanceProfile.wornCenterStrength).toBeGreaterThanOrEqual(0.22);
    expect(plan.removeSeparateRoadMesh).toBe(true);
    expect(plan.reason).toContain('worn paths can stay on terrain splat layers');
  });

  it('keeps separate overlays for sharper gravel trails that should not widen into splats', () => {
    const plan = createTerrainRouteRenderPlan({
      kind: 'path',
      roadSignal: 0.68,
      dirtRoadLayerId: 'dirt-road',
      gravelRoadLayerId: 'gravel-road',
      gravelTrailLayerId: 'gravel-trail',
    });

    expect(plan.mode).toBe('overlay');
    expect(plan.classification).toBe('overlay-trail');
    expect(plan.removeSeparateRoadMesh).toBe(false);
    expect(plan.requiresSeparateRouteMesh).toBe(true);
  });

  it('keeps geometry fallbacks when bridges or other structures cannot be expressed by splats', () => {
    const plan = createTerrainRouteRenderPlan({
      kind: 'road',
      roadSignal: 0.3,
      bridgeLike: true,
      dirtRoadLayerId: 'dirt-road',
      gravelRoadLayerId: 'gravel-road',
    });

    expect(plan.mode).toBe('geometry');
    expect(plan.classification).toBe('geometry-fallback');
    expect(plan.removeSeparateRoadMesh).toBe(false);
    expect(plan.requiresSeparateRouteMesh).toBe(true);
    expect(plan.geometryPlan.keepBridgeGeometry).toBe(true);
  });
});
