import { createRandom } from '@bworlds/core';
import { constrainProceduralSoundCoreVariation } from './procedural-sound-variation.ts';

export type SoundEffectKind =
  | 'footstep'
  | 'jump'
  | 'landing'
  | 'blocked'
  | 'open'
  | 'close'
  | 'wind'
  | 'ocean'
  | 'river-ambience'
  | 'forest-ambience'
  | 'plains-ambience'
  | 'mountain-ambience'
  | 'cave-ambience'
  | 'settlement-ambience'
  | 'ruins-ambience'
  | 'advancement'
  | 'train-engine'
  | 'train-whistle'
  | 'paddle-calliope'
  | 'steam-whistle'
  | 'combat-weapon'
  | 'combat-magic';

export type SoundWaveform = OscillatorType;
export type ProceduralNoiseColor = 'white' | 'pink' | 'brown';

export type SoundPosition = { x: number; y: number };

export type ProceduralSoundEffect = {
  kind: SoundEffectKind;
  nowMs: number;
  startOffsetMs?: number;
  frequency: number;
  durationMs: number;
  volume: number;
  waveform: SoundWaveform;
  noiseColor?: ProceduralNoiseColor;
  envelope?: ProceduralAmplitudeEnvelope;
  pitchEnvelope?: ProceduralPitchEnvelope;
  filters?: ProceduralSoundFilter[];
  distortion?: ProceduralSoundDistortion;
  delay?: ProceduralSoundDelay;
  reverb?: ProceduralSoundReverb;
  tremolo?: ProceduralSoundTremolo;
  vibrato?: ProceduralSoundVibrato;
  frequencyModulation?: ProceduralSoundFrequencyModulation;
  ringModulation?: ProceduralSoundRingModulation;
  sweeps?: ProceduralSoundFrequencySweep[];
  layers?: ProceduralSoundEffectLayer[];
  emitter?: SoundPosition;
  listener?: SoundPosition;
  seed?: number;
  recipeId?: string;
};

export type ProceduralSoundEffectLayer = {
  id: string;
  startOffsetMs: number;
  frequency: number;
  durationMs: number;
  volume: number;
  waveform: SoundWaveform;
  noiseColor?: ProceduralNoiseColor;
  envelope?: ProceduralAmplitudeEnvelope;
  pitchEnvelope?: ProceduralPitchEnvelope;
  filters?: ProceduralSoundFilter[];
  distortion?: ProceduralSoundDistortion;
  delay?: ProceduralSoundDelay;
  reverb?: ProceduralSoundReverb;
  tremolo?: ProceduralSoundTremolo;
  vibrato?: ProceduralSoundVibrato;
  frequencyModulation?: ProceduralSoundFrequencyModulation;
  ringModulation?: ProceduralSoundRingModulation;
  sweeps?: ProceduralSoundFrequencySweep[];
};

export type ProceduralAmplitudeEnvelope = {
  attackMs: number;
  decayMs: number;
  sustainLevel: number;
  releaseMs: number;
};

export type ProceduralPitchEnvelope = {
  attackMs: number;
  decayMs: number;
  peakMultiplier: number;
  sustainMultiplier: number;
  releaseMs: number;
  releaseTargetMultiplier: number;
};

export type ProceduralSoundFrequencySweepCurve = 'linear' | 'exponential';

export type ProceduralSoundFilterType =
  'lowpass' | 'highpass' | 'bandpass' | 'notch';

export type ProceduralSoundFilter = {
  type: ProceduralSoundFilterType;
  frequency: number;
  q?: number;
  gain?: number;
  envelope?: ProceduralSoundFilterEnvelope;
};

export type ProceduralSoundFilterEnvelope = {
  attackMs: number;
  decayMs: number;
  releaseMs: number;
  peakFrequencyMultiplier: number;
  sustainFrequencyMultiplier: number;
  releaseFrequencyMultiplier: number;
  peakQMultiplier?: number;
  sustainQMultiplier?: number;
  releaseQMultiplier?: number;
  peakGainMultiplier?: number;
  sustainGainMultiplier?: number;
  releaseGainMultiplier?: number;
};

export type ProceduralSoundDistortionMode = 'distortion' | 'saturation';

export type ProceduralSoundDistortion = {
  mode: ProceduralSoundDistortionMode;
  amount: number;
  outputGain: number;
};

export type ProceduralSoundDelay = {
  timeMs: number;
  feedback: number;
  mix: number;
};

export type ProceduralSoundReverb = {
  profileId: string;
  decayMs: number;
  mix: number;
  preDelayMs: number;
  toneHz: number;
};

export type ProceduralSoundTremolo = {
  rateHz: number;
  depth: number;
  waveform: SoundWaveform;
};

