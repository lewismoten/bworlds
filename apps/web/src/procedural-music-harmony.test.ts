import { describe, expect, it } from 'vitest';
import {
  resolveProceduralChordAtStep,
  resolveProceduralChordProgression,
  resolveProceduralInstrumentSemitones,
  type ProceduralHarmonyTheme,
} from './procedural-music-harmony.ts';

const TEST_THEME: ProceduralHarmonyTheme = {
  id: 'frontier-plains',
  scale: [0, 3, 5, 7, 10, 12],
  stepPattern: [0, 2, 4, 2, 5, 4, 2, 0],
};

describe('procedural music harmony', () => {
  it('builds deterministic chord progressions from the theme and cluster', () => {
    const first = resolveProceduralChordProgression(TEST_THEME, 3, -2);
    const second = resolveProceduralChordProgression(TEST_THEME, 3, -2);

    expect(first).toEqual(second);
    expect(first).toHaveLength(4);
    expect(first.every((degree) => degree >= 0)).toBe(true);
  });

  it('changes chords over time using the shared progression', () => {
    const firstChord = resolveProceduralChordAtStep(TEST_THEME, 0, 3, -2);
    const secondChord = resolveProceduralChordAtStep(TEST_THEME, 4, 3, -2);

    expect(firstChord.progressionIndex).toBe(0);
    expect(secondChord.progressionIndex).toBe(1);
    expect(secondChord.rootSemitones).not.toBeNaN();
  });

  it('keeps lead notes on chord tones at strong melodic beats', () => {
    const strongBeatSemitones = [2, 6, 10, 14].map((stepIndex) => ({
      stepIndex,
      semitones: resolveProceduralInstrumentSemitones({
        theme: TEST_THEME,
        role: 'lead',
        stepIndex,
        clusterX: 3,
        clusterY: -2,
      }),
      chord: resolveProceduralChordAtStep(TEST_THEME, stepIndex, 3, -2),
    }));

    for (const entry of strongBeatSemitones) {
      expect([
        entry.chord.rootSemitones,
        entry.chord.thirdSemitones,
        entry.chord.fifthSemitones,
      ]).toContain(entry.semitones);
    }
  });
});
