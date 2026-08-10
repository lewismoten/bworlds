export const PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT = 8;
export const PROCEDURAL_MUSIC_STEPS_PER_MEASURE = 8;

const PROCEDURAL_MUSIC_CADENCE_WINDOW_STEPS = 4;

export function resolveProceduralPhraseCadence(options: {
  themeStepCount: number;
  stepIndex: number;
}): 'question' | 'answer' | 'neutral' {
  const phraseStepCount = resolveProceduralPhraseStepCount(
    options.themeStepCount
  );
  const phraseStep = resolveProceduralPhraseStep(options);
  const questionEndStep = Math.max(0, Math.floor(phraseStepCount / 2) - 1);
  const questionStartStep = Math.max(
    0,
    questionEndStep - (PROCEDURAL_MUSIC_CADENCE_WINDOW_STEPS - 1)
  );
  const answerEndStep = phraseStepCount - 1;
  const answerStartStep = Math.max(
    questionEndStep + 1,
    answerEndStep - (PROCEDURAL_MUSIC_CADENCE_WINDOW_STEPS - 1)
  );

  if (phraseStep >= questionStartStep && phraseStep <= questionEndStep) {
    return 'question';
  }
  if (phraseStep >= answerStartStep && phraseStep <= answerEndStep) {
    return 'answer';
  }

  return 'neutral';
}

export function resolveProceduralPhraseStepCount(
  themeStepCount: number
): number {
  return Math.max(1, themeStepCount) * PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT;
}

export function resolveProceduralPhraseStep(options: {
  themeStepCount: number;
  stepIndex: number;
}): number {
  const phraseStepCount = resolveProceduralPhraseStepCount(
    options.themeStepCount
  );
  return (
    ((options.stepIndex % phraseStepCount) + phraseStepCount) % phraseStepCount
  );
}
