import { describe, expect, it } from 'vitest';
import {
  resolveProceduralBassFigure,
  resolveProceduralChordAtStep,
  resolveProceduralChordProgression,
  resolveProceduralCompositionStep,
  resolveProceduralHarmonyVoicing,
  resolveProceduralInstrumentSemitones,
  resolveProceduralLeadMotif,
  resolveProceduralLeadPhraseCadence,
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

describe('procedural music harmony chords', () => {
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
    const repeatedPhraseChord = resolveProceduralChordAtStep(
      TEST_THEME,
      68,
      3,
      -2
    );

    expect(firstChord.progressionIndex).toBe(0);
    expect(secondChord.progressionIndex).toBe(1);
    expect(repeatedPhraseChord.progressionIndex).toBe(1);
    expect(repeatedPhraseChord.degreeIndex).toBe(secondChord.degreeIndex);
    expect(secondChord.rootSemitones).not.toBeNaN();
  });

  it('lets bass, lead, and harmony reuse the same resolved chord context', () => {
    const stepIndex = 6;
    const chord = resolveProceduralChordAtStep(TEST_THEME, stepIndex, 3, -2);
    const previousChord = resolveProceduralChordAtStep(
      TEST_THEME,
      stepIndex - 1,
      3,
      -2
    );

    expect(
      resolveProceduralInstrumentSemitones({
        theme: TEST_THEME,
        role: 'bass',
        stepIndex,
        clusterX: 3,
        clusterY: -2,
        chord,
      })
    ).toBe(
      resolveProceduralInstrumentSemitones({
        theme: TEST_THEME,
        role: 'bass',
        stepIndex,
        clusterX: 3,
        clusterY: -2,
      })
    );
    expect(
      resolveProceduralInstrumentSemitones({
        theme: TEST_THEME,
        role: 'lead',
        stepIndex,
        clusterX: 3,
        clusterY: -2,
        chord,
      })
    ).toBe(
      resolveProceduralInstrumentSemitones({
        theme: TEST_THEME,
        role: 'lead',
        stepIndex,
        clusterX: 3,
        clusterY: -2,
      })
    );
    expect(
      resolveProceduralHarmonyVoicing({
        theme: TEST_THEME,
        stepIndex,
        clusterX: 3,
        clusterY: -2,
        chord,
        previousChord,
      })
    ).toEqual(
      resolveProceduralHarmonyVoicing({
        theme: TEST_THEME,
        stepIndex,
        clusterX: 3,
        clusterY: -2,
      })
    );
  });

  it('keeps every role on the same active harmonic block within a measure', () => {
    const firstBeatChord = resolveProceduralChordAtStep(TEST_THEME, 4, 3, -2);
    const laterBeatChord = resolveProceduralChordAtStep(TEST_THEME, 7, 3, -2);
    const nextMeasureChord = resolveProceduralChordAtStep(TEST_THEME, 8, 3, -2);

    expect(laterBeatChord).toEqual(firstBeatChord);
    expect(nextMeasureChord.progressionIndex).toBe(
      firstBeatChord.progressionIndex + 1
    );
    expect(nextMeasureChord.degreeIndex).not.toBe(firstBeatChord.degreeIndex);
  });

  it('keeps bass notes anchored to nearby roots and fifths without large repeated jumps', () => {
    const semitonePlan = Array.from({ length: 24 }, (_, stepIndex) => ({
      stepIndex,
      semitones: resolveProceduralInstrumentSemitones({
        theme: TEST_THEME,
        role: 'bass',
        stepIndex,
        clusterX: 3,
        clusterY: -2,
      }),
      chord: resolveProceduralChordAtStep(TEST_THEME, stepIndex, 3, -2),
    }));
    const leaps = semitonePlan
      .slice(1)
      .map((entry, index) => entry.semitones - semitonePlan[index]!.semitones);
    const averageLeap =
      leaps.reduce((total, leap) => total + Math.abs(leap), 0) /
      Math.max(1, leaps.length);

    for (const entry of semitonePlan) {
      expect([
        entry.chord.rootSemitones % 12,
        entry.chord.fifthSemitones % 12,
        entry.chord.passingSemitones % 12,
      ]).toContain(((entry.semitones % 12) + 12) % 12);
      expect(entry.semitones).toBeGreaterThanOrEqual(-7);
      expect(entry.semitones).toBeLessThanOrEqual(12);
    }

    expect(averageLeap).toBeLessThanOrEqual(5);
    expect(
      Math.max(...leaps.map((leap) => Math.abs(leap)))
    ).toBeLessThanOrEqual(7);
  });

  it('anchors bass downbeats to the active chord root before moving to passing tones', () => {
    const bassPlan = Array.from({ length: 24 }, (_, stepIndex) => ({
      stepIndex,
      semitones: resolveProceduralInstrumentSemitones({
        theme: MIXOLYDIAN_THEME,
        role: 'bass',
        stepIndex,
        clusterX: 4,
        clusterY: -1,
      }),
      chord: resolveProceduralChordAtStep(MIXOLYDIAN_THEME, stepIndex, 4, -1),
    }));

    for (const entry of bassPlan.filter((item) => item.stepIndex % 4 === 0)) {
      expect(((entry.semitones % 12) + 12) % 12).toBe(
        ((entry.chord.rootSemitones % 12) + 12) % 12
      );
    }
  });

  it('repeats a stable bass figure across phrase cycles without losing the root-first pulse', () => {
    const figure = resolveProceduralBassFigure(TEST_THEME, 3, -2);

    expect(figure).toHaveLength(TEST_THEME.stepPattern.length);
    expect(figure.slice(0, 4)).toEqual(figure.slice(4, 8));
    expect(figure[0]).toBe('root');
    expect(figure[4]).toBe('root');
    expect(
      figure.every((step, index) => index % 4 !== 0 || step === 'root')
    ).toBe(true);
  });

  it('reuses a deterministic short lead motif across phrase cycles', () => {
    const first = resolveProceduralLeadMotif(TEST_THEME, 3, -2);
    const second = resolveProceduralLeadMotif(TEST_THEME, 3, -2);

    expect(first).toEqual(second);
    expect(first.degreeOffsets.length).toBeGreaterThanOrEqual(3);
    expect(first.degreeOffsets.length).toBeLessThanOrEqual(8);

    const describeCycle = (steps: number[]) =>
      steps.map(
        (stepIndex) =>
          resolveProceduralCompositionStep(TEST_THEME, stepIndex, 3, -2)
            .motifDegreeOffset
      );

    expect(describeCycle([0, 1, 3])).toEqual(describeCycle([16, 17, 19]));
  });

  it('builds a shared composition step so layers can react to chord, contour, and cadence together', () => {
    const first = resolveProceduralCompositionStep(TEST_THEME, 62, 3, -2);
    const second = resolveProceduralCompositionStep(TEST_THEME, 62, 3, -2);

    expect(first).toEqual(second);
    expect(first.chord.progressionIndex).toBeGreaterThanOrEqual(0);
    expect(first.cadence).toBe('answer');
    expect(first.contourStep.stage).toBeDefined();
  });

  it('can anchor the lead motif to a shared regional motif when one is provided', () => {
    const motifTheme: ProceduralHarmonyTheme = {
      ...TEST_THEME,
      motif: {
        sharedDegreeOffsets: [0, 2, 1, 3],
        adaptedDegreeOffsets: [0, 0, 2, 1, 3],
      },
    };

    expect(resolveProceduralLeadMotif(motifTheme, 3, -2).degreeOffsets).toEqual(
      [0, 0, 2, 1, 3]
    );
  });

  it('uses question-and-answer cadences so phrases end unresolved before resolving', () => {
    const cadenceTheme: ProceduralHarmonyTheme = {
      id: 'cadence-test',
      scale: [0, 2, 4, 5, 7, 9, 11],
      stepPattern: [0, 2, 4, 2, 5, 4, 2, 0],
    };
    const questionSteps = [30, 94];
    const answerSteps = [62, 126];

    for (const stepIndex of questionSteps) {
      const chord = resolveProceduralChordAtStep(
        cadenceTheme,
        stepIndex,
        3,
        -2
      );
      const semitones = resolveProceduralInstrumentSemitones({
        theme: cadenceTheme,
        role: 'lead',
        stepIndex,
        clusterX: 3,
        clusterY: -2,
      });

      expect(resolveProceduralLeadPhraseCadence(cadenceTheme, stepIndex)).toBe(
        'question'
      );
      expect(((semitones % 12) + 12) % 12).toBe(
        ((chord.passingSemitones % 12) + 12) % 12
      );
      expect(((semitones % 12) + 12) % 12).not.toBe(
        ((chord.rootSemitones % 12) + 12) % 12
      );
    }

    for (const stepIndex of answerSteps) {
      const chord = resolveProceduralChordAtStep(
        cadenceTheme,
        stepIndex,
        3,
        -2
      );
      const semitones = resolveProceduralInstrumentSemitones({
        theme: cadenceTheme,
        role: 'lead',
        stepIndex,
        clusterX: 3,
        clusterY: -2,
      });

      expect(resolveProceduralLeadPhraseCadence(cadenceTheme, stepIndex)).toBe(
        'answer'
      );
      expect(((semitones % 12) + 12) % 12).toBe(
        ((chord.rootSemitones % 12) + 12) % 12
      );
    }

    expect(resolveProceduralLeadPhraseCadence(cadenceTheme, 27)).toBe(
      'neutral'
    );
    expect(resolveProceduralLeadPhraseCadence(cadenceTheme, 59)).toBe(
      'neutral'
    );
  });

  it('uses a dominant-like chord setup immediately before the answer cadence tonic', () => {
    const setupChord = resolveProceduralChordAtStep(
      MIXOLYDIAN_THEME,
      59,
      3,
      -2
    );
    const answerChord = resolveProceduralChordAtStep(
      MIXOLYDIAN_THEME,
      60,
      3,
      -2
    );

    expect(resolveProceduralLeadPhraseCadence(MIXOLYDIAN_THEME, 59)).toBe(
      'neutral'
    );
    expect(resolveProceduralLeadPhraseCadence(MIXOLYDIAN_THEME, 60)).toBe(
      'answer'
    );
    expect(setupChord.degreeIndex).toBe(4);
    expect(answerChord.degreeIndex).toBe(0);
    expect(((setupChord.rootSemitones % 12) + 12) % 12).toBe(7);
    expect(((answerChord.rootSemitones % 12) + 12) % 12).toBe(0);
  });
});