export type ProceduralSoundVibrato = {
  rateHz: number;
  depthHz: number;
  waveform: SoundWaveform;
};

export type ProceduralSoundFrequencyModulation = {
  modulatorFrequencyHz: number;
  depthHz: number;
  waveform: SoundWaveform;
};

export type ProceduralSoundRingModulation = {
  modulatorFrequencyHz: number;
  depth: number;
  waveform: SoundWaveform;
};

export type ProceduralSoundFrequencySweep = {
  curve: ProceduralSoundFrequencySweepCurve;
  targetMultiplier?: number;
  targetFrequency?: number;
  atProgress: number;
};

export type ProceduralSoundRecipe = {
  id: string;
  baseFrequency: number;
  baseDurationMs: number;
  baseVolume: number;
  waveform: SoundWaveform | readonly SoundWaveform[];
  noiseColor?: ProceduralNoiseColor | readonly ProceduralNoiseColor[];
  frequencyVariation?: number;
  durationVariation?: number;
  volumeVariation?: number;
  variationDepth?: number;
  minFrequency?: number;
  maxFrequency?: number;
  minDurationMs?: number;
  maxDurationMs?: number;
  minVolume?: number;
  maxVolume?: number;
  envelope?: ProceduralAmplitudeEnvelopeRecipe;
  pitchEnvelope?: ProceduralPitchEnvelopeRecipe;
  filters?: readonly ProceduralSoundFilterRecipe[];
  distortion?: ProceduralSoundDistortionRecipe;
  delay?: ProceduralSoundDelayRecipe;
  reverb?: ProceduralSoundReverbRecipe;
  tremolo?: ProceduralSoundTremoloRecipe;
  vibrato?: ProceduralSoundVibratoRecipe;
  frequencyModulation?: ProceduralSoundFrequencyModulationRecipe;
  ringModulation?: ProceduralSoundRingModulationRecipe;
  sweeps?: readonly ProceduralSoundFrequencySweepRecipe[];
  layers?: readonly ProceduralSoundLayerRecipe[];
};

export type ProceduralAmplitudeEnvelopeRecipe = {
  attackMs: number;
  decayMs: number;
  sustainLevel: number;
  releaseMs: number;
  attackVariation?: number;
  decayVariation?: number;
  sustainVariation?: number;
  releaseVariation?: number;
};

export type ProceduralPitchEnvelopeRecipe = {
  attackMs: number;
  decayMs: number;
  peakMultiplier: number;
  sustainMultiplier: number;
  releaseMs: number;
  releaseTargetMultiplier: number;
  attackVariation?: number;
  decayVariation?: number;
  peakVariation?: number;
  sustainVariation?: number;
  releaseVariation?: number;
  releaseTargetVariation?: number;
};

export type ProceduralSoundFrequencySweepRecipe = {
  curve: ProceduralSoundFrequencySweepCurve;
  targetMultiplier?: number;
  targetFrequency?: number;
  targetVariation?: number;
  atProgress: number;
};

export type ProceduralSoundFilterRecipe = {
  type: ProceduralSoundFilterType;
  frequency: number;
  q?: number;
  gain?: number;
  frequencyVariation?: number;
  qVariation?: number;
  gainVariation?: number;
  envelope?: ProceduralSoundFilterEnvelopeRecipe;
};

export type ProceduralSoundFilterEnvelopeRecipe = {
  attackMs: number;
  decayMs: number;
  releaseMs: number;
  peakFrequencyMultiplier: number;
  sustainFrequencyMultiplier: number;
  releaseFrequencyMultiplier: number;
  peakQMultiplier?: number;
  sustainQMultiplier?: number;
  releaseQMultiplier?: number;
  peakGainMultiplier?: number;
  sustainGainMultiplier?: number;
  releaseGainMultiplier?: number;
  attackVariation?: number;
  decayVariation?: number;
  releaseVariation?: number;
  peakFrequencyVariation?: number;
  sustainFrequencyVariation?: number;
  releaseFrequencyVariation?: number;
  peakQVariation?: number;
  sustainQVariation?: number;
  releaseQVariation?: number;
  peakGainVariation?: number;
  sustainGainVariation?: number;
  releaseGainVariation?: number;
};

export type ProceduralSoundDistortionRecipe = {
  mode: ProceduralSoundDistortionMode;
  amount: number;
  outputGain: number;
  amountVariation?: number;
  outputGainVariation?: number;
};

export type ProceduralSoundDelayRecipe = {
  timeMs: number;
  feedback: number;
  mix: number;
  timeVariation?: number;
  feedbackVariation?: number;
  mixVariation?: number;
};

