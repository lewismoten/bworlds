import { describe, expect, it } from 'vitest';
import {
  isProceduralSemitoneInScale,
  resolveProceduralCompositionStep,
  resolveProceduralInstrumentSemitones,
  type ProceduralHarmonyTheme,
} from './procedural-music-harmony.ts';

const TEST_THEME: ProceduralHarmonyTheme = {
  id: 'test-harmony-theme',
  scale: [0, 3, 5, 7, 10, 12],
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

  it('keeps long same-pitch runs isolated to cadence windows', () => {
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
      let runLength = 1;
      let runStartIndex = 0;
      const repeatedRuns: Array<{ startIndex: number; endIndex: number }> = [];

      for (let index = 1; index < semitones.length; index += 1) {
        if (semitones[index] === semitones[index - 1]) {
          runLength += 1;
          continue;
        }
        if (runLength > 2) {
          repeatedRuns.push({
            startIndex: runStartIndex,
            endIndex: index - 1,
          });
        }
        runStartIndex = index;
        runLength = 1;
      }
      if (runLength > 2) {
        repeatedRuns.push({
          startIndex: runStartIndex,
          endIndex: semitones.length - 1,
        });
      }

      for (const run of repeatedRuns) {
        for (
          let stepIndex = run.startIndex;
          stepIndex <= run.endIndex;
          stepIndex += 1
        ) {
          expect(compositions[stepIndex]!.cadence).not.toBe('neutral');
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
});
