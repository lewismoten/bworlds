import { describe, expect, it } from 'vitest';
import {
  PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT,
  PROCEDURAL_MUSIC_STEPS_PER_MEASURE,
  resolveProceduralPhraseCadence,
  resolveProceduralPhraseStep,
} from './procedural-music-phrase-structure.ts';

describe('procedural music phrase structure', () => {
  it('reserves the cadence windows for the midpoint and end of each eight-measure phrase', () => {
    const phraseStepCount =
      PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT *
      PROCEDURAL_MUSIC_STEPS_PER_MEASURE;

    expect(
      [27, 32, 59].every(
        (stepIndex) =>
          resolveProceduralPhraseCadence({
            themeStepCount: PROCEDURAL_MUSIC_STEPS_PER_MEASURE,
            stepIndex,
          }) === 'neutral'
      )
    ).toBe(true);
    expect(
      [28, 29, 30, 31].every(
        (stepIndex) =>
          resolveProceduralPhraseCadence({
            themeStepCount: PROCEDURAL_MUSIC_STEPS_PER_MEASURE,
            stepIndex,
          }) === 'question'
      )
    ).toBe(true);
    expect(
      [60, 61, 62, 63, 60 + phraseStepCount].every(
        (stepIndex) =>
          resolveProceduralPhraseCadence({
            themeStepCount: PROCEDURAL_MUSIC_STEPS_PER_MEASURE,
            stepIndex,
          }) === 'answer'
      )
    ).toBe(true);
  });

  it('wraps phrase-local step positions across phrase boundaries', () => {
    const themeStepCount = PROCEDURAL_MUSIC_STEPS_PER_MEASURE;
    const phraseStepCount =
      PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT *
      PROCEDURAL_MUSIC_STEPS_PER_MEASURE;

    expect(
      resolveProceduralPhraseStep({
        themeStepCount,
        stepIndex: phraseStepCount + 5,
      })
    ).toBe(5);
    expect(
      resolveProceduralPhraseStep({
        themeStepCount,
        stepIndex: -1,
      })
    ).toBe(phraseStepCount - 1);
  });
});