export type ProceduralSoundReverbRecipe = {
  profileId: string;
  decayMs: number;
  mix: number;
  preDelayMs: number;
  toneHz: number;
  decayVariation?: number;
  mixVariation?: number;
  preDelayVariation?: number;
  toneVariation?: number;
};

export type ProceduralSoundTremoloRecipe = {
  rateHz: number;
  depth: number;
  waveform: SoundWaveform | readonly SoundWaveform[];
  rateVariation?: number;
  depthVariation?: number;
};

export type ProceduralSoundVibratoRecipe = {
  rateHz: number;
  depthHz: number;
  waveform: SoundWaveform | readonly SoundWaveform[];
  rateVariation?: number;
  depthVariation?: number;
};

export type ProceduralSoundFrequencyModulationRecipe = {
  modulatorFrequencyHz: number;
  depthHz: number;
  waveform: SoundWaveform | readonly SoundWaveform[];
  rateVariation?: number;
  depthVariation?: number;
};

export type ProceduralSoundRingModulationRecipe = {
  modulatorFrequencyHz: number;
  depth: number;
  waveform: SoundWaveform | readonly SoundWaveform[];
  rateVariation?: number;
  depthVariation?: number;
};

export type ProceduralSoundLayerRecipe = {
  id: string;
  startOffsetMs?: number;
  waveform: SoundWaveform | readonly SoundWaveform[];
  noiseColor?: ProceduralNoiseColor | readonly ProceduralNoiseColor[];
  frequencyMultiplier?: number;
  frequencyOffset?: number;
  durationMultiplier?: number;
  volumeMultiplier?: number;
  frequencyVariation?: number;
  durationVariation?: number;
  volumeVariation?: number;
  startOffsetVariation?: number;
  variationDepth?: number;
  minFrequency?: number;
  maxFrequency?: number;
  minDurationMs?: number;
  maxDurationMs?: number;
  minVolume?: number;
  maxVolume?: number;
  envelope?: ProceduralAmplitudeEnvelopeRecipe;
  pitchEnvelope?: ProceduralPitchEnvelopeRecipe;
  filters?: readonly ProceduralSoundFilterRecipe[];
  distortion?: ProceduralSoundDistortionRecipe;
  delay?: ProceduralSoundDelayRecipe;
  reverb?: ProceduralSoundReverbRecipe;
  tremolo?: ProceduralSoundTremoloRecipe;
  vibrato?: ProceduralSoundVibratoRecipe;
  frequencyModulation?: ProceduralSoundFrequencyModulationRecipe;
  ringModulation?: ProceduralSoundRingModulationRecipe;
  sweeps?: readonly ProceduralSoundFrequencySweepRecipe[];
};

export type ProceduralSoundEffectGenerator = {
  generate(options: {
    kind: SoundEffectKind;
    nowMs: number;
    seed: number;
    recipe: ProceduralSoundRecipe;
    emitter?: SoundPosition;
    listener?: SoundPosition;
  }): ProceduralSoundEffect;
};

