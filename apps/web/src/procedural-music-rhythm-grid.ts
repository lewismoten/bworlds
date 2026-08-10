export type ProceduralRhythmicGridTheme = {
  noteDurationMs: number;
  rhythmPattern: readonly number[];
};

export type ProceduralRhythmicGridStep = {
  stepDurationMultiplier: number;
  stepDurationMs: number;
};

export function resolveProceduralRhythmicGridStep(options: {
  theme: ProceduralRhythmicGridTheme;
  stepIndex: number;
  tempoMultiplier: number;
}): ProceduralRhythmicGridStep {
  const stepDurationMultiplier =
    options.theme.rhythmPattern[
      options.stepIndex % options.theme.rhythmPattern.length
    ] ?? 1;

  return {
    stepDurationMultiplier,
    stepDurationMs:
      (options.theme.noteDurationMs * stepDurationMultiplier) /
      Math.max(0.01, options.tempoMultiplier),
  };
}
