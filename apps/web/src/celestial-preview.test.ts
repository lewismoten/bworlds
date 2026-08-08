import { describe, expect, it } from 'vitest';
import {
  buildPlanetTextureGrid,
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
});