export function createProceduralSoundEffectGenerator(): ProceduralSoundEffectGenerator {
  return {
    generate({ kind, nowMs, seed, recipe, emitter, listener }) {
      const random = createRandom(seed);
      const variationDepth = clampVariationDepth(recipe.variationDepth ?? 1);
      const waveform = resolveWaveform(recipe.waveform, random);
      const noiseColor = resolveNoiseColor(recipe.noiseColor, random);
      const unconstrainedFrequency = clampValue(
        varyScalar(
          recipe.baseFrequency,
          recipe.frequencyVariation ?? 0,
          variationDepth,
          random
        ),
        recipe.minFrequency ?? 20,
        recipe.maxFrequency ?? 20_000
      );
      const unconstrainedDurationMs = clampValue(
        Math.round(
          varyScalar(
            recipe.baseDurationMs,
            recipe.durationVariation ?? 0,
            variationDepth,
            random
          )
        ),
        recipe.minDurationMs ?? 20,
        recipe.maxDurationMs ?? Number.POSITIVE_INFINITY
      );
      const unconstrainedVolume = clampValue(
        varyScalar(
          recipe.baseVolume,
          recipe.volumeVariation ?? 0,
          variationDepth,
          random
        ),
        recipe.minVolume ?? 0.0001,
        recipe.maxVolume ?? 1
      );
      const constrainedCore = constrainProceduralSoundCoreVariation({
        baseFrequency: recipe.baseFrequency,
        baseDurationMs: recipe.baseDurationMs,
        baseVolume: recipe.baseVolume,
        frequency: unconstrainedFrequency,
        durationMs: unconstrainedDurationMs,
        volume: unconstrainedVolume,
        frequencyVariation: recipe.frequencyVariation ?? 0,
        durationVariation: recipe.durationVariation ?? 0,
        volumeVariation: recipe.volumeVariation ?? 0,
        variationDepth,
      });
      const frequency = clampValue(
        constrainedCore.frequency,
        recipe.minFrequency ?? 20,
        recipe.maxFrequency ?? 20_000
      );
      const durationMs = clampValue(
        Math.round(constrainedCore.durationMs),
        recipe.minDurationMs ?? 20,
        recipe.maxDurationMs ?? Number.POSITIVE_INFINITY
      );
      const volume = clampValue(
        constrainedCore.volume,
        recipe.minVolume ?? 0.0001,
        recipe.maxVolume ?? 1
      );
      const layers = resolveEffectLayers(
        recipe.layers,
        {
          frequency,
          durationMs,
          volume,
        },
        variationDepth,
        random
      );
      const sweeps = resolveFrequencySweeps(
        recipe.sweeps,
        frequency,
        variationDepth,
        random
      );
      const envelope = resolveAmplitudeEnvelope(
        recipe.envelope,
        variationDepth,
        random
      );
      const pitchEnvelope = resolvePitchEnvelope(
        recipe.pitchEnvelope,
        variationDepth,
        random
      );
      const filters = resolveSoundFilters(
        recipe.filters,
        variationDepth,
        random
      );
      const distortion = resolveSoundDistortion(
        recipe.distortion,
        variationDepth,
        random
      );
      const delay = resolveSoundDelay(recipe.delay, variationDepth, random);
      const reverb = resolveSoundReverb(recipe.reverb, variationDepth, random);
      const tremolo = resolveSoundTremolo(
        recipe.tremolo,
        variationDepth,
        random
      );
      const vibrato = resolveSoundVibrato(
        recipe.vibrato,
        variationDepth,
        random
      );
      const frequencyModulation = resolveSoundFrequencyModulation(
        recipe.frequencyModulation,
        variationDepth,
        random
      );
      const ringModulation = resolveSoundRingModulation(
        recipe.ringModulation,
        variationDepth,
        random
      );

      return {
        kind,
        nowMs,
        startOffsetMs: 0,
        frequency,
        durationMs,
        volume,
        waveform,
        noiseColor,
        envelope,
        pitchEnvelope,
        filters,
        distortion,
        delay,
        reverb,
        tremolo,
        vibrato,
        frequencyModulation,
        ringModulation,
        sweeps,
        layers,
        emitter,
        listener,
        seed,
        recipeId: recipe.id,
      };
    },
  };
}

