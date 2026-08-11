import { describe, expect, it } from 'vitest';
import {
  isProceduralSemitoneInScale,
  resolveProceduralCompositionStep,
  resolveProceduralInstrumentSemitones,
  resolveProceduralLeadContour,
  resolveProceduralLeadContourTargetRange,
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

describe('procedural music harmony lead motion', () => {
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
      chord: resolveProceduralCompositionStep(TEST_THEME, stepIndex, 3, -2)
        .chord,
    }));

    for (const entry of strongBeatSemitones) {
      expect([
        entry.chord.rootSemitones % 12,
        entry.chord.thirdSemitones % 12,
        entry.chord.fifthSemitones % 12,
      ]).toContain(((entry.semitones % 12) + 12) % 12);
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
      expect(Math.abs(recovery!)).toBeLessThanOrEqual(2);
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

  it('keeps ordinary non-accent lead motion within three semitones', () => {
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
      const compositions = Array.from({ length: 32 }, (_, stepIndex) =>
        resolveProceduralCompositionStep(
          TEST_THEME,
          stepIndex,
          cluster.clusterX,
          cluster.clusterY
        )
      );

      for (let index = 1; index < semitones.length; index += 1) {
        const current = compositions[index]!;
        const interval = Math.abs(semitones[index]! - semitones[index - 1]!);

        if (
          current.cadence === 'neutral' &&
          current.contourStep.stage !== 'climax'
        ) {
          expect(interval).toBeLessThanOrEqual(3);
        }
      }
    }
  });

  it('lets preferred lead intervals change the sampled melodic path', () => {
    const stepTheme: ProceduralHarmonyTheme = {
      ...TEST_THEME,
      vocabulary: {
        preferredIntervals: [2],
      },
    };
    const thirdTheme: ProceduralHarmonyTheme = {
      ...TEST_THEME,
      vocabulary: {
        preferredIntervals: [3],
      },
    };

    const resolveLeadPath = (theme: ProceduralHarmonyTheme) =>
      Array.from({ length: 24 }, (_, stepIndex) =>
        resolveProceduralInstrumentSemitones({
          theme,
          role: 'lead',
          stepIndex,
          clusterX: 3,
          clusterY: -2,
        })
      );

    expect(resolveLeadPath(thirdTheme)).not.toEqual(resolveLeadPath(stepTheme));
  });

  it('avoids back-to-back minor-sixth jumps in sampled lead phrases', () => {
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

      for (let index = 1; index < intervals.length; index += 1) {
        expect([intervals[index - 1], intervals[index]]).not.toEqual([8, 8]);
      }
    }
  });

  it('allows at most one larger-than-ordinary leap per phrase', () => {
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

      for (
        let phraseStart = 0;
        phraseStart < intervals.length;
        phraseStart += 8
      ) {
        const phraseIntervals = intervals.slice(phraseStart, phraseStart + 8);
        const largerLeaps = phraseIntervals.filter((interval) => interval > 3);
        expect(largerLeaps.length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps the lead inside a narrower active register across sampled phrases', () => {
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

      expect(Math.min(...semitones)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...semitones)).toBeLessThanOrEqual(19);
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
    expect(
      contour.some((step) => step.minDegreeOffset !== step.maxDegreeOffset)
    ).toBe(true);

    const climax = contour.find((step) => step.stage === 'climax');
    const start = contour[0];
    const end = contour.at(-1);
    expect(climax?.degreeOffset).toBeGreaterThan(start?.degreeOffset ?? 0);
    expect(end?.degreeOffset).toBeLessThanOrEqual(climax?.degreeOffset ?? 0);

    for (const step of contour) {
      expect(step.minDegreeOffset).toBeLessThanOrEqual(step.degreeOffset);
      expect(step.degreeOffset).toBeLessThanOrEqual(step.maxDegreeOffset);
    }
  });

  it('treats contour targets as bounded ranges instead of exact offsets', () => {
    const contour = resolveProceduralLeadContour(TEST_THEME, 3, -2);
    const riseStep = contour.find((step) => step.stage === 'rise');
    const climaxStep = contour.find((step) => step.stage === 'climax');

    expect(riseStep).toBeDefined();
    expect(climaxStep).toBeDefined();
    expect(riseStep!.minDegreeOffset).toBeLessThan(riseStep!.maxDegreeOffset);
    expect(climaxStep!.minDegreeOffset).toBeLessThan(
      climaxStep!.maxDegreeOffset
    );
  });

  it('interpolates lead contour targets across the whole phrase instead of repeating checkpoint jumps every measure', () => {
    const targetRanges = Array.from({ length: 32 }, (_, stepIndex) =>
      resolveProceduralLeadContourTargetRange(TEST_THEME, stepIndex, 3, -2)
    );
    const uniqueTargets = new Set(
      targetRanges.map((range) => range.targetSemitones)
    );
    const stepToStepMotion = targetRanges
      .slice(1)
      .map((range, index) =>
        Math.abs(range.targetSemitones - targetRanges[index]!.targetSemitones)
      );

    expect(uniqueTargets.size).toBeGreaterThan(TEST_THEME.stepPattern.length);
    expect(Math.max(...stepToStepMotion)).toBeLessThan(12);
  });

  it('keeps resolved lead notes near the planned contour register instead of remapping checkpoints by multiple octaves', () => {
    const targetRanges = Array.from({ length: 32 }, (_, stepIndex) =>
      resolveProceduralLeadContourTargetRange(TEST_THEME, stepIndex, 3, -2)
    );

    for (let stepIndex = 0; stepIndex < targetRanges.length; stepIndex += 1) {
      const resolvedSemitones = resolveProceduralInstrumentSemitones({
        theme: TEST_THEME,
        role: 'lead',
        stepIndex,
        clusterX: 3,
        clusterY: -2,
      });
      const target = targetRanges[stepIndex]!;

      expect(resolvedSemitones).toBeGreaterThanOrEqual(target.minSemitones - 7);
      expect(resolvedSemitones).toBeLessThanOrEqual(target.maxSemitones + 7);
    }
  });

  it('places the actual lead climax near the planned section peak and keeps it unique', () => {
    const semitones = Array.from({ length: 64 }, (_, stepIndex) =>
      resolveProceduralInstrumentSemitones({
        theme: MIXOLYDIAN_THEME,
        role: 'lead',
        stepIndex,
        clusterX: 0,
        clusterY: 0,
      })
    );
    const ranges = Array.from({ length: 64 }, (_, stepIndex) =>
      resolveProceduralLeadContourTargetRange(MIXOLYDIAN_THEME, stepIndex, 0, 0)
    );
    const actualClimaxSemitones = Math.max(...semitones);
    const actualClimaxSteps = semitones
      .map((value, stepIndex) => ({ value, stepIndex }))
      .filter((entry) => entry.value === actualClimaxSemitones)
      .map((entry) => entry.stepIndex);
    const plannedClimaxSteps = ranges
      .map((range, stepIndex) => ({ stage: range.stage, stepIndex }))
      .filter((entry) => entry.stage === 'climax')
      .map((entry) => entry.stepIndex);

    expect(actualClimaxSteps).toHaveLength(1);
    expect(plannedClimaxSteps.length).toBeGreaterThan(0);
    expect(
      Math.abs(actualClimaxSteps[0]! - plannedClimaxSteps[0]!)
    ).toBeLessThanOrEqual(4);
  });

  it('descends gradually after the climax and resolves the final contour step to tonic', () => {
    const semitones = Array.from({ length: 64 }, (_, stepIndex) =>
      resolveProceduralInstrumentSemitones({
        theme: MIXOLYDIAN_THEME,
        role: 'lead',
        stepIndex,
        clusterX: 0,
        clusterY: 0,
      })
    );
    const ranges = Array.from({ length: 64 }, (_, stepIndex) =>
      resolveProceduralLeadContourTargetRange(MIXOLYDIAN_THEME, stepIndex, 0, 0)
    );
    const lastClimaxStep = ranges.reduce(
      (lastIndex, range, stepIndex) =>
        range.stage === 'climax' ? stepIndex : lastIndex,
      -1
    );
    const tail = semitones.slice(lastClimaxStep + 1);

    expect(lastClimaxStep).toBeGreaterThanOrEqual(0);
    for (let index = 1; index < tail.length; index += 1) {
      expect(tail[index]!).toBeLessThanOrEqual(tail[index - 1]! + 1);
      expect(tail[index - 1]! - tail[index]!).toBeLessThanOrEqual(3);
    }
    expect(((semitones.at(-1)! % 12) + 12) % 12).toBe(0);
  });
});
