import { describe, expect, it } from 'vitest';

import {
  normalizeAmbientProgress,
  resolveAmbientDayPhase,
  resolveAmbientSeason,
} from './ambient-cycle.ts';

describe('ambient cycle', () => {
  it('normalizes wrapped ambient progress values', () => {
    expect(normalizeAmbientProgress(1.25)).toBeCloseTo(0.25, 6);
    expect(normalizeAmbientProgress(-0.1)).toBeCloseTo(0.9, 6);
    expect(normalizeAmbientProgress(Number.NaN)).toBe(0);
  });

  it('maps day progress into coarse ambient phases', () => {
    expect(resolveAmbientDayPhase(0.1)).toBe('night');
    expect(resolveAmbientDayPhase(0.24)).toBe('dawn');
    expect(resolveAmbientDayPhase(0.5)).toBe('day');
    expect(resolveAmbientDayPhase(0.8)).toBe('dusk');
    expect(resolveAmbientDayPhase(0.92)).toBe('night');
  });

  it('maps year progress into seasons', () => {
    expect(resolveAmbientSeason(0)).toBe('winter');
    expect(resolveAmbientSeason(0.2)).toBe('spring');
    expect(resolveAmbientSeason(0.5)).toBe('summer');
    expect(resolveAmbientSeason(0.7)).toBe('autumn');
    expect(resolveAmbientSeason(0.95)).toBe('winter');
  });
});