function resolveEffectLayers(
  layerRecipes: readonly ProceduralSoundLayerRecipe[] | undefined,
  base: {
    frequency: number;
    durationMs: number;
    volume: number;
  },
  parentVariationDepth: number,
  random: () => number
): ProceduralSoundEffectLayer[] | undefined {
  if (!layerRecipes || layerRecipes.length === 0) {
    return undefined;
  }

  const layers: ProceduralSoundEffectLayer[] = [];
  for (const layerRecipe of layerRecipes) {
    const variationDepth = clampVariationDepth(
      layerRecipe.variationDepth ?? parentVariationDepth
    );
    const waveform = resolveWaveform(layerRecipe.waveform, random);
    const noiseColor = resolveNoiseColor(layerRecipe.noiseColor, random);
    const baseFrequency =
      base.frequency * (layerRecipe.frequencyMultiplier ?? 1) +
      (layerRecipe.frequencyOffset ?? 0);
    const baseDurationMs =
      base.durationMs * (layerRecipe.durationMultiplier ?? 1);
    const baseVolume = base.volume * (layerRecipe.volumeMultiplier ?? 1);
    const startOffsetMs = Math.max(
      0,
      varyScalar(
        layerRecipe.startOffsetMs ?? 0,
        layerRecipe.startOffsetVariation ?? 0,
        variationDepth,
        random
      )
    );
    const unconstrainedFrequency = clampValue(
      varyScalar(
        baseFrequency,
        layerRecipe.frequencyVariation ?? 0,
        variationDepth,
        random
      ),
      layerRecipe.minFrequency ?? 20,
      layerRecipe.maxFrequency ?? 20_000
    );
    const unconstrainedDurationMs = clampValue(
      Math.round(
        varyScalar(
          baseDurationMs,
          layerRecipe.durationVariation ?? 0,
          variationDepth,
          random
        )
      ),
      layerRecipe.minDurationMs ?? 20,
      layerRecipe.maxDurationMs ?? Number.POSITIVE_INFINITY
    );
    const unconstrainedVolume = clampValue(
      varyScalar(
        baseVolume,
        layerRecipe.volumeVariation ?? 0,
        variationDepth,
        random
      ),
      layerRecipe.minVolume ?? 0.0001,
      layerRecipe.maxVolume ?? 1
    );
    const constrainedCore = constrainProceduralSoundCoreVariation({
      baseFrequency,
      baseDurationMs,
      baseVolume,
      frequency: unconstrainedFrequency,
      durationMs: unconstrainedDurationMs,
      volume: unconstrainedVolume,
      frequencyVariation: layerRecipe.frequencyVariation ?? 0,
      durationVariation: layerRecipe.durationVariation ?? 0,
      volumeVariation: layerRecipe.volumeVariation ?? 0,
      variationDepth,
    });
    const frequency = clampValue(
      constrainedCore.frequency,
      layerRecipe.minFrequency ?? 20,
      layerRecipe.maxFrequency ?? 20_000
    );
    const durationMs = clampValue(
      Math.round(constrainedCore.durationMs),
      layerRecipe.minDurationMs ?? 20,
      layerRecipe.maxDurationMs ?? Number.POSITIVE_INFINITY
    );
    const volume = clampValue(
      constrainedCore.volume,
      layerRecipe.minVolume ?? 0.0001,
      layerRecipe.maxVolume ?? 1
    );

    layers.push({
      id: layerRecipe.id,
      startOffsetMs,
      frequency,
      durationMs,
      volume,
      waveform,
      noiseColor,
      envelope: resolveAmplitudeEnvelope(
        layerRecipe.envelope,
        variationDepth,
        random
      ),
      pitchEnvelope: resolvePitchEnvelope(
        layerRecipe.pitchEnvelope,
        variationDepth,
        random
      ),
      filters: resolveSoundFilters(layerRecipe.filters, variationDepth, random),
      distortion: resolveSoundDistortion(
        layerRecipe.distortion,
        variationDepth,
        random
      ),
      delay: resolveSoundDelay(layerRecipe.delay, variationDepth, random),
      reverb: resolveSoundReverb(layerRecipe.reverb, variationDepth, random),
      tremolo: resolveSoundTremolo(layerRecipe.tremolo, variationDepth, random),
      vibrato: resolveSoundVibrato(layerRecipe.vibrato, variationDepth, random),
      frequencyModulation: resolveSoundFrequencyModulation(
        layerRecipe.frequencyModulation,
        variationDepth,
        random
      ),
      ringModulation: resolveSoundRingModulation(
        layerRecipe.ringModulation,
        variationDepth,
        random
      ),
      sweeps: resolveFrequencySweeps(
        layerRecipe.sweeps,
        frequency,
        variationDepth,
        random
      ),
    });
  }

  return layers;
}

function resolvePitchEnvelope(
  envelopeRecipe: ProceduralPitchEnvelopeRecipe | undefined,
  variationDepth: number,
  random: () => number
): ProceduralPitchEnvelope | undefined {
  if (!envelopeRecipe) {
    return undefined;
  }

  return {
    attackMs: Math.max(
      0,
      varyScalar(
        envelopeRecipe.attackMs,
        envelopeRecipe.attackVariation ?? 0,
        variationDepth,
        random
      )
    ),
    decayMs: Math.max(
      0,
      varyScalar(
        envelopeRecipe.decayMs,
        envelopeRecipe.decayVariation ?? 0,
        variationDepth,
        random
      )
    ),
    peakMultiplier: Math.max(
      0.0001,
      varyScalar(
        envelopeRecipe.peakMultiplier,
        envelopeRecipe.peakVariation ?? 0,
        variationDepth,
        random
      )
    ),
    sustainMultiplier: Math.max(
      0.0001,
      varyScalar(
        envelopeRecipe.sustainMultiplier,
        envelopeRecipe.sustainVariation ?? 0,
        variationDepth,
        random
      )
    ),
    releaseMs: Math.max(
      0,
      varyScalar(
        envelopeRecipe.releaseMs,
        envelopeRecipe.releaseVariation ?? 0,
        variationDepth,
        random
      )
    ),
    releaseTargetMultiplier: Math.max(
      0.0001,
      varyScalar(
        envelopeRecipe.releaseTargetMultiplier,
        envelopeRecipe.releaseTargetVariation ?? 0,
        variationDepth,
        random
      )
    ),
  };
}

function resolveAmplitudeEnvelope(
  envelopeRecipe: ProceduralAmplitudeEnvelopeRecipe | undefined,
  variationDepth: number,
  random: () => number
): ProceduralAmplitudeEnvelope | undefined {
  if (!envelopeRecipe) {
    return undefined;
  }

  return {
    attackMs: Math.max(
      0,
      varyScalar(
        envelopeRecipe.attackMs,
        envelopeRecipe.attackVariation ?? 0,
        variationDepth,
        random
      )
    ),
    decayMs: Math.max(
      0,
      varyScalar(
        envelopeRecipe.decayMs,
        envelopeRecipe.decayVariation ?? 0,
        variationDepth,
        random
      )
    ),
    sustainLevel: clampValue(
      varyScalar(
        envelopeRecipe.sustainLevel,
        envelopeRecipe.sustainVariation ?? 0,
        variationDepth,
        random
      ),
      0,
      1
    ),
    releaseMs: Math.max(
      0,
      varyScalar(
        envelopeRecipe.releaseMs,
        envelopeRecipe.releaseVariation ?? 0,
        variationDepth,
        random
      )
    ),
  };
}

