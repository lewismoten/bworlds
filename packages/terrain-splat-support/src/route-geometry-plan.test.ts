import { describe, expect, it } from 'vitest';
import { createTerrainRouteGeometryPlan } from './route-geometry-plan.ts';

describe('terrain route geometry plan', () => {
  it('keeps bridges on separate geometry instead of the splat path', () => {
    const plan = createTerrainRouteGeometryPlan({
      kind: 'bridge',
    });

    expect(plan).toEqual({
      mode: 'geometry',
      needsRoadGeometryFallback: false,
      keepBridgeGeometry: true,
      keepTunnelGeometry: false,
      keepCausewayGeometry: false,
      keepStairsGeometry: false,
      keepRetainingWallGeometry: false,
      reason: 'bridge-structure',
    });
  });

  it('keeps tunnels and raised causeways on geometry when splats cannot express the structure', () => {
    const tunnel = createTerrainRouteGeometryPlan({
      kind: 'road',
      tunnelLike: true,
    });
    const causeway = createTerrainRouteGeometryPlan({
      kind: 'road',
      surfaceHeightDelta: 0.4,
    });

    expect(tunnel.keepTunnelGeometry).toBe(true);
    expect(tunnel.mode).toBe('geometry');
    expect(tunnel.reason).toBe('tunnel-structure');
    expect(causeway.keepCausewayGeometry).toBe(true);
    expect(causeway.reason).toBe('raised-causeway');
  });

  it('keeps stairs and retaining walls on geometry when actual elevation structures are required', () => {
    const stairs = createTerrainRouteGeometryPlan({
      kind: 'stairsUp',
    });
    const retainingWall = createTerrainRouteGeometryPlan({
      kind: 'road',
      retainingWallHeight: 0.24,
    });

    expect(stairs.keepStairsGeometry).toBe(true);
    expect(stairs.reason).toBe('stairs-required');
    expect(retainingWall.keepRetainingWallGeometry).toBe(true);
    expect(retainingWall.reason).toBe('retaining-wall-required');
  });

  it('requests a road geometry fallback for unsupported route shapes', () => {
    const plan = createTerrainRouteGeometryPlan({
      kind: 'road',
      unsupportedShape: true,
    });

    expect(plan.mode).toBe('geometry');
    expect(plan.needsRoadGeometryFallback).toBe(true);
    expect(plan.reason).toBe('unsupported-route-case');
  });

  it('keeps flat ordinary roads and paths on the splat path', () => {
    const road = createTerrainRouteGeometryPlan({
      kind: 'road',
      surfaceHeightDelta: 0.08,
    });
    const path = createTerrainRouteGeometryPlan({
      kind: 'path',
      surfaceHeightDelta: 0.02,
    });

    expect(road.mode).toBe('splat');
    expect(path.mode).toBe('splat');
    expect(road.reason).toBe('flat-route-splat-supported');
    expect(path.reason).toBe('flat-route-splat-supported');
  });
});
