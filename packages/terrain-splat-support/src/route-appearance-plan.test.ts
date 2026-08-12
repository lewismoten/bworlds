import { describe, expect, it } from 'vitest';
import { resolveTerrainRouteAppearanceProfile } from './route-appearance-plan.ts';

describe('terrain route appearance plan', () => {
  it('lets traffic intensity increase wear and wheel rut variation on dirt roads', () => {
    const light = resolveTerrainRouteAppearanceProfile({
      kind: 'road',
      surfaceType: 'broad-dirt-road',
      trafficIntensity: 0.18,
    });
    const heavy = resolveTerrainRouteAppearanceProfile({
      kind: 'road',
      surfaceType: 'broad-dirt-road',
      trafficIntensity: 0.86,
    });

    expect(heavy.wearStrength).toBeGreaterThan(light.wearStrength);
    expect(heavy.wheelRutStrength).toBeGreaterThan(light.wheelRutStrength);
    expect(heavy.edgeGrassStrength).toBeLessThan(light.edgeGrassStrength);
  });

  it('emphasizes worn centers on busy paths while preserving more edge grass on light trails', () => {
    const lightTrail = resolveTerrainRouteAppearanceProfile({
      kind: 'path',
      surfaceType: 'narrow-grass-trail',
      trafficIntensity: 0.12,
    });
    const busyTrail = resolveTerrainRouteAppearanceProfile({
      kind: 'path',
      surfaceType: 'narrow-dirt-trail',
      trafficIntensity: 0.78,
    });

    expect(busyTrail.wornCenterStrength).toBeGreaterThan(
      lightTrail.wornCenterStrength
    );
    expect(lightTrail.edgeGrassStrength).toBeGreaterThan(
      busyTrail.edgeGrassStrength
    );
  });

  it('lets weather increase wetness and mud on dirt-like routes', () => {
    const dry = resolveTerrainRouteAppearanceProfile({
      kind: 'road',
      surfaceType: 'broad-dirt-road',
      trafficIntensity: 0.6,
    });
    const rainy = resolveTerrainRouteAppearanceProfile({
      kind: 'road',
      surfaceType: 'broad-dirt-road',
      trafficIntensity: 0.6,
      sustainedWetness: 0.48,
      weather: {
        kind: 'heavy-rain',
        intensity: 0.72,
        precipitation: 0.76,
        temperature: 0.62,
      },
    });

    expect(rainy.wetness).toBeGreaterThan(dry.wetness);
    expect(rainy.mudStrength).toBeGreaterThan(dry.mudStrength);
    expect(rainy.roughnessMultiplier).toBeLessThan(dry.roughnessMultiplier);
  });

  it('lets snow partially cover route splat layers without removing all route identity', () => {
    const snowy = resolveTerrainRouteAppearanceProfile({
      kind: 'road',
      surfaceType: 'broad-gravel-road',
      trafficIntensity: 0.54,
      snowAccumulation: 0.34,
      weather: {
        kind: 'snow',
        intensity: 0.64,
        precipitation: 0.7,
        temperature: 0.08,
      },
    });

    expect(snowy.snowCoverStrength).toBeGreaterThan(0);
    expect(snowy.snowCoverStrength).toBeLessThan(1);
    expect(snowy.reason).toMatch(/snow cover/i);
  });

  it('keeps gravel and stone roads from exaggerating dirt-road ruts', () => {
    const gravel = resolveTerrainRouteAppearanceProfile({
      kind: 'road',
      surfaceType: 'broad-gravel-road',
      trafficIntensity: 0.82,
      weather: {
        kind: 'light-rain',
        intensity: 0.6,
        precipitation: 0.58,
        temperature: 0.6,
      },
    });
    const dirt = resolveTerrainRouteAppearanceProfile({
      kind: 'road',
      surfaceType: 'broad-dirt-road',
      trafficIntensity: 0.82,
      weather: {
        kind: 'light-rain',
        intensity: 0.6,
        precipitation: 0.58,
        temperature: 0.6,
      },
    });

    expect(gravel.wheelRutStrength).toBe(0);
    expect(dirt.wheelRutStrength).toBeGreaterThan(0);
    expect(gravel.mudStrength).toBeLessThan(dirt.mudStrength);
  });
});
