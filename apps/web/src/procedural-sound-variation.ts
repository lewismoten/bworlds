export type ProceduralSoundCoreVariation = {
  baseFrequency: number;
  baseDurationMs: number;
  baseVolume: number;
  frequency: number;
  durationMs: number;
  volume: number;
  frequencyVariation: number;
  durationVariation: number;
  volumeVariation: number;
  variationDepth: number;
};

const MAX_COMBINED_VARIATION_DRIFT = 2.15;
const MAX_PITCH_TIMING_VARIATION_DRIFT = 1.5;

export function constrainProceduralSoundCoreVariation(
  options: ProceduralSoundCoreVariation
): {
  frequency: number;
  durationMs: number;
  volume: number;
} {
  const frequencyScale = options.frequencyVariation * options.variationDepth;
  const durationScale = options.durationVariation * options.variationDepth;
  const volumeScale = options.volumeVariation * options.variationDepth;
  const normalizedFrequency = normalizeVariation(
    options.baseFrequency,
    options.frequency,
    frequencyScale
  );
  const normalizedDuration = normalizeVariation(
    options.baseDurationMs,
    options.durationMs,
    durationScale
  );
  const normalizedVolume = normalizeVariation(
    options.baseVolume,
    options.volume,
    volumeScale
  );
  const combinedDrift =
    Math.abs(normalizedFrequency) +
    Math.abs(normalizedDuration) +
    Math.abs(normalizedVolume);
  const pitchTimingDrift =
    Math.abs(normalizedFrequency) + Math.abs(normalizedDuration);
  let scale = 1;

  if (combinedDrift > MAX_COMBINED_VARIATION_DRIFT) {
    scale = Math.min(scale, MAX_COMBINED_VARIATION_DRIFT / combinedDrift);
  }
  if (pitchTimingDrift > MAX_PITCH_TIMING_VARIATION_DRIFT) {
    scale = Math.min(
      scale,
      MAX_PITCH_TIMING_VARIATION_DRIFT / pitchTimingDrift
    );
  }

  if (scale >= 1) {
    return {
      frequency: options.frequency,
      durationMs: options.durationMs,
      volume: options.volume,
    };
  }

  return {
    frequency: applyNormalizedVariation(
      options.baseFrequency,
      frequencyScale,
      normalizedFrequency * scale
    ),
    durationMs: applyNormalizedVariation(
      options.baseDurationMs,
      durationScale,
      normalizedDuration * scale
    ),
    volume: applyNormalizedVariation(
      options.baseVolume,
      volumeScale,
      normalizedVolume * scale
    ),
  };
}

function normalizeVariation(
  baseValue: number,
  resolvedValue: number,
  variationScale: number
): number {
  if (
    !Number.isFinite(baseValue) ||
    baseValue <= 0 ||
    !Number.isFinite(resolvedValue) ||
    !Number.isFinite(variationScale) ||
    variationScale <= 0
  ) {
    return 0;
  }

  return (resolvedValue / baseValue - 1) / variationScale;
}

function applyNormalizedVariation(
  baseValue: number,
  variationScale: number,
  normalizedValue: number
): number {
  if (
    !Number.isFinite(baseValue) ||
    baseValue <= 0 ||
    !Number.isFinite(variationScale) ||
    variationScale <= 0
  ) {
    return Math.max(0, baseValue);
  }

  return baseValue * (1 + normalizedValue * variationScale);
}
