import { describe, expect, it } from 'vitest';
import {
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

describe('procedural music harmony lead contour', () => {
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
