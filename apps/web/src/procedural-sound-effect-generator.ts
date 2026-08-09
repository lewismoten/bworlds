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
  emitter?: SoundPosition;
  listener?: SoundPosition;
  seed?: number;
  recipeId?: string;
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

      return {
        kind,
        nowMs,
        frequency,
        durationMs,
        volume,
        waveform,
        noiseColor,
        emitter,
        listener,
        seed,
        recipeId: recipe.id,
      };
    },
  };
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
