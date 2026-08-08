import { describe, expect, it } from 'vitest';
import {
  buildPlanetTextureGrid,
  getPreviewAuroraBandPath,
  getPreviewLightingProfile,
  getPreviewSunOrbitSpec,
  getPlanetSurfaceColor,
} from './celestial-preview.ts';
import { getDaylightCycleState } from '@bworlds/core';

describe('celestial preview helpers', () => {
  it('maps known overworld kinds to stable planet surface colors', () => {
    expect(getPlanetSurfaceColor('water')).toBe('#1a3d68');
    expect(getPlanetSurfaceColor('plains')).toBe('#6d9954');
    expect(getPlanetSurfaceColor('mountain')).toBe('#8d8579');
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
      ['#1a3d68', '#1a3d68', '#1a3d68', '#1a3d68'],
      ['#8d8579', '#8d8579', '#8d8579', '#6d9954'],
    ]);
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
    expect(midnight.ambientIntensity).toBeGreaterThan(0.8);
    expect(midnight.emissiveIntensity).toBeGreaterThan(noon.emissiveIntensity);
    expect(noon.glowOpacity).toBeGreaterThan(midnight.glowOpacity);
  });
});
