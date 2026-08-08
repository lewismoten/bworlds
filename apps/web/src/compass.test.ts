import { describe, expect, it } from 'vitest';
import {
  advanceCompassState,
  easeAngle,
  formatCompassHeading,
  getCompassBezelRotation,
  getCompassDialFacingAngle,
  getCompassDialInteractionMode,
  getCompassNeedleRotation,
  getCompassPalette,
  getCompassWobbleBoost,
  isCompassHeadingDragSignificant,
  shouldToggleCompassHeading,
} from './compass.ts';

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
    expect(getCompassBezelRotation(-Math.PI / 2)).toBeCloseTo(0);
  });

  it('adds a wobble impulse when the heading snaps to a distant direction', () => {
    expect(getCompassWobbleBoost(-Math.PI / 2, Math.PI / 2)).toBeGreaterThan(0);
    expect(getCompassWobbleBoost(Math.PI / 2, -Math.PI / 2)).toBeLessThan(0);
  });

  it('advances the compass with damped motion toward the target angle', () => {
    const first = advanceCompassState(
      {
        angle: -Math.PI / 2,
        velocity: getCompassWobbleBoost(-Math.PI / 2, 0),
        initialized: true,
      },
      0
    );

    expect(first.angle).toBeGreaterThan(-Math.PI / 2);
    expect(Math.abs(first.velocity)).toBeGreaterThan(0);
  });

  it('maps a clicked dial point to a facing angle', () => {
    expect(getCompassDialFacingAngle(100, 0, 50, 50)).toBeCloseTo(-Math.PI / 4);
    expect(getCompassDialFacingAngle(50, 0, 50, 50)).toBeCloseTo(-Math.PI / 2);
    expect(getCompassDialFacingAngle(100, 50, 50, 50)).toBeCloseTo(0);
  });

  it('treats outer-rim clicks as heading-bezel adjustments', () => {
    expect(getCompassDialInteractionMode(50, 10, 50, 50, 40)).toBe('heading-bug');
    expect(getCompassDialInteractionMode(50, 40, 50, 50, 40)).toBe('facing');
    expect(getCompassDialInteractionMode(50, -5, 50, 50, 40)).toBe('none');
  });

  it('uses a red north label and a light south needle for contrast', () => {
    const palette = getCompassPalette();

    expect(palette.northLabel).toBe('#d54343');
    expect(palette.southNeedle).toBe('#f4f8ff');
  });

  it('formats compass headings with north at zero degrees', () => {
    expect(formatCompassHeading(-Math.PI / 2)).toBe('Heading 000°');
    expect(formatCompassHeading(0)).toBe('Heading 090°');
    expect(formatCompassHeading(null)).toBe('No heading set');
  });

  it('can toggle the heading bug off when clicking the same bezel again', () => {
    expect(shouldToggleCompassHeading(0, 0.02)).toBe(true);
    expect(shouldToggleCompassHeading(0, Math.PI / 2)).toBe(false);
    expect(shouldToggleCompassHeading(null, 0)).toBe(false);
  });

  it('distinguishes a live drag from a simple heading toggle tap', () => {
    expect(isCompassHeadingDragSignificant(0, 0.2)).toBe(true);
    expect(isCompassHeadingDragSignificant(0, 0.01)).toBe(false);
  });
});
