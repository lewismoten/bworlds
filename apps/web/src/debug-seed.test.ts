import { describe, expect, it } from 'vitest';
import {
  createRandomDebugCoordinate,
  randomizeDebugCoordinatePair,
} from './debug-seed.ts';

describe('debug seed helpers', () => {
  it('creates bounded signed coordinates for generator debug pages', () => {
    expect(createRandomDebugCoordinate(() => 0)).toBe(-9_999);
    expect(createRandomDebugCoordinate(() => 0.5)).toBe(0);
    expect(createRandomDebugCoordinate(() => 1)).toBe(9_999);
  });

  it('randomizes paired coordinates without changing unrelated options', () => {
    expect(
      randomizeDebugCoordinatePair(
        {
          x: 1,
          y: 2,
          label: 'forest',
        },
        () => 1
      )
    ).toEqual({
      x: 9_999,
      y: 9_999,
      label: 'forest',
    });
  });
});
