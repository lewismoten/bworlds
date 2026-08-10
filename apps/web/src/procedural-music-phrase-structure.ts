export const PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT = 8;
export const PROCEDURAL_MUSIC_STEPS_PER_MEASURE = 8;

const PROCEDURAL_MUSIC_CADENCE_WINDOW_STEPS = 4;

export function resolveProceduralPhraseCadence(options: {
  themeStepCount: number;
  stepIndex: number;
}): 'question' | 'answer' | 'neutral' {
  const phraseStepCount =
    Math.max(1, options.themeStepCount) * PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT;
  const phraseStep =
    ((options.stepIndex % phraseStepCount) + phraseStepCount) % phraseStepCount;
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
