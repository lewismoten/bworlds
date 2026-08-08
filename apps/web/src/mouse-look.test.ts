import { describe, expect, it } from 'vitest';
import { getMouseLookAngles } from './mouse-look.ts';

describe('mouse look', () => {
  it('turns right and looks down as the pointer moves right and down', () => {
    const result = getMouseLookAngles(
      {
        pointerX: 100,
        pointerY: 80,
        facing: 0,
        pitch: -0.08,
      },
      130,
      100,
      0.01
    );

    expect(result.facing).toBeCloseTo(0.3);
    expect(result.pitch).toBeCloseTo(0.12);
  });

  it('wraps facing and clamps pitch to the camera range', () => {
    const result = getMouseLookAngles(
      {
        pointerX: 0,
        pointerY: 0,
        facing: Math.PI * 2 - 0.05,
        pitch: -0.08,
      },
      20,
      -400,
      0.01
    );

    expect(result.facing).toBeCloseTo(0.15);
    expect(result.pitch).toBe(-1.1);
  });
});
