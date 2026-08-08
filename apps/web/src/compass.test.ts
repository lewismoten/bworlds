import { describe, expect, it } from 'vitest';
import { easeAngle } from './compass.ts';

describe('compass helpers', () => {
  it('eases angles across the wraparound boundary', () => {
    const current = Math.PI * 1.9;
    const target = 0.1;
    const next = easeAngle(current, target, 0.2);

    expect(next).toBeGreaterThan(current);
  });
});
