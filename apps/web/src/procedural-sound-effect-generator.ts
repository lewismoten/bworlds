import { createRandom } from '@bworlds/core';

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
  frequency: number;
  durationMs: number;
  volume: number;
  waveform: SoundWaveform;
  noiseColor?: ProceduralNoiseColor;
  envelope?: ProceduralAmplitudeEnvelope;
  sweeps?: ProceduralSoundFrequencySweep[];
  layers?: ProceduralSoundEffectLayer[];
  emitter?: SoundPosition;
  listener?: SoundPosition;
  seed?: number;
  recipeId?: string;
};

export type ProceduralSoundEffectLayer = {
  id: string;
  frequency: number;
  durationMs: number;
  volume: number;
  waveform: SoundWaveform;
  noiseColor?: ProceduralNoiseColor;
  envelope?: ProceduralAmplitudeEnvelope;
  sweeps?: ProceduralSoundFrequencySweep[];
};

export type ProceduralAmplitudeEnvelope = {
  attackMs: number;
  decayMs: number;
  sustainLevel: number;
  releaseMs: number;
};

export type ProceduralSoundFrequencySweepCurve = 'linear' | 'exponential';

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

export type ProceduralSoundFrequencySweepRecipe = {
  curve: ProceduralSoundFrequencySweepCurve;
  targetMultiplier?: number;
  targetFrequency?: number;
  targetVariation?: number;
  atProgress: number;
};

export type ProceduralSoundLayerRecipe = {
  id: string;
  waveform: SoundWaveform | readonly SoundWaveform[];
  noiseColor?: ProceduralNoiseColor | readonly ProceduralNoiseColor[];
  frequencyMultiplier?: number;
  frequencyOffset?: number;
  durationMultiplier?: number;
  volumeMultiplier?: number;
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
      const frequency = clampValue(
        varyScalar(
          recipe.baseFrequency,
          recipe.frequencyVariation ?? 0,
          variationDepth,
          random
        ),
        recipe.minFrequency ?? 20,
        recipe.maxFrequency ?? 20_000
      );
      const durationMs = clampValue(
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
      const volume = clampValue(
        varyScalar(
          recipe.baseVolume,
          recipe.volumeVariation ?? 0,
          variationDepth,
          random
        ),
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

      return {
        kind,
        nowMs,
        frequency,
        durationMs,
        volume,
        waveform,
        noiseColor,
        envelope,
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
    const frequency = clampValue(
      varyScalar(
        baseFrequency,
        layerRecipe.frequencyVariation ?? 0,
        variationDepth,
        random
      ),
      layerRecipe.minFrequency ?? 20,
      layerRecipe.maxFrequency ?? 20_000
    );
    const durationMs = clampValue(
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
    const volume = clampValue(
      varyScalar(
        baseVolume,
        layerRecipe.volumeVariation ?? 0,
        variationDepth,
        random
      ),
      layerRecipe.minVolume ?? 0.0001,
      layerRecipe.maxVolume ?? 1
    );

    layers.push({
      id: layerRecipe.id,
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
