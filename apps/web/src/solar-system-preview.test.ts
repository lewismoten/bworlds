import { describe, expect, it } from 'vitest';
import { getDaylightCycleState } from '@bworlds/core';
import { getSolarSystemBodyPositions } from './solar-system-preview.ts';

describe('solar system preview helpers', () => {
  it('maps orrery bodies into stable preview positions', () => {
    const cycle = getDaylightCycleState(210000, {
      observerLatitudeDegrees: 24,
    });
    const positions = getSolarSystemBodyPositions(cycle.orreryBodies);

    expect(positions[0]).toEqual(
      expect.objectContaining({
        id: 'sun',
      })
    );
    expect(positions.find((entry) => entry.id === 'sun')?.position.length()).toBeCloseTo(0, 6);
    expect(
      positions.some(
        (entry) => entry.id.startsWith('planet:') && entry.position.length() > 0.5
      )
    ).toBe(true);
  });
});
