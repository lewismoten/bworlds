import { describe, expect, it } from 'vitest';
import {
  brightenPreviewSurfaceColor,
  buildPlanetTextureGrid,
  getCelestialPreviewSceneSignatures,
  getPreviewAuroraBandPath,
  getPreviewBodyPosition,
  getPreviewFacingArrowState,
  getPreviewLightingProfile,
  getPreviewLightRigState,
  getPreviewPlanetLightBalance,
  getPreviewRootPitch,
  getPreviewShadowProfile,
  getPreviewSunShadowCoverageState,
  getPreviewSunOrbitSpec,
  getPlanetSurfaceColor,
} from './celestial-preview.ts';
import { getDaylightCycleState } from '@bworlds/core';

describe('celestial preview helpers', () => {
  it('maps known overworld kinds to stable planet surface colors', () => {
    expect(getPlanetSurfaceColor('water')).toBe('#1a3d68');
    expect(getPlanetSurfaceColor('plains')).toBe('#6d9954');
    expect(getPlanetSurfaceColor('mountain')).toBe('#8d8579');
    expect(brightenPreviewSurfaceColor('#1a3d68')).toBe('#35547a');
  });

  it('builds a deterministic low-resolution texture grid from overworld samples', () => {
    const grid = buildPlanetTextureGrid((x, y) => {
      if (y > 0) {
        return { kind: 'water' };
      }
      if (x > 0) {
        return { kind: 'plains' };
      }
      return { kind: 'mountain' };
    }, 4, 2);

    expect(grid).toEqual([
      ['#35547a', '#35547a', '#35547a', '#35547a'],
      ['#9b9489', '#9b9489', '#9b9489', '#7fa569'],
    ]);
  });

  it('falls back to ocean shading when the preview sampler is temporarily unavailable', () => {
    const grid = buildPlanetTextureGrid(() => {
      throw new Error('map not ready');
    }, 2, 1);

    expect(grid).toEqual([['#35547a', '#35547a']]);
  });

  it('describes a full sun orbit plus the daylight arc for the preview model', () => {
    const cycle = getDaylightCycleState(0);
    const orbit = getPreviewSunOrbitSpec(cycle);

    expect(orbit.radius).toBe(10);
    expect(orbit.altitude).toBeCloseTo(0.04, 6);
    expect(orbit.daylightStartAzimuth).toBeCloseTo(cycle.sunriseAzimuth, 6);
    expect(orbit.daylightEndAzimuth).toBeCloseTo(cycle.sunsetAzimuth, 6);
    expect(orbit.fullEndAzimuth - orbit.fullStartAzimuth).toBeCloseTo(Math.PI * 2, 6);
  });

  it('builds a stable aurora path for the preview model', () => {
    const points = getPreviewAuroraBandPath({
      azimuthCenter: Math.PI / 3,
      span: 0.9,
      altitude: 0.28,
      height: 0.2,
      wavePhase: 0.125,
    });

    expect(points).toHaveLength(21);
    expect(points[0]).toEqual(
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
        z: expect.any(Number),
      })
    );
    expect(points[10].y).not.toBeCloseTo(points[0].y, 4);
  });

  it('keeps the preview planet readable at night while still brightening in daylight', () => {
    const noon = getPreviewLightingProfile({
      daylight: 1,
      night: 0,
      starsOpacity: 0,
    } as any);
    const midnight = getPreviewLightingProfile({
      daylight: 0,
      night: 1,
      starsOpacity: 1,
    } as any);

    expect(noon.sunIntensity).toBeGreaterThan(midnight.sunIntensity);
    expect(midnight.ambientIntensity).toBeGreaterThan(1);
    expect(noon.hemisphereIntensity).toBeGreaterThan(midnight.hemisphereIntensity);
    expect(midnight.emissiveIntensity).toBeGreaterThan(noon.emissiveIntensity);
    expect(noon.sunFillIntensity).toBeGreaterThan(midnight.sunFillIntensity);
    expect(noon.bounceFillIntensity).toBeGreaterThan(midnight.bounceFillIntensity);
    expect(noon.sunGlowOpacity).toBeGreaterThan(midnight.sunGlowOpacity);
    expect(midnight.moonEmissiveIntensity).toBeGreaterThan(noon.moonEmissiveIntensity);
    expect(noon.glowOpacity).toBeGreaterThan(midnight.glowOpacity);
  });

  it('keeps preview shadows active when the sun is above or near the horizon', () => {
    const daylightShadow = getPreviewShadowProfile({
      daylight: 0.4,
      sunAltitude: 0.2,
    } as any);
    const nightShadow = getPreviewShadowProfile({
      daylight: 0,
      sunAltitude: -0.2,
    } as any);

    expect(daylightShadow.sunCastShadow).toBe(true);
    expect(daylightShadow.cameraExtent).toBeGreaterThanOrEqual(13);
    expect(daylightShadow.mapSize).toBeGreaterThanOrEqual(1536);
    expect(daylightShadow.bias).toBeLessThan(0);
    expect(daylightShadow.normalBias).toBeGreaterThan(0);
    expect(daylightShadow.radius).toBeGreaterThan(2);
    expect(nightShadow.sunCastShadow).toBe(false);
  });

  it('keeps the preview planet dark side readable without flattening day-side contrast', () => {
    const noon = getPreviewPlanetLightBalance({
      daylight: 1,
      night: 0,
      starsOpacity: 0,
    } as any);
    const midnight = getPreviewPlanetLightBalance({
      daylight: 0,
      night: 1,
      starsOpacity: 1,
    } as any);

    expect(midnight.darkSideLight).toBeGreaterThan(1.8);
    expect(noon.daySideLight).toBeGreaterThan(midnight.daySideLight);
    expect(noon.contrastRatio).toBeGreaterThan(1.4);
    expect(noon.daySideLight).toBeLessThan(7);
  });

  it('positions the preview sun rig and keeps the moon inside a generous shadow volume', () => {
    const cycle = getDaylightCycleState(120000);
    const rig = getPreviewLightRigState(cycle);

    expect(rig.sun.y).toBeGreaterThan(0);
    expect(rig.lighting.sunIntensity).toBeGreaterThan(1);
    expect(Math.abs(rig.moon.x)).toBeLessThanOrEqual(10.8);
    expect(Math.abs(rig.moon.y)).toBeLessThanOrEqual(10.8);
    expect(rig.shadowProfile.cameraExtent).toBeGreaterThanOrEqual(14);
  });

  it('keeps the world center and moon inside the configured sun shadow frustum', () => {
    const cycle = getDaylightCycleState(120000);
    const coverage = getPreviewSunShadowCoverageState(cycle);

    expect(coverage.worldWithinShadow).toBe(true);
    expect(coverage.moonWithinShadow).toBe(true);
    expect(coverage.shadowProfile.sunCastShadow).toBe(true);
  });

  it('uses the planet texture itself as a low-level emissive fill source', () => {
    const grid = buildPlanetTextureGrid(
      () => ({ kind: 'forest' }),
      1,
      1
    );

    expect(grid[0][0]).toBe('#557c5a');
  });

  it('maps body azimuth and altitude into stable preview coordinates', () => {
    const east = getPreviewBodyPosition(0, 0.25, 9.8);
    const north = getPreviewBodyPosition(-Math.PI / 2, 0.1, 10.8);

    expect(east.x).toBeCloseTo(9.8, 6);
    expect(Math.abs(east.z)).toBeLessThan(0.001);
    expect(Math.abs(north.x)).toBeLessThan(0.001);
    expect(north.z).toBeLessThan(0);
    expect(north.y).toBeCloseTo(0.52, 6);
  });

  it('moves the facing marker without rotating the whole preview root by player heading', () => {
    const east = getPreviewFacingArrowState(0);
    const north = getPreviewFacingArrowState(-Math.PI / 2);

    expect(east.x).toBeGreaterThan(0);
    expect(Math.abs(east.z)).toBeLessThan(0.001);
    expect(Math.abs(north.x)).toBeLessThan(0.001);
    expect(north.z).toBeLessThan(0);
    expect(getPreviewRootPitch(24, 0.2)).toBeCloseTo(
      (-24 / 180) * Math.PI * 0.45 + 0.2,
      6
    );
  });

  it('uses coarse preview signatures so tiny celestial drifts do not rebuild every layer', () => {
    const cycle = getDaylightCycleState(120000, {
      observerLatitudeDegrees: 24,
    });
    const nearCycle = {
      ...cycle,
      yearProgress: cycle.yearProgress + 0.0002,
      visibleEvents: (cycle.visibleEvents ?? []).map((event) => ({
        ...event,
        azimuth: event.azimuth + 0.002,
      })),
      auroraBands: (cycle.auroraBands ?? []).map((band) => ({
        ...band,
        wavePhase: band.wavePhase + 0.01,
      })),
    } as any;
    const farCycle = {
      ...cycle,
      yearProgress: cycle.yearProgress + 0.04,
    } as any;

    expect(getCelestialPreviewSceneSignatures(nearCycle)).toEqual(
      getCelestialPreviewSceneSignatures(cycle as any)
    );
    expect(getCelestialPreviewSceneSignatures(farCycle).constellations).not.toBe(
      getCelestialPreviewSceneSignatures(cycle as any).constellations
    );
  });
});
