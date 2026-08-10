import { describe, expect, it } from 'vitest';
import {
  brightenPreviewSurfaceColor,
  buildPlanetTextureGrid,
  getCelestialPreviewFrameSignature,
  getCelestialPreviewSceneSignatures,
  getPreviewConstellationRenderState,
  getPreviewEventRenderState,
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
  resolvePreviewKindSampler,
  resolvePreviewSampler,
} from './celestial-preview.ts';
import { DEFAULT_DAY_LENGTH_MS, getDaylightCycleState } from '@bworlds/core';

type PreviewLightingCycleLike = Parameters<typeof getPreviewLightingProfile>[0];
type PreviewShadowCycleLike = Parameters<typeof getPreviewShadowProfile>[0];
type PreviewSceneCycleLike = Parameters<
  typeof getCelestialPreviewSceneSignatures
>[0];

function makePreviewLightingCycle(
  overrides: Partial<PreviewLightingCycleLike>
): PreviewLightingCycleLike {
  return {
    daylight: 0,
    night: 0,
    starsOpacity: 0,
    ...overrides,
  };
}

function makePreviewShadowCycle(
  overrides: Partial<PreviewShadowCycleLike>
): PreviewShadowCycleLike {
  return {
    daylight: 0,
    sunAltitude: 0,
    ...overrides,
  };
}

function clonePreviewSceneCycle(
  cycle: PreviewSceneCycleLike,
  overrides: Partial<PreviewSceneCycleLike>
): PreviewSceneCycleLike {
  return {
    ...cycle,
    ...overrides,
  };
}

