import { describe, expect, it } from 'vitest';
import { getDaylightCycleState } from '@bworlds/core';
import { getOrreryBodies } from './celestial-preview-model.ts';

describe('celestial preview model', () => {
  it('builds an orrery body list from the shared celestial cycle', () => {
    const cycle = getDaylightCycleState(0, {
      observerLatitudeDegrees: 18,
    });
    const bodies = getOrreryBodies(cycle);

    expect(bodies[0]).toEqual(
      expect.objectContaining({
        type: 'sun',
        orbitRadius: 0,
      })
    );
    expect(bodies.some((body) => body.type === 'moon')).toBe(true);
    expect(bodies.some((body) => body.type === 'planet')).toBe(true);
    expect(
      bodies.every((body) => body.angle >= 0 && body.angle < 1)
    ).toBe(true);
  });
});
