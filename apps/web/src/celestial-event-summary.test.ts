import { describe, expect, it } from 'vitest';

import {
  describeActiveCelestialEvents,
  getActiveCelestialEventDetails,
  summarizeCelestialEvents,
} from './celestial-event-summary.ts';

describe('celestial event summary', () => {
  it('summarizes active aurora, meteor, comet, and eclipse state in one pass', () => {
    const summary = summarizeCelestialEvents({
      auroraBands: [
        { intensity: 0.04 },
        { intensity: 0.01 },
        { intensity: 0.2 },
      ],
      visibleEvents: [
        { type: 'meteor-shower', visibility: 0.2 },
        { type: 'comet', visibility: 0.5 },
        { type: 'meteor-shower', visibility: 0.04 },
        { type: 'comet', visibility: 0.01 },
      ],
      solarEclipse: {
        active: true,
        coverage: 0.42,
      },
    });

    expect(summary).toEqual({
      auroraCount: 2,
      meteorCount: 2,
      cometCount: 1,
      eclipseCoverage: 0.42,
    });
    expect(describeActiveCelestialEvents(summary)).toBe(
      'Aurora active • Meteor shower visible • Solar eclipse active • Comet visible'
    );
    expect(getActiveCelestialEventDetails(summary)).toEqual([
      { kind: 'aurora', label: '2 aurora bands' },
      { kind: 'meteor-shower', label: '2 meteor streams' },
      { kind: 'comet', label: '1 comet trail' },
      { kind: 'eclipse', label: 'Eclipse 42%' },
    ]);
  });

  it('returns the fallback detail and label when nothing active is visible', () => {
    const summary = summarizeCelestialEvents({
      auroraBands: [{ intensity: 0.02 }],
      visibleEvents: [{ type: 'meteor-shower', visibility: 0.02 }],
      solarEclipse: {
        active: false,
        coverage: 0.9,
      },
    });

    expect(describeActiveCelestialEvents(summary)).toBe('No active events');
    expect(getActiveCelestialEventDetails(summary)).toEqual([
      {
        kind: 'none',
        label: 'Switch to Model to inspect sky changes',
      },
    ]);
  });
});
