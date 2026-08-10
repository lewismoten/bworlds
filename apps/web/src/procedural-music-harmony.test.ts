import { describe, expect, it } from 'vitest';
import {
  isProceduralSemitoneInScale,
  resolveProceduralChordAtStep,
  resolveProceduralChordProgression,
  resolveProceduralCompositionStep,
  resolveProceduralHarmonyVoicing,
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
      expect(entry.semitones).toBeGreaterThanOrEqual(-5);
      expect(entry.semitones).toBeLessThanOrEqual(12);
    }

    expect(averageLeap).toBeLessThanOrEqual(5);
    expect(
      Math.max(...leaps.map((leap) => Math.abs(leap)))
    ).toBeLessThanOrEqual(7);
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

  it('builds a shared composition step so layers can react to chord, contour, and cadence together', () => {
    const first = resolveProceduralCompositionStep(TEST_THEME, 7, 3, -2);
    const second = resolveProceduralCompositionStep(TEST_THEME, 7, 3, -2);

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

  it('keeps most lead motion stepwise or by thirds across sampled phrases', () => {
    const sampledClusters = [
      { clusterX: 0, clusterY: 0 },
      { clusterX: 3, clusterY: -2 },
      { clusterX: 8, clusterY: -4 },
      { clusterX: -6, clusterY: 5 },
    ];

    for (const cluster of sampledClusters) {
      const semitones = Array.from({ length: 32 }, (_, stepIndex) =>
        resolveProceduralInstrumentSemitones({
          theme: TEST_THEME,
          role: 'lead',
          stepIndex,
          clusterX: cluster.clusterX,
          clusterY: cluster.clusterY,
        })
      );
      const intervals = semitones
        .slice(1)
        .map((note, index) => Math.abs(note - semitones[index]!));
      const compactIntervals = intervals.filter((interval) => interval <= 4);

      expect(compactIntervals.length * 2).toBeGreaterThan(intervals.length);
    }
  });

  it('reserves octave lead jumps for rare structural accents', () => {
    const sampledClusters = [
      { clusterX: 0, clusterY: 0 },
      { clusterX: 3, clusterY: -2 },
      { clusterX: 8, clusterY: -4 },
      { clusterX: -6, clusterY: 5 },
    ];

    for (const cluster of sampledClusters) {
      const semitones = Array.from({ length: 48 }, (_, stepIndex) =>
        resolveProceduralInstrumentSemitones({
          theme: TEST_THEME,
          role: 'lead',
          stepIndex,
          clusterX: cluster.clusterX,
          clusterY: cluster.clusterY,
        })
      );
      const octaveLeaps = semitones
        .slice(1)
        .map((note, index) => ({
          stepIndex: index + 1,
          interval: note - semitones[index]!,
        }))
        .filter(({ interval }) => Math.abs(interval) >= 12);

      expect(octaveLeaps.length).toBeLessThanOrEqual(3);

      for (const leap of octaveLeaps) {
        const composition = resolveProceduralCompositionStep(
          TEST_THEME,
          leap.stepIndex,
          cluster.clusterX,
          cluster.clusterY
        );
        expect(
          composition.contourStep.stage === 'rise' ||
            composition.cadence === 'answer' ||
            composition.contourStep.stage === 'climax'
        ).toBe(true);
      }
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

    expect(accidentalCount).toBeGreaterThanOrEqual(0);
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
          Math.abs(semitones - (first[index] ?? semitones)) <= 5
      )
    ).toBe(true);
  });
});
