import { describe, expect, it } from 'vitest';
import { easeAngle, getCompassNeedleRotation } from './compass.ts';

describe('compass helpers', () => {
  it('eases angles across the wraparound boundary', () => {
    const current = Math.PI * 1.9;
    const target = 0.1;
    const next = easeAngle(current, target, 0.2);

    expect(next).toBeGreaterThan(current);
  });

  it('maps north-facing world rotation to an upward compass needle', () => {
    expect(getCompassNeedleRotation(-Math.PI / 2)).toBeCloseTo(0);
    expect(getCompassNeedleRotation(0)).toBeCloseTo(Math.PI / 2);
    expect(getCompassNeedleRotation(Math.PI / 2)).toBeCloseTo(Math.PI);
  });
});
