import { describe, expect, it } from 'vitest';
import { getDaylightCycleState } from '@bworlds/core';
import {
  getCelestialDateLabel,
  getMoonOrbitProgress,
  getMoonPhaseSymbol,
  getTimeWheelConstellationEntries,
} from './timekeeper.ts';

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

  it('derives a wrapped moon orbit progress from the cycle angle', () => {
    const cycle = getDaylightCycleState(0);
    const progress = getMoonOrbitProgress(cycle);

    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThan(1);
  });
});
