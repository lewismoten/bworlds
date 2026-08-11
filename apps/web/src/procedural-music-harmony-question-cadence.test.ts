import { describe, expect, it } from 'vitest';
import {
  resolveProceduralCompositionStep,
  resolveProceduralInstrumentSemitones,
  type ProceduralHarmonyTheme,
} from './procedural-music-harmony.ts';

const TEST_THEME: ProceduralHarmonyTheme = {
  id: 'test-harmony-theme',
  scale: [0, 3, 5, 7, 10, 12],
  stepPattern: [0, 2, 4, 2, 5, 4, 2, 0],
};

describe('procedural music harmony question cadence', () => {
  it('keeps strong question-cadence beats on unstable chord tones while weak beats can use passing tones', () => {
    const sampledSteps = [28, 29, 30, 31].map((stepIndex) => {
      const composition = resolveProceduralCompositionStep(
        TEST_THEME,
        stepIndex,
        3,
        -2
      );
      const semitones = resolveProceduralInstrumentSemitones({
        theme: TEST_THEME,
        role: 'lead',
        stepIndex,
        clusterX: 3,
        clusterY: -2,
      });

      return {
        stepIndex,
        semitones: ((semitones % 12) + 12) % 12,
        chord: composition.chord,
        cadence: composition.cadence,
      };
    });

    for (const entry of sampledSteps) {
      expect(entry.cadence).toBe('question');
    }

    const strongQuestionSteps = sampledSteps.filter(
      (entry) => entry.stepIndex % 4 === 0 || entry.stepIndex % 4 === 2
    );
    const weakQuestionSteps = sampledSteps.filter(
      (entry) => entry.stepIndex % 4 === 1 || entry.stepIndex % 4 === 3
    );

    for (const entry of strongQuestionSteps) {
      expect([
        ((entry.chord.thirdSemitones % 12) + 12) % 12,
        ((entry.chord.fifthSemitones % 12) + 12) % 12,
      ]).toContain(entry.semitones);
      expect(entry.semitones).not.toBe(
        ((entry.chord.passingSemitones % 12) + 12) % 12
      );
    }

    for (const entry of weakQuestionSteps) {
      expect([
        ((entry.chord.passingSemitones % 12) + 12) % 12,
        ((entry.chord.thirdSemitones % 12) + 12) % 12,
      ]).toContain(entry.semitones);
      expect(entry.semitones).not.toBe(
        ((entry.chord.rootSemitones % 12) + 12) % 12
      );
    }
  });
});