describe('celestial preview helpers', () => {
  it('maps known overworld kinds to stable planet surface colors', () => {
    expect(getPlanetSurfaceColor('water')).toBe('#1a3d68');
    expect(getPlanetSurfaceColor('plains')).toBe('#6d9954');
    expect(getPlanetSurfaceColor('mountain')).toBe('#8d8579');
    expect(brightenPreviewSurfaceColor('#1a3d68')).toBe('#35547a');
  });

  it('builds a deterministic low-resolution texture grid from overworld samples', () => {
    const grid = buildPlanetTextureGrid(
      (x, y) => {
        if (y > 0) {
          return 'water';
        }
        if (x > 0) {
          return 'plains';
        }
        return 'mountain';
      },
      4,
      2
    );

    expect(grid).toEqual([
      ['#35547a', '#35547a', '#35547a', '#35547a'],
      ['#9b9489', '#9b9489', '#9b9489', '#7fa569'],
    ]);
  });

  it('falls back to ocean shading when the preview sampler is temporarily unavailable', () => {
    const grid = buildPlanetTextureGrid(
      () => {
        throw new Error('map not ready');
      },
      2,
      1
    );

    expect(grid).toEqual([['#35547a', '#35547a']]);
  });

  it('binds legacy-style sampler methods before building the preview texture', () => {
    const sampler = {
      getMap() {
        return {
          getTile(x: number, y: number) {
            return { kind: x >= 0 && y >= 0 ? 'plains' : 'water' };
          },
        };
      },
      sampleOverworld(x: number, y: number) {
        return this.getMap().getTile(x, y);
      },
    };

    const sampleOverworld = resolvePreviewSampler(sampler);
    const sampleSurfaceKind = resolvePreviewKindSampler(sampler);

    expect(sampleOverworld).not.toBeNull();
    expect(sampleSurfaceKind).not.toBeNull();
    expect(buildPlanetTextureGrid(sampleSurfaceKind!, 2, 1)).toEqual([
      ['#35547a', '#7fa569'],
    ]);
  });

  it('prefers lightweight preview surface kind samplers when available', () => {
    const sampleOverworld = resolvePreviewSampler({
      sampleOverworld() {
        return { kind: 'mountain' };
      },
      samplePreviewOverworld() {
        return { kind: 'forest' };
      },
      samplePreviewSurfaceKind() {
        return 'plains';
      },
    });
    const sampleSurfaceKind = resolvePreviewKindSampler({
      sampleOverworld() {
        return { kind: 'mountain' };
      },
      samplePreviewOverworld() {
        return { kind: 'forest' };
      },
      samplePreviewSurfaceKind() {
        return 'plains';
      },
    });

    expect(sampleOverworld).not.toBeNull();
    expect(sampleSurfaceKind).not.toBeNull();
    expect(buildPlanetTextureGrid(sampleSurfaceKind!, 1, 1)).toEqual([
      ['#7fa569'],
    ]);
  });

  it('describes a full sun orbit plus the daylight arc for the preview model', () => {
    const cycle = getDaylightCycleState(0);
    const orbit = getPreviewSunOrbitSpec(cycle);

    expect(orbit.radius).toBe(10);
    expect(orbit.altitude).toBeCloseTo(0.04, 6);
    expect(orbit.daylightStartAzimuth).toBeCloseTo(cycle.sunriseAzimuth, 6);
    expect(orbit.daylightEndAzimuth).toBeCloseTo(cycle.sunsetAzimuth, 6);
    expect(orbit.fullEndAzimuth - orbit.fullStartAzimuth).toBeCloseTo(
      Math.PI * 2,
      6
    );
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

  it('derives stable pooled preview constellation render states from the visible ring', () => {
    const cycle = getDaylightCycleState(120000, {
      observerLatitudeDegrees: 24,
    });
    const state = getPreviewConstellationRenderState(cycle);

    expect(state.lines.length).toBeGreaterThan(0);
    expect(state.stars.length).toBeGreaterThan(0);
    expect(state.lines[0]).toEqual(
      expect.objectContaining({
        start: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          z: expect.any(Number),
        }),
        end: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          z: expect.any(Number),
        }),
        opacity: expect.any(Number),
        visible: expect.any(Boolean),
      })
    );
    expect(state.stars[0]).toEqual(
      expect.objectContaining({
        position: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          z: expect.any(Number),
        }),
        scale: expect.any(Number),
        opacity: expect.any(Number),
        visible: expect.any(Boolean),
      })
    );
  });

  it('changes preview constellation positions seasonally without changing pool cardinality', () => {
    const cycle = getDaylightCycleState(120000, {
      observerLatitudeDegrees: 24,
    });
    const shiftedCycle = clonePreviewSceneCycle(cycle, {
      ...cycle,
      yearProgress: cycle.yearProgress + 0.12,
    });
    const baseState = getPreviewConstellationRenderState(cycle);
    const shiftedState = getPreviewConstellationRenderState(shiftedCycle);

    expect(shiftedState.lines).toHaveLength(baseState.lines.length);
    expect(shiftedState.stars).toHaveLength(baseState.stars.length);
    expect(shiftedState.lines[0]?.start.x).not.toBeCloseTo(
      baseState.lines[0]?.start.x ?? 0,
      6
    );
    expect(shiftedState.stars[0]?.position.z).not.toBeCloseTo(
      baseState.stars[0]?.position.z ?? 0,
      6
    );
  });

  it('derives preview event marker and line states for comet and meteor layers', () => {
    const cycle = {
      ...getDaylightCycleState(120000, {
        observerLatitudeDegrees: 24,
      }),
      visibleEvents: [
        {
          type: 'meteor-shower' as const,
          name: 'Burst',
          progress: 0.2,
          intensity: 0.8,
          visibility: 0.9,
          azimuth: -0.5,
          altitude: 0.3,
          color: '#dff4ff',
          size: 0.3,
          trailLength: 2.4,
        },
        {
          type: 'comet' as const,
          name: 'Guest',
          progress: 0.5,
          intensity: 0.7,
          visibility: 0.85,
          azimuth: 1.1,
          altitude: 0.22,
          color: '#dff6ff',
          size: 0.48,
          trailLength: 2.8,
        },
      ],
    };

    const state = getPreviewEventRenderState(cycle);

    expect(state.markers).toHaveLength(2);
    expect(state.lines.length).toBeGreaterThanOrEqual(5);
    expect(state.markers[0]).toEqual(
      expect.objectContaining({
        color: '#dff4ff',
        scale: expect.any(Number),
        opacity: expect.any(Number),
        visible: true,
      })
    );
    expect(state.lines[0]).toEqual(
      expect.objectContaining({
        start: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          z: expect.any(Number),
        }),
        end: expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          z: expect.any(Number),
        }),
        color: expect.any(String),
        opacity: expect.any(Number),
        visible: expect.any(Boolean),
      })
    );
  });

  it('keeps the preview planet readable at night while still brightening in daylight', () => {
    const noon = getPreviewLightingProfile(
      makePreviewLightingCycle({
        daylight: 1,
        night: 0,
        starsOpacity: 0,
      })
    );
    const midnight = getPreviewLightingProfile(
      makePreviewLightingCycle({
        daylight: 0,
        night: 1,
        starsOpacity: 1,
      })
    );

    expect(noon.sunIntensity).toBeGreaterThan(midnight.sunIntensity);
    expect(midnight.ambientIntensity).toBeGreaterThan(1);
    expect(noon.hemisphereIntensity).toBeGreaterThan(
      midnight.hemisphereIntensity
    );
    expect(midnight.emissiveIntensity).toBeGreaterThan(noon.emissiveIntensity);
    expect(noon.sunFillIntensity).toBeGreaterThan(midnight.sunFillIntensity);
    expect(noon.bounceFillIntensity).toBeGreaterThan(
      midnight.bounceFillIntensity
    );
    expect(noon.sunGlowOpacity).toBeGreaterThan(midnight.sunGlowOpacity);
    expect(midnight.moonEmissiveIntensity).toBeGreaterThan(
      noon.moonEmissiveIntensity
    );
    expect(noon.glowOpacity).toBeGreaterThan(midnight.glowOpacity);
  });

  it('dims preview sunlight during a solar eclipse without collapsing ambient fill', () => {
    const clearDay = getPreviewLightingProfile(
      makePreviewLightingCycle({
        daylight: 0.9,
        night: 0.02,
        starsOpacity: 0.04,
      })
    );
    const eclipseDay = getPreviewLightingProfile(
      makePreviewLightingCycle({
        daylight: 0.42,
        night: 0.22,
        starsOpacity: 0.28,
        solarEclipse: {
          active: true,
          coverage: 0.9,
          totality: 0.82,
          daylightReduction: 0.72,
          moonAzimuth: 0,
          moonAltitude: 0.5,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
        },
      })
    );

    expect(eclipseDay.sunIntensity).toBeLessThan(clearDay.sunIntensity);
    expect(eclipseDay.sunFillIntensity).toBeLessThan(clearDay.sunFillIntensity);
    expect(eclipseDay.ambientIntensity).toBeGreaterThan(1);
    expect(eclipseDay.sunGlowOpacity).toBeLessThan(clearDay.sunGlowOpacity);
  });

  it('keeps preview shadows active when the sun is above or near the horizon', () => {
    const daylightShadow = getPreviewShadowProfile(
      makePreviewShadowCycle({
        daylight: 0.4,
        sunAltitude: 0.2,
      })
    );
    const nightShadow = getPreviewShadowProfile(
      makePreviewShadowCycle({
        daylight: 0,
        sunAltitude: -0.2,
      })
    );

    expect(daylightShadow.sunCastShadow).toBe(true);
    expect(daylightShadow.cameraExtent).toBeGreaterThanOrEqual(13);
    expect(daylightShadow.mapSize).toBeGreaterThanOrEqual(1536);
    expect(daylightShadow.bias).toBeLessThan(0);
    expect(daylightShadow.normalBias).toBeGreaterThan(0);
    expect(daylightShadow.radius).toBeGreaterThan(2);
    expect(nightShadow.sunCastShadow).toBe(false);
  });

  it('keeps the preview planet dark side readable without flattening day-side contrast', () => {
    const noon = getPreviewPlanetLightBalance(
      makePreviewLightingCycle({
        daylight: 1,
        night: 0,
        starsOpacity: 0,
      })
    );
    const midnight = getPreviewPlanetLightBalance(
      makePreviewLightingCycle({
        daylight: 0,
        night: 1,
        starsOpacity: 1,
      })
    );

    expect(midnight.darkSideLight).toBeGreaterThan(1.8);
    expect(noon.daySideLight).toBeGreaterThan(midnight.daySideLight);
    expect(noon.contrastRatio).toBeGreaterThan(1.4);
    expect(noon.daySideLight).toBeLessThan(7);
  });

  it('positions the preview sun rig and keeps the moon inside a generous shadow volume', () => {
    const cycle = getDaylightCycleState(DEFAULT_DAY_LENGTH_MS / 2, {
      dayLengthMs: DEFAULT_DAY_LENGTH_MS,
    });
    const rig = getPreviewLightRigState(cycle);

    expect(rig.sun.y).toBeGreaterThan(0);
    expect(rig.lighting.sunIntensity).toBeGreaterThan(1);
    expect(Math.abs(rig.moon.x)).toBeLessThanOrEqual(10.8);
    expect(Math.abs(rig.moon.y)).toBeLessThanOrEqual(10.8);
    expect(rig.shadowProfile.cameraExtent).toBeGreaterThanOrEqual(14);
  });

  it('keeps the world center and moon inside the configured sun shadow frustum', () => {
    const cycle = getDaylightCycleState(DEFAULT_DAY_LENGTH_MS / 2, {
      dayLengthMs: DEFAULT_DAY_LENGTH_MS,
    });
    const coverage = getPreviewSunShadowCoverageState(cycle);

    expect(coverage.worldWithinShadow).toBe(true);
    expect(coverage.moonWithinShadow).toBe(true);
    expect(coverage.shadowProfile.sunCastShadow).toBe(true);
  });

  it('uses the planet texture itself as a low-level emissive fill source', () => {
    const grid = buildPlanetTextureGrid(() => 'forest', 1, 1);

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
    const nearCycle = clonePreviewSceneCycle(cycle, {
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
    });
    const farCycle = clonePreviewSceneCycle(cycle, {
      ...cycle,
      yearProgress: cycle.yearProgress + 0.04,
    });

    expect(getCelestialPreviewSceneSignatures(nearCycle)).toEqual(
      getCelestialPreviewSceneSignatures(cycle)
    );
    expect(
      getCelestialPreviewSceneSignatures(farCycle).constellations
    ).not.toBe(getCelestialPreviewSceneSignatures(cycle).constellations);
  });

  it('uses coarse frame signatures so tiny lighting drifts do not redraw the preview every frame', () => {
    const cycle = getDaylightCycleState(120000, {
      observerLatitudeDegrees: 24,
    });
    const nearCycle = clonePreviewSceneCycle(cycle, {
      ...cycle,
      sunAzimuth: cycle.sunAzimuth + 0.01,
      sunAltitude: cycle.sunAltitude + 0.003,
      moonAltitude: cycle.moonAltitude + 0.002,
      starsOpacity: Math.min(1, cycle.starsOpacity + 0.01),
    });
    const farCycle = clonePreviewSceneCycle(cycle, {
      ...cycle,
      sunAzimuth: cycle.sunAzimuth + 0.08,
    });

    expect(getCelestialPreviewFrameSignature(nearCycle, 0.2, true)).toBe(
      getCelestialPreviewFrameSignature(cycle, 0.2, true)
    );
    expect(getCelestialPreviewFrameSignature(cycle, 0.2, true)).not.toBe(
      getCelestialPreviewFrameSignature(farCycle, 0.2, true)
    );
    expect(getCelestialPreviewFrameSignature(cycle, 0.2, true)).not.toBe(
      getCelestialPreviewFrameSignature(cycle, 0.5, true)
    );
  });
});
