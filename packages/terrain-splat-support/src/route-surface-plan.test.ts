import { describe, expect, it } from 'vitest';
import { createTerrainRouteSurfacePlan } from './route-surface-plan.ts';

describe('terrain route surface plan', () => {
  it('keeps broad roads in splats by default', () => {
    const plan = createTerrainRouteSurfacePlan({
      kind: 'road',
      roadSignal: 0.2,
      dirtRoadLayerId: 'dirt-road',
      gravelRoadLayerId: 'gravel-road',
    });

    expect(plan).toEqual({
      mode: 'splat',
      surfaceType: 'broad-dirt-road',
      layerId: 'dirt-road',
      overlayWidth: 0,
      shoulderBlendWidth: 0.32,
      reason: 'broad roads stay in terrain splats by default',
    });
  });

  it('selects the gravel road layer when road intensity is high', () => {
    const plan = createTerrainRouteSurfacePlan({
      kind: 'road',
      roadSignal: 0.8,
      dirtRoadLayerId: 'dirt-road',
      gravelRoadLayerId: 'gravel-road',
    });

    expect(plan.surfaceType).toBe('broad-gravel-road');
    expect(plan.layerId).toBe('gravel-road');
    expect(plan.mode).toBe('splat');
  });

  it('uses overlays for narrow trails and falls back to road layers when no dedicated trail layer exists', () => {
    const plan = createTerrainRouteSurfacePlan({
      kind: 'path',
      roadSignal: 0.1,
      dirtRoadLayerId: 'dirt-road',
      gravelRoadLayerId: 'gravel-road',
    });

    expect(plan).toEqual({
      mode: 'overlay',
      surfaceType: 'narrow-dirt-trail',
      layerId: 'dirt-road',
      overlayWidth: 0.18,
      shoulderBlendWidth: 0.12,
      reason:
        'narrow trails render as overlays to avoid over-widening terrain splats',
    });
  });

  it('can use dedicated gravel trail layers for higher-signal paths', () => {
    const plan = createTerrainRouteSurfacePlan({
      kind: 'path',
      roadSignal: 0.7,
      dirtRoadLayerId: 'dirt-road',
      gravelRoadLayerId: 'gravel-road',
      dirtTrailLayerId: 'dirt-trail',
      gravelTrailLayerId: 'gravel-trail',
    });

    expect(plan.mode).toBe('overlay');
    expect(plan.surfaceType).toBe('narrow-gravel-trail');
    expect(plan.layerId).toBe('gravel-trail');
  });

  it('can force broad roads onto overlays when an explicit renderer path needs that mode', () => {
    const plan = createTerrainRouteSurfacePlan({
      kind: 'road',
      roadSignal: 0.5,
      prefersOverlay: true,
      dirtRoadLayerId: 'dirt-road',
      gravelRoadLayerId: 'gravel-road',
    });

    expect(plan.mode).toBe('overlay');
    expect(plan.overlayWidth).toBe(0.3);
    expect(plan.reason).toBe('road requested overlay rendering explicitly');
  });

  it('returns a no-op plan for unrelated terrain kinds', () => {
    const plan = createTerrainRouteSurfacePlan({
      kind: 'forest',
      roadSignal: 0.9,
      dirtRoadLayerId: 'dirt-road',
      gravelRoadLayerId: 'gravel-road',
    });

    expect(plan.mode).toBe('none');
    expect(plan.layerId).toBeNull();
    expect(plan.surfaceType).toBe('none');
  });
});
