import { describe, expect, it } from 'vitest';
import {
  isProceduralSemitoneInScale,
  resolveProceduralChordAtStep,
  resolveProceduralChordProgression,
  resolveProceduralLeadContour,
  resolveProceduralInstrumentSemitones,
  resolveProceduralLeadMotif,
  resolveProceduralLeadPhraseCadence,
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

  it('reuses a deterministic short lead motif across phrase cycles', () => {
    const first = resolveProceduralLeadMotif(TEST_THEME, 3, -2);
    const second = resolveProceduralLeadMotif(TEST_THEME, 3, -2);

    expect(first).toEqual(second);
    expect(first.degreeOffsets.length).toBeGreaterThanOrEqual(3);
    expect(first.degreeOffsets.length).toBeLessThanOrEqual(8);

    const describeCycle = (steps: number[]) =>
      steps.map((stepIndex) =>
        resolveProceduralInstrumentSemitones({
          theme: TEST_THEME,
          role: 'lead',
          stepIndex,
          clusterX: 3,
          clusterY: -2,
        })
      );

    expect(describeCycle([0, 1, 3])).toEqual(describeCycle([16, 17, 19]));
  });

  it('uses question-and-answer cadences so phrases end unresolved before resolving', () => {
    const cadenceTheme: ProceduralHarmonyTheme = {
      id: 'cadence-test',
      scale: [0, 2, 4, 5, 7, 9, 11],
      stepPattern: [0, 2, 4, 2, 5, 4, 2, 0],
    };
    const questionSteps = [3, 11];
    const answerSteps = [7, 15];

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
      expect(semitones).toBe(chord.passingSemitones);
      expect(semitones).not.toBe(chord.rootSemitones);
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
      expect(semitones).toBe(chord.rootSemitones);
    }
  });

  it('limits large melodic jumps and pulls the next step back afterward', () => {
    const semitones = Array.from({ length: 24 }, (_, stepIndex) =>
      resolveProceduralInstrumentSemitones({
        theme: TEST_THEME,
        role: 'lead',
        stepIndex,
        clusterX: 3,
        clusterY: -2,
      })
    );
    const intervals = semitones
      .slice(1)
      .map((note, index) => note - semitones[index]!);
    const largeLeapIndexes = intervals
      .map((interval, index) => ({ interval, index }))
      .filter(({ interval }) => Math.abs(interval) > 7);

    expect(largeLeapIndexes.length).toBeLessThanOrEqual(1);

    for (const leap of largeLeapIndexes) {
      const recovery = intervals[leap.index + 1];
      expect(recovery).toBeDefined();
      expect(Math.sign(recovery!)).toBe(-Math.sign(leap.interval));
      expect(Math.abs(recovery!)).toBeLessThan(Math.abs(leap.interval));
    }
  });

  it('stays mostly inside the key while allowing sparse deliberate accidentals', () => {
    const semitones = Array.from({ length: 48 }, (_, stepIndex) =>
      resolveProceduralInstrumentSemitones({
        theme: TEST_THEME,
        role: 'lead',
        stepIndex,
        clusterX: 3,
        clusterY: -2,
      })
    );
    const accidentalCount = semitones.filter(
      (semitones) => !isProceduralSemitoneInScale(TEST_THEME.scale, semitones)
    ).length;

    expect(accidentalCount).toBeGreaterThan(0);
    expect(accidentalCount).toBeLessThan(semitones.length / 4);
  });

  it('builds a deterministic melodic contour that rises, peaks, and resolves', () => {
    const contour = resolveProceduralLeadContour(TEST_THEME, 3, -2);
    const repeated = resolveProceduralLeadContour(TEST_THEME, 3, -2);

    expect(contour).toEqual(repeated);
    expect(contour).toHaveLength(TEST_THEME.stepPattern.length);
    expect(contour[0]?.stage).toBe('start');
    expect(contour.at(-1)?.stage).toBe('resolve');
    expect(contour.some((step) => step.stage === 'climax')).toBe(true);

    const climax = contour.find((step) => step.stage === 'climax');
    const start = contour[0];
    const end = contour.at(-1);
    expect(climax?.degreeOffset).toBeGreaterThan(start?.degreeOffset ?? 0);
    expect(end?.degreeOffset).toBeLessThanOrEqual(climax?.degreeOffset ?? 0);
  });
});
