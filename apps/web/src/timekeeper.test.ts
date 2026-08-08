import { describe, expect, it } from 'vitest';
import { getDaylightCycleState } from '@bworlds/core';
import {
  getCelestialDateLabel,
  getCelestialRingStars,
  getDaylightRingLayout,
  getDialAngle,
  getMoonMidnightOrbitProgress,
  getMoonPhaseLabel,
  getMoonOrbitProgress,
  getMoonPhaseSymbol,
  getNightRingStars,
  getTimeWheelWindowLayout,
  getTimeWheelConstellationEntries,
} from './timekeeper.ts';

function normalizeTurnAngle(angle: number) {
  return ((angle + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
}

describe('timekeeper helpers', () => {
  it('builds an outer ring entry for each constellation and marks the active one', () => {
    const cycle = getDaylightCycleState(0);
    const entries = getTimeWheelConstellationEntries(cycle);

    expect(entries).toHaveLength(cycle.constellations.length);
    expect(entries.filter((entry) => entry.isActive)).toHaveLength(1);
  });

  it('formats the displayed date from constellation month and moon week', () => {
    const cycle = getDaylightCycleState(0);
    expect(getCelestialDateLabel(cycle)).toContain(cycle.activeConstellation.name);
    expect(getCelestialDateLabel(cycle)).toContain(cycle.moonPhaseName);
  });

  it('provides symbols for the moon ring phases', () => {
    expect(getMoonPhaseSymbol(0)).toBe('●');
    expect(getMoonPhaseSymbol(4)).toBe('○');
  });

  it('simplifies moon phase labels for the center readout', () => {
    expect(getMoonPhaseLabel(0)).toBe('New');
    expect(getMoonPhaseLabel(2)).toBe('Waxing');
    expect(getMoonPhaseLabel(4)).toBe('Full');
    expect(getMoonPhaseLabel(6)).toBe('Waning');
  });

  it('derives a wrapped moon orbit progress from the cycle angle', () => {
    const cycle = getDaylightCycleState(0);
    const progress = getMoonOrbitProgress(cycle);

    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThan(1);
  });

  it('keeps the moon ring progress stable across hours within the same day', () => {
    const midnight = getDaylightCycleState(0);
    const noon = getDaylightCycleState(120000);

    expect(getMoonMidnightOrbitProgress(noon)).toBe(
      getMoonMidnightOrbitProgress(midnight)
    );
  });

  it('anchors the daylight ring to the current dial position', () => {
    const cycle = getDaylightCycleState(120000);
    const layout = getDaylightRingLayout(cycle);

    expect(layout.dayCenterAngle).toBeCloseTo(-Math.PI / 2, 6);
    expect(normalizeTurnAngle(layout.nightCenterAngle - layout.dayCenterAngle)).toBeCloseTo(
      -Math.PI,
      6
    );
    expect(layout.dawnAngle).toBeCloseTo(
      getDialAngle(cycle.sunriseProgress, cycle.dayProgress),
      6
    );
    expect(layout.duskAngle).toBeCloseTo(
      getDialAngle(cycle.sunsetProgress, cycle.dayProgress),
      6
    );
  });

  it('pins dawn and dusk dividers to the top marker when the selected time is sunrise or sunset', () => {
    const sunriseCycle = getDaylightCycleState(0, {
      dayLengthMs: 240000,
    });
    sunriseCycle.dayProgress = sunriseCycle.sunriseProgress;
    const sunriseLayout = getDaylightRingLayout(sunriseCycle);

    const sunsetCycle = getDaylightCycleState(0, {
      dayLengthMs: 240000,
    });
    sunsetCycle.dayProgress = sunsetCycle.sunsetProgress;
    const sunsetLayout = getDaylightRingLayout(sunsetCycle);

    expect(sunriseLayout.dawnAngle).toBeCloseTo(-Math.PI / 2, 6);
    expect(sunsetLayout.duskAngle).toBeCloseTo(-Math.PI / 2, 6);
  });

  it('keeps night-ring stars on the night half of the dial', () => {
    const cycle = getDaylightCycleState(120000);
    const layout = getDaylightRingLayout(cycle);
    const stars = getNightRingStars(40, 70, layout.dawnAngle, layout.duskAngle);

    expect(stars).toHaveLength(36);
    stars.forEach((star) => {
      expect(star.radius).toBeGreaterThanOrEqual(50.5);
      expect(star.radius).toBeLessThanOrEqual(59.5);
      expect(star.angle).toBeGreaterThanOrEqual(layout.duskAngle);
      expect(star.angle).toBeLessThanOrEqual(layout.dawnAngle + Math.PI * 2);
    });
  });

  it('adds faint background stars to the celestial ring', () => {
    const stars = getCelestialRingStars(100, 140);

    expect(stars).toHaveLength(28);
    stars.forEach((star) => {
      expect(Math.hypot(star.x, star.y)).toBeGreaterThanOrEqual(104.8);
      expect(Math.hypot(star.x, star.y)).toBeLessThanOrEqual(135.2);
      expect(star.color).toContain('rgba(');
    });
  });

  it('raises the time readout and shifts the window glyphs left for alignment', () => {
    const layout = getTimeWheelWindowLayout(80, 112);

    expect(layout.timeY).toBeLessThan(0);
    expect(layout.constellationGlyphX).toBeLessThan(layout.constellationNameX);
    expect(layout.moonPhaseSymbolX).toBeLessThan(layout.moonPhaseLabelX);
    expect(layout.constellationGlyphY).toBeLessThan(layout.constellationNameY);
  });
});