function resolveSoundFilters(
  filterRecipes: readonly ProceduralSoundFilterRecipe[] | undefined,
  variationDepth: number,
  random: () => number
): ProceduralSoundFilter[] | undefined {
  if (!filterRecipes || filterRecipes.length === 0) {
    return undefined;
  }

  const filters: ProceduralSoundFilter[] = [];
  for (const filterRecipe of filterRecipes) {
    filters.push({
      type: filterRecipe.type,
      frequency: clampValue(
        varyScalar(
          filterRecipe.frequency,
          filterRecipe.frequencyVariation ?? 0,
          variationDepth,
          random
        ),
        40,
        20_000
      ),
      q:
        typeof filterRecipe.q === 'number'
          ? Math.max(
              0.0001,
              varyScalar(
                filterRecipe.q,
                filterRecipe.qVariation ?? 0,
                variationDepth,
                random
              )
            )
          : undefined,
      gain:
        typeof filterRecipe.gain === 'number'
          ? clampValue(
              varyScalar(
                filterRecipe.gain,
                filterRecipe.gainVariation ?? 0,
                variationDepth,
                random
              ),
              -40,
              40
            )
          : undefined,
      envelope: resolveSoundFilterEnvelope(
        filterRecipe.envelope,
        variationDepth,
        random
      ),
    });
  }

  return filters;
}

function resolveSoundDistortion(
  distortionRecipe: ProceduralSoundDistortionRecipe | undefined,
  variationDepth: number,
  random: () => number
): ProceduralSoundDistortion | undefined {
  if (!distortionRecipe) {
    return undefined;
  }

  return {
    mode: distortionRecipe.mode,
    amount: clampValue(
      varyScalar(
        distortionRecipe.amount,
        distortionRecipe.amountVariation ?? 0,
        variationDepth,
        random
      ),
      0,
      1
    ),
    outputGain: clampValue(
      varyScalar(
        distortionRecipe.outputGain,
        distortionRecipe.outputGainVariation ?? 0,
        variationDepth,
        random
      ),
      0.05,
      2
    ),
  };
}

function resolveSoundDelay(
  delayRecipe: ProceduralSoundDelayRecipe | undefined,
  variationDepth: number,
  random: () => number
): ProceduralSoundDelay | undefined {
  if (!delayRecipe) {
    return undefined;
  }

  return {
    timeMs: clampValue(
      varyScalar(
        delayRecipe.timeMs,
        delayRecipe.timeVariation ?? 0,
        variationDepth,
        random
      ),
      1,
      5000
    ),
    feedback: clampValue(
      varyScalar(
        delayRecipe.feedback,
        delayRecipe.feedbackVariation ?? 0,
        variationDepth,
        random
      ),
      0,
      0.95
    ),
    mix: clampValue(
      varyScalar(
        delayRecipe.mix,
        delayRecipe.mixVariation ?? 0,
        variationDepth,
        random
      ),
      0,
      1
    ),
  };
}

function resolveSoundReverb(
  reverbRecipe: ProceduralSoundReverbRecipe | undefined,
  variationDepth: number,
  random: () => number
): ProceduralSoundReverb | undefined {
  if (!reverbRecipe) {
    return undefined;
  }

  return {
    profileId: reverbRecipe.profileId,
    decayMs: clampValue(
      varyScalar(
        reverbRecipe.decayMs,
        reverbRecipe.decayVariation ?? 0,
        variationDepth,
        random
      ),
      20,
      8_000
    ),
    mix: clampValue(
      varyScalar(
        reverbRecipe.mix,
        reverbRecipe.mixVariation ?? 0,
        variationDepth,
        random
      ),
      0,
      1
    ),
    preDelayMs: clampValue(
      varyScalar(
        reverbRecipe.preDelayMs,
        reverbRecipe.preDelayVariation ?? 0,
        variationDepth,
        random
      ),
      0,
      1_000
    ),
    toneHz: clampValue(
      varyScalar(
        reverbRecipe.toneHz,
        reverbRecipe.toneVariation ?? 0,
        variationDepth,
        random
      ),
      80,
      20_000
    ),
  };
}

