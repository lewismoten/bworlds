import { describe, expect, it } from 'vitest';
import {
  resolveProceduralChordAtStep,
  resolveProceduralHarmonyVoicing,
  type ProceduralHarmonyTheme,
} from './procedural-music-harmony.ts';

const TEST_THEME: ProceduralHarmonyTheme = {
  id: 'test-harmony-theme',
  scale: [0, 3, 5, 7, 10, 12],
  stepPattern: [0, 2, 4, 2, 5, 4, 2, 0],
};
const MIXOLYDIAN_THEME: ProceduralHarmonyTheme = {
  id: 'frontier-plains',
  scale: [0, 2, 4, 5, 7, 9, 10],
  stepPattern: [0, 2, 4, 2, 5, 4, 2, 0],
};

describe('procedural music harmony voicing', () => {
  it('voices harmony as stable triads instead of single notes', () => {
    const first = resolveProceduralHarmonyVoicing({
      theme: TEST_THEME,
      stepIndex: 1,
      clusterX: 3,
      clusterY: -2,
    });
    const second = resolveProceduralHarmonyVoicing({
      theme: TEST_THEME,
      stepIndex: 5,
      clusterX: 3,
      clusterY: -2,
    });
    const chord = resolveProceduralChordAtStep(TEST_THEME, 1, 3, -2);

    expect(first).toHaveLength(3);
    expect(
      first.every((semitones) =>
        [
          chord.rootSemitones % 12,
          chord.thirdSemitones % 12,
          chord.fifthSemitones % 12,
        ].includes(((semitones % 12) + 12) % 12)
      )
    ).toBe(true);
    expect(second).toHaveLength(3);
    expect(
      second.every(
        (semitones, index) =>
          Math.abs(semitones - (first[index] ?? semitones)) <= 7
      )
    ).toBe(true);
  });

  it('matches plains harmony voicings to the shared 1-5-6-1 cadence cycle', () => {
    const expectedTriads = [
      [0, 4, 7],
      [7, 10, 14],
      [9, 12, 16],
      [0, 4, 7],
    ];
    const actualTriads = [0, 4, 8, 12].map((stepIndex) => {
      const voiced = resolveProceduralHarmonyVoicing({
        theme: MIXOLYDIAN_THEME,
        stepIndex,
        clusterX: 3,
        clusterY: -2,
      });
      return voiced.map((semitones) => ((semitones % 12) + 12) % 12).sort();
    });

    expect(actualTriads).toEqual(
      expectedTriads.map((triad) =>
        triad.map((semitones) => semitones % 12).sort()
      )
    );
  });
});
