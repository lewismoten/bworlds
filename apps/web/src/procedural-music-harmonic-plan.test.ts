import { describe, expect, it } from 'vitest';

import {
  resolveProceduralHarmonicPlan,
  resolveProceduralHarmonicPlanEntryAtStep,
  type ProceduralHarmonicPlanTheme,
} from './procedural-music-harmonic-plan.ts';

const MIXOLYDIAN_THEME: ProceduralHarmonicPlanTheme = {
  id: 'frontier-plains',
  scale: [0, 2, 4, 5, 7, 9, 10],
  stepPattern: [0, 2, 4, 2, 5, 4, 2, 0],
};

describe('procedural music harmonic plan', () => {
  it('materializes phrase chord pitches before tracks read the harmonic timeline', () => {
    const first = resolveProceduralHarmonicPlan(MIXOLYDIAN_THEME, 3, -2);
    const second = resolveProceduralHarmonicPlan(MIXOLYDIAN_THEME, 3, -2);

    expect(first).toEqual(second);
    expect(first).toHaveLength(16);
    expect(first[0]).toEqual(
      expect.objectContaining({
        progressionIndex: 0,
        degreeIndex: 0,
        rootSemitones: 0,
        thirdSemitones: 4,
        fifthSemitones: 7,
        passingSemitones: 2,
      })
    );
    expect(first[1]).toEqual(
      expect.objectContaining({
        progressionIndex: 1,
        degreeIndex: 4,
        rootSemitones: 7,
        thirdSemitones: 10,
        fifthSemitones: 14,
        passingSemitones: 9,
      })
    );
  });

  it('reuses the same harmonic plan entry for every track reading the same step', () => {
    const firstMeasure = resolveProceduralHarmonicPlanEntryAtStep(
      MIXOLYDIAN_THEME,
      0,
      3,
      -2
    );
    const repeatedLookup = resolveProceduralHarmonicPlanEntryAtStep(
      MIXOLYDIAN_THEME,
      3,
      3,
      -2
    );
    const nextMeasure = resolveProceduralHarmonicPlanEntryAtStep(
      MIXOLYDIAN_THEME,
      4,
      3,
      -2
    );

    expect(repeatedLookup).toEqual(firstMeasure);
    expect(nextMeasure.startMeasure).toBe(2);
    expect(nextMeasure.progressionIndex).toBe(1);
    expect(nextMeasure.rootSemitones).toBe(7);
  });
});