function resolveSoundTremolo(
  tremoloRecipe: ProceduralSoundTremoloRecipe | undefined,
  variationDepth: number,
  random: () => number
): ProceduralSoundTremolo | undefined {
  if (!tremoloRecipe) {
    return undefined;
  }

  return {
    rateHz: clampValue(
      varyScalar(
        tremoloRecipe.rateHz,
        tremoloRecipe.rateVariation ?? 0,
        variationDepth,
        random
      ),
      0.1,
      40
    ),
    depth: clampValue(
      varyScalar(
        tremoloRecipe.depth,
        tremoloRecipe.depthVariation ?? 0,
        variationDepth,
        random
      ),
      0,
      1
    ),
    waveform: resolveWaveform(tremoloRecipe.waveform, random),
  };
}

function resolveSoundVibrato(
  vibratoRecipe: ProceduralSoundVibratoRecipe | undefined,
  variationDepth: number,
  random: () => number
): ProceduralSoundVibrato | undefined {
  if (!vibratoRecipe) {
    return undefined;
  }

  return {
    rateHz: clampValue(
      varyScalar(
        vibratoRecipe.rateHz,
        vibratoRecipe.rateVariation ?? 0,
        variationDepth,
        random
      ),
      0.1,
      40
    ),
    depthHz: clampValue(
      varyScalar(
        vibratoRecipe.depthHz,
        vibratoRecipe.depthVariation ?? 0,
        variationDepth,
        random
      ),
      0.01,
      2_000
    ),
    waveform: resolveWaveform(vibratoRecipe.waveform, random),
  };
}

function resolveSoundFrequencyModulation(
  frequencyModulationRecipe:
    ProceduralSoundFrequencyModulationRecipe | undefined,
  variationDepth: number,
  random: () => number
): ProceduralSoundFrequencyModulation | undefined {
  if (!frequencyModulationRecipe) {
    return undefined;
  }

  return {
    modulatorFrequencyHz: clampValue(
      varyScalar(
        frequencyModulationRecipe.modulatorFrequencyHz,
        frequencyModulationRecipe.rateVariation ?? 0,
        variationDepth,
        random
      ),
      0.1,
      20_000
    ),
    depthHz: clampValue(
      varyScalar(
        frequencyModulationRecipe.depthHz,
        frequencyModulationRecipe.depthVariation ?? 0,
        variationDepth,
        random
      ),
      0.01,
      20_000
    ),
    waveform: resolveWaveform(frequencyModulationRecipe.waveform, random),
  };
}

function resolveSoundRingModulation(
  ringModulationRecipe: ProceduralSoundRingModulationRecipe | undefined,
  variationDepth: number,
  random: () => number
): ProceduralSoundRingModulation | undefined {
  if (!ringModulationRecipe) {
    return undefined;
  }

  return {
    modulatorFrequencyHz: clampValue(
      varyScalar(
        ringModulationRecipe.modulatorFrequencyHz,
        ringModulationRecipe.rateVariation ?? 0,
        variationDepth,
        random
      ),
      0.1,
      20_000
    ),
    depth: clampValue(
      varyScalar(
        ringModulationRecipe.depth,
        ringModulationRecipe.depthVariation ?? 0,
        variationDepth,
        random
      ),
      0,
      1
    ),
    waveform: resolveWaveform(ringModulationRecipe.waveform, random),
  };
}

