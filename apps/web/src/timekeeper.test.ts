import { describe, expect, it } from 'vitest';
import { getDaylightCycleState } from '@bworlds/core';
import {
  getCelestialDateLabel,
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
});