function resolveSoundFilterEnvelope(
  envelopeRecipe: ProceduralSoundFilterEnvelopeRecipe | undefined,
  variationDepth: number,
  random: () => number
): ProceduralSoundFilterEnvelope | undefined {
  if (!envelopeRecipe) {
    return undefined;
  }

  return {
    attackMs: Math.max(
      0,
      varyScalar(
        envelopeRecipe.attackMs,
        envelopeRecipe.attackVariation ?? 0,
        variationDepth,
        random
      )
    ),
    decayMs: Math.max(
      0,
      varyScalar(
        envelopeRecipe.decayMs,
        envelopeRecipe.decayVariation ?? 0,
        variationDepth,
        random
      )
    ),
    releaseMs: Math.max(
      0,
      varyScalar(
        envelopeRecipe.releaseMs,
        envelopeRecipe.releaseVariation ?? 0,
        variationDepth,
        random
      )
    ),
    peakFrequencyMultiplier: Math.max(
      0.0001,
      varyScalar(
        envelopeRecipe.peakFrequencyMultiplier,
        envelopeRecipe.peakFrequencyVariation ?? 0,
        variationDepth,
        random
      )
    ),
    sustainFrequencyMultiplier: Math.max(
      0.0001,
      varyScalar(
        envelopeRecipe.sustainFrequencyMultiplier,
        envelopeRecipe.sustainFrequencyVariation ?? 0,
        variationDepth,
        random
      )
    ),
    releaseFrequencyMultiplier: Math.max(
      0.0001,
      varyScalar(
        envelopeRecipe.releaseFrequencyMultiplier,
        envelopeRecipe.releaseFrequencyVariation ?? 0,
        variationDepth,
        random
      )
    ),
    peakQMultiplier: resolveOptionalFilterEnvelopeStage(
      envelopeRecipe.peakQMultiplier,
      envelopeRecipe.peakQVariation,
      variationDepth,
      random
    ),
    sustainQMultiplier: resolveOptionalFilterEnvelopeStage(
      envelopeRecipe.sustainQMultiplier,
      envelopeRecipe.sustainQVariation,
      variationDepth,
      random
    ),
    releaseQMultiplier: resolveOptionalFilterEnvelopeStage(
      envelopeRecipe.releaseQMultiplier,
      envelopeRecipe.releaseQVariation,
      variationDepth,
      random
    ),
    peakGainMultiplier: resolveOptionalFilterEnvelopeStage(
      envelopeRecipe.peakGainMultiplier,
      envelopeRecipe.peakGainVariation,
      variationDepth,
      random
    ),
    sustainGainMultiplier: resolveOptionalFilterEnvelopeStage(
      envelopeRecipe.sustainGainMultiplier,
      envelopeRecipe.sustainGainVariation,
      variationDepth,
      random
    ),
    releaseGainMultiplier: resolveOptionalFilterEnvelopeStage(
      envelopeRecipe.releaseGainMultiplier,
      envelopeRecipe.releaseGainVariation,
      variationDepth,
      random
    ),
  };
}

function resolveOptionalFilterEnvelopeStage(
  baseValue: number | undefined,
  variation: number | undefined,
  variationDepth: number,
  random: () => number
): number | undefined {
  if (typeof baseValue !== 'number') {
    return undefined;
  }

  return Math.max(
    0.0001,
    varyScalar(baseValue, variation ?? 0, variationDepth, random)
  );
}

function resolveFrequencySweeps(
  sweepRecipes: readonly ProceduralSoundFrequencySweepRecipe[] | undefined,
  baseFrequency: number,
  variationDepth: number,
  random: () => number
): ProceduralSoundFrequencySweep[] | undefined {
  if (!sweepRecipes || sweepRecipes.length === 0) {
    return undefined;
  }

  const sweeps: ProceduralSoundFrequencySweep[] = [];
  for (const sweepRecipe of sweepRecipes) {
    const targetFrequency =
      typeof sweepRecipe.targetFrequency === 'number'
        ? varyScalar(
            sweepRecipe.targetFrequency,
            sweepRecipe.targetVariation ?? 0,
            variationDepth,
            random
          )
        : undefined;
    sweeps.push({
      curve: sweepRecipe.curve,
      targetMultiplier: sweepRecipe.targetMultiplier,
      targetFrequency,
      atProgress: clampValue(sweepRecipe.atProgress, 0, 1),
    });
  }

  sweeps.sort((left, right) => left.atProgress - right.atProgress);
  return sweeps;
}

function resolveWaveform(
  waveform: SoundWaveform | readonly SoundWaveform[],
  random: () => number
): SoundWaveform {
  const waveformOptions = Array.isArray(waveform) ? waveform : null;

  if (waveformOptions) {
    if (waveformOptions.length === 0) {
      return 'sine';
    }
    const index = Math.min(
      waveformOptions.length - 1,
      Math.floor(random() * waveformOptions.length)
    );
    return waveformOptions[index] ?? 'sine';
  }

  return waveform as SoundWaveform;
}

function resolveNoiseColor(
  noiseColor:
    ProceduralNoiseColor | readonly ProceduralNoiseColor[] | undefined,
  random: () => number
): ProceduralNoiseColor | undefined {
  if (!noiseColor) {
    return undefined;
  }

  if (Array.isArray(noiseColor)) {
    if (noiseColor.length === 0) {
      return undefined;
    }
    const index = Math.min(
      noiseColor.length - 1,
      Math.floor(random() * noiseColor.length)
    );
    return noiseColor[index];
  }

  return noiseColor as ProceduralNoiseColor;
}

function varyScalar(
  baseValue: number,
  variation: number,
  variationDepth: number,
  random: () => number
): number {
  if (!Number.isFinite(baseValue) || baseValue <= 0) {
    return Math.max(0, baseValue);
  }
  if (!Number.isFinite(variation) || variation <= 0 || variationDepth <= 0) {
    return baseValue;
  }

  const centered = random() * 2 - 1;
  return baseValue * (1 + centered * variation * variationDepth);
}

function clampVariationDepth(value: number): number {
  return clampValue(value, 0, 1);
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
