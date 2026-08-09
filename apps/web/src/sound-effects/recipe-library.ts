import type {
  ProceduralNoiseColor,
  ProceduralSoundRecipe,
  SoundEffectKind,
  SoundWaveform,
} from '../procedural-sound-effect-generator.ts';

export type SoundRecipeSurfaceProfile = {
  cadenceMs: number;
  footstepFrequency: number;
  landingFrequency: number;
  footstepVolume: number;
  landingVolume: number;
  waveform: SoundWaveform;
};

export type SoundRecipeFamily =
  | 'movement'
  | 'interaction'
  | 'ambient-rain'
  | 'ambient-wind'
  | 'ambient-water'
  | 'ambient-wilds'
  | 'ambient-shelter'
  | 'progression'
  | 'vehicle-engine'
  | 'vehicle-whistle'
  | 'vehicle-melody'
  | 'combat-weapon'
  | 'combat-magic';

export type SoundIdentityDescriptor = {
  family: SoundRecipeFamily;
  signature: string;
};

type SoundVariationProfile = {
  frequencyVariation: number;
  durationVariation: number;
  volumeVariation: number;
  variationDepth: number;
  frequencyRangeRatio: number;
  durationRangeRatio: number;
  volumeRangeRatio: number;
};

type ResolveSoundRecipeOptions = {
  kind: SoundEffectKind;
  tileKind?: string;
  identityVariant?: string;
  profile: SoundRecipeSurfaceProfile;
  variantOffset: number;
  durationMsOverride?: number;
  resolveAdvancementFrequency(level?: number): number;
  resolveAmbientSoundFrequency(
    kind:
      | 'ocean'
      | 'river'
      | 'forest'
      | 'plains'
      | 'mountain'
      | 'cave'
      | 'settlement'
      | 'ruins',
    intensity?: number
  ): number;
  resolveInteractionFrequency(
    event: 'open' | 'close',
    tileKind: string | undefined,
    profile: SoundRecipeSurfaceProfile,
    variantOffset: number
  ): number;
  resolveInteractionWaveform(
    tileKind: string | undefined,
    fallback: SoundWaveform
  ): SoundWaveform;
  resolvePaddleBoatCalliopeFrequency(progress?: number): number;
  resolveSteamWhistleFrequency(whistlePhase?: 'arrival' | 'departure'): number;
};

type SoundLayerRecipe = NonNullable<ProceduralSoundRecipe['layers']>;

export const SOUND_IDENTITY_DESCRIPTORS: Record<
  SoundEffectKind,
  SoundIdentityDescriptor
> = {
  footstep: {
    family: 'movement',
    signature: 'short percussive footfall matched to the current surface',
  },
  jump: {
    family: 'movement',
    signature: 'lighter rising movement cue built from the same surface family',
  },
  landing: {
    family: 'movement',
    signature: 'heavier impact that resolves the matching movement surface',
  },
  blocked: {
    family: 'movement',
    signature: 'dry abrasive impact for movement obstruction feedback',
  },
  open: {
    family: 'interaction',
    signature: 'brief mechanical or wooden opening gesture',
  },
  close: {
    family: 'interaction',
    signature: 'brief mechanical or wooden closing gesture',
  },
  thunder: {
    family: 'ambient-wind',
    signature:
      'layered storm thunder with lightning crack, rolling rumble, and distant reflections',
  },
  rain: {
    family: 'ambient-rain',
    signature:
      'layered rainfall with surface-specific impacts and drifting wet texture',
  },
  hail: {
    family: 'ambient-rain',
    signature:
      'hard icy impacts that change character across roofs, water, stone, and foliage',
  },
  snowstorm: {
    family: 'ambient-wind',
    signature:
      'cold muffled storm wash with swirling snow and low whiteout movement',
  },
  wind: {
    family: 'ambient-wind',
    signature: 'broad airy wash with low drifting noise movement',
  },
  ocean: {
    family: 'ambient-water',
    signature: 'deep rolling surf with a warm low-frequency wash',
  },
  'river-ambience': {
    family: 'ambient-water',
    signature: 'quicker flowing water with a lighter textured splash bed',
  },
  'forest-ambience': {
    family: 'ambient-wilds',
    signature: 'leafy rustle with soft insect and branch-like texture',
  },
  'plains-ambience': {
    family: 'ambient-wilds',
    signature: 'open grassland wash with sparse bright movement',
  },
  'mountain-ambience': {
    family: 'ambient-wilds',
    signature: 'thin high air with rougher exposed terrain texture',
  },
  'cave-ambience': {
    family: 'ambient-shelter',
    signature: 'enclosed hollow ambience with darker resonant motion',
  },
  'settlement-ambience': {
    family: 'ambient-shelter',
    signature: 'soft organized bustle with restrained tonal body',
  },
  'ruins-ambience': {
    family: 'ambient-shelter',
    signature: 'brittle decayed ambience with sparse ghostly texture',
  },
  advancement: {
    family: 'progression',
    signature: 'clear rising celebratory chime for progression feedback',
  },
  'train-engine': {
    family: 'vehicle-engine',
    signature: 'steady saturated chug with mechanical weight',
  },
  'train-whistle': {
    family: 'vehicle-whistle',
    signature: 'bold square whistle carrying above nearby ambience',
  },
  'paddle-calliope': {
    family: 'vehicle-melody',
    signature: 'playful bright riverboat melody with a looping flourish',
  },
  'steam-whistle': {
    family: 'vehicle-whistle',
    signature: 'piercing industrial whistle with a slightly unstable sustain',
  },
  'combat-weapon': {
    family: 'combat-weapon',
    signature: 'short aggressive impact for physical combat exchanges',
  },
  'combat-magic': {
    family: 'combat-magic',
    signature: 'charged unstable magical burst with modulated bloom',
  },
};

const SOUND_FAMILY_VARIATION_PROFILES: Record<
  SoundRecipeFamily,
  SoundVariationProfile
> = {
  movement: {
    frequencyVariation: 0.02,
    durationVariation: 0.08,
    volumeVariation: 0.06,
    variationDepth: 1,
    frequencyRangeRatio: 0.05,
    durationRangeRatio: 0.12,
    volumeRangeRatio: 0.1,
  },
  interaction: {
    frequencyVariation: 0.015,
    durationVariation: 0.04,
    volumeVariation: 0.04,
    variationDepth: 0.8,
    frequencyRangeRatio: 0.035,
    durationRangeRatio: 0.08,
    volumeRangeRatio: 0.08,
  },
  'ambient-rain': {
    frequencyVariation: 0.026,
    durationVariation: 0.14,
    volumeVariation: 0.08,
    variationDepth: 0.96,
    frequencyRangeRatio: 0.05,
    durationRangeRatio: 0.2,
    volumeRangeRatio: 0.12,
  },
  'ambient-wind': {
    frequencyVariation: 0.03,
    durationVariation: 0.14,
    volumeVariation: 0.08,
    variationDepth: 1,
    frequencyRangeRatio: 0.06,
    durationRangeRatio: 0.2,
    volumeRangeRatio: 0.12,
  },
  'ambient-water': {
    frequencyVariation: 0.028,
    durationVariation: 0.12,
    volumeVariation: 0.07,
    variationDepth: 0.95,
    frequencyRangeRatio: 0.055,
    durationRangeRatio: 0.18,
    volumeRangeRatio: 0.1,
  },
  'ambient-wilds': {
    frequencyVariation: 0.03,
    durationVariation: 0.14,
    volumeVariation: 0.08,
    variationDepth: 1,
    frequencyRangeRatio: 0.06,
    durationRangeRatio: 0.2,
    volumeRangeRatio: 0.12,
  },
  'ambient-shelter': {
    frequencyVariation: 0.022,
    durationVariation: 0.12,
    volumeVariation: 0.07,
    variationDepth: 0.85,
    frequencyRangeRatio: 0.045,
    durationRangeRatio: 0.18,
    volumeRangeRatio: 0.1,
  },
  progression: {
    frequencyVariation: 0.012,
    durationVariation: 0.03,
    volumeVariation: 0.025,
    variationDepth: 0.5,
    frequencyRangeRatio: 0.03,
    durationRangeRatio: 0.06,
    volumeRangeRatio: 0.05,
  },
  'vehicle-engine': {
    frequencyVariation: 0.015,
    durationVariation: 0.05,
    volumeVariation: 0.04,
    variationDepth: 0.75,
    frequencyRangeRatio: 0.035,
    durationRangeRatio: 0.09,
    volumeRangeRatio: 0.08,
  },
  'vehicle-whistle': {
    frequencyVariation: 0.015,
    durationVariation: 0.05,
    volumeVariation: 0.04,
    variationDepth: 0.75,
    frequencyRangeRatio: 0.035,
    durationRangeRatio: 0.09,
    volumeRangeRatio: 0.08,
  },
  'vehicle-melody': {
    frequencyVariation: 0.015,
    durationVariation: 0.05,
    volumeVariation: 0.04,
    variationDepth: 0.75,
    frequencyRangeRatio: 0.035,
    durationRangeRatio: 0.09,
    volumeRangeRatio: 0.08,
  },
  'combat-weapon': {
    frequencyVariation: 0.018,
    durationVariation: 0.04,
    volumeVariation: 0.05,
    variationDepth: 0.7,
    frequencyRangeRatio: 0.04,
    durationRangeRatio: 0.08,
    volumeRangeRatio: 0.08,
  },
  'combat-magic': {
    frequencyVariation: 0.02,
    durationVariation: 0.05,
    volumeVariation: 0.05,
    variationDepth: 0.7,
    frequencyRangeRatio: 0.045,
    durationRangeRatio: 0.09,
    volumeRangeRatio: 0.08,
  },
};

export function getSoundIdentityDescriptor(
  kind: SoundEffectKind
): SoundIdentityDescriptor {
  return SOUND_IDENTITY_DESCRIPTORS[kind];
}

export function buildProceduralSoundRecipe(
  options: ResolveSoundRecipeOptions
): ProceduralSoundRecipe {
  const identity = getSoundIdentityDescriptor(options.kind);
  const baseFrequency = resolveBaseSoundEffectFrequency(options);
  const baseDurationMs =
    options.durationMsOverride ??
    resolveBaseSoundEffectDurationMs(options.kind);
  const baseVolume = resolveBaseSoundEffectVolume(
    options.kind,
    options.profile,
    options.identityVariant
  );

  return applyFamilyVariationProfile(
    {
      id: buildProceduralSoundRecipeId(
        options.kind,
        options.tileKind,
        options.identityVariant
      ),
      baseFrequency,
      baseDurationMs,
      baseVolume,
      waveform: resolveBaseSoundEffectWaveform(
        options.kind,
        options.tileKind,
        options.profile,
        options.resolveInteractionWaveform,
        options.identityVariant
      ),
      noiseColor: resolveBaseSoundEffectNoiseColor(
        options.kind,
        options.identityVariant
      ),
      envelope: resolveProceduralSoundEnvelope(options.kind),
      pitchEnvelope: resolveProceduralSoundPitchEnvelope(options.kind),
      filters: resolveProceduralSoundFilters(options.kind),
      distortion: resolveProceduralSoundDistortion(options.kind),
      delay: resolveProceduralSoundDelay(options.kind),
      reverb: resolveProceduralSoundReverb(options.kind),
      tremolo: resolveProceduralSoundTremolo(options.kind),
      vibrato: resolveProceduralSoundVibrato(options.kind),
      frequencyModulation: resolveProceduralSoundFrequencyModulation(
        options.kind
      ),
      ringModulation: resolveProceduralSoundRingModulation(options.kind),
      sweeps: resolveProceduralSoundSweeps(options.kind),
      layers: resolveProceduralSoundLayers(
        options.kind,
        options.identityVariant
      ),
    },
    identity.family
  );
}

export function buildProceduralSoundRecipeId(
  kind: SoundEffectKind,
  tileKind?: string,
  identityVariant?: string
): string {
  const signatureParts: string[] = [kind];
  const tileIdentity = normalizeTileIdentity(tileKind);
  if (tileIdentity) {
    signatureParts.push(tileIdentity);
  }
  if (identityVariant) {
    signatureParts.push(identityVariant);
  }
  return signatureParts.join(':');
}

function applyFamilyVariationProfile(
  recipe: ProceduralSoundRecipe,
  family: SoundRecipeFamily
): ProceduralSoundRecipe {
  const profile = SOUND_FAMILY_VARIATION_PROFILES[family];
  return {
    ...recipe,
    frequencyVariation: profile.frequencyVariation,
    durationVariation: profile.durationVariation,
    volumeVariation: profile.volumeVariation,
    variationDepth: profile.variationDepth,
    minFrequency: clampMinimum(
      recipe.baseFrequency,
      profile.frequencyRangeRatio
    ),
    maxFrequency: recipe.baseFrequency * (1 + profile.frequencyRangeRatio),
    minDurationMs: clampMinimum(
      recipe.baseDurationMs,
      profile.durationRangeRatio
    ),
    maxDurationMs: recipe.baseDurationMs * (1 + profile.durationRangeRatio),
    minVolume: clampMinimum(recipe.baseVolume, profile.volumeRangeRatio),
    maxVolume: Math.min(1, recipe.baseVolume * (1 + profile.volumeRangeRatio)),
  };
}

function clampMinimum(baseValue: number, rangeRatio: number): number {
  return Math.max(0.0001, baseValue * (1 - rangeRatio));
}

function normalizeTileIdentity(tileKind: string | undefined): string | null {
  if (!tileKind) {
    return null;
  }
  return tileKind
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function resolveProceduralSoundEnvelope(kind: SoundEffectKind) {
  switch (kind) {
    case 'jump':
      return { attackMs: 10, decayMs: 38, sustainLevel: 0.58, releaseMs: 30 };
    case 'landing':
      return { attackMs: 6, decayMs: 36, sustainLevel: 0.42, releaseMs: 44 };
    case 'blocked':
      return { attackMs: 4, decayMs: 26, sustainLevel: 0.34, releaseMs: 36 };
    case 'open':
    case 'close':
      return { attackMs: 5, decayMs: 28, sustainLevel: 0.48, releaseMs: 40 };
    case 'rain':
    case 'hail':
    case 'snowstorm':
    case 'wind':
    case 'ocean':
    case 'river-ambience':
    case 'forest-ambience':
    case 'plains-ambience':
    case 'mountain-ambience':
    case 'cave-ambience':
    case 'settlement-ambience':
    case 'ruins-ambience':
      return {
        attackMs: 120,
        decayMs: 220,
        sustainLevel: 0.76,
        releaseMs: 180,
      };
    case 'advancement':
      return { attackMs: 14, decayMs: 46, sustainLevel: 0.66, releaseMs: 70 };
    case 'train-engine':
      return { attackMs: 28, decayMs: 110, sustainLevel: 0.72, releaseMs: 90 };
    case 'train-whistle':
    case 'steam-whistle':
      return {
        attackMs: 18,
        decayMs: 120,
        sustainLevel: 0.82,
        releaseMs: 120,
      };
    case 'paddle-calliope':
      return { attackMs: 20, decayMs: 60, sustainLevel: 0.74, releaseMs: 110 };
    case 'combat-weapon':
      return { attackMs: 4, decayMs: 24, sustainLevel: 0.28, releaseMs: 34 };
    case 'combat-magic':
      return { attackMs: 12, decayMs: 54, sustainLevel: 0.62, releaseMs: 68 };
    case 'footstep':
    default:
      return { attackMs: 4, decayMs: 22, sustainLevel: 0.38, releaseMs: 24 };
  }
}

function resolveProceduralSoundPitchEnvelope(kind: SoundEffectKind) {
  switch (kind) {
    case 'jump':
      return {
        attackMs: 10,
        decayMs: 24,
        peakMultiplier: 1.08,
        sustainMultiplier: 0.98,
        releaseMs: 30,
        releaseTargetMultiplier: 1.04,
      };
    case 'combat-magic':
      return {
        attackMs: 18,
        decayMs: 44,
        peakMultiplier: 1.05,
        sustainMultiplier: 0.94,
        releaseMs: 62,
        releaseTargetMultiplier: 0.9,
      };
    case 'steam-whistle':
      return {
        attackMs: 28,
        decayMs: 90,
        peakMultiplier: 1.04,
        sustainMultiplier: 1,
        releaseMs: 120,
        releaseTargetMultiplier: 0.96,
      };
    default:
      return undefined;
  }
}

function resolveProceduralSoundFilters(kind: SoundEffectKind) {
  switch (kind) {
    case 'combat-magic':
      return [
        {
          type: 'bandpass' as const,
          frequency: 1_420,
          q: 1.1,
          frequencyVariation: 0.05,
          qVariation: 0.08,
          envelope: {
            attackMs: 18,
            decayMs: 44,
            releaseMs: 62,
            peakFrequencyMultiplier: 1.16,
            sustainFrequencyMultiplier: 0.92,
            releaseFrequencyMultiplier: 0.82,
            peakQMultiplier: 1.18,
            sustainQMultiplier: 1.05,
            releaseQMultiplier: 0.9,
          },
        },
      ] as const;
    case 'ocean':
    case 'river-ambience':
    case 'rain':
    case 'hail':
    case 'snowstorm':
      return [
        {
          type: 'lowpass' as const,
          frequency: 1_600,
          q: 0.7,
          frequencyVariation: 0.04,
        },
      ] as const;
    case 'wind':
      return [
        {
          type: 'highpass' as const,
          frequency: 340,
          q: 0.9,
          frequencyVariation: 0.05,
        },
      ] as const;
    default:
      return undefined;
  }
}

function resolveMovementIdentityVariantOffset(
  identityVariant: string | undefined
): number {
  switch (identityVariant) {
    case 'dry-leaves':
      return 14;
    case 'winter-snow':
      return -10;
    default:
      return 0;
  }
}

function resolveSeasonalVariantSeason(
  identityVariant: string | undefined
): 'spring' | 'summer' | 'autumn' | 'winter' | null {
  if (!identityVariant) {
    return null;
  }
  if (identityVariant.startsWith('spring-')) {
    return 'spring';
  }
  if (identityVariant.startsWith('summer-')) {
    return 'summer';
  }
  if (identityVariant.startsWith('autumn-')) {
    return 'autumn';
  }
  if (identityVariant.startsWith('winter-')) {
    return 'winter';
  }
  return null;
}

function resolveSeasonalVariantBase(
  identityVariant: string | undefined
): string | undefined {
  const season = resolveSeasonalVariantSeason(identityVariant);
  if (!season || !identityVariant) {
    return identityVariant;
  }
  return identityVariant.slice(season.length + 1);
}

function resolveProceduralSoundDistortion(kind: SoundEffectKind) {
  switch (kind) {
    case 'combat-weapon':
      return {
        mode: 'distortion' as const,
        amount: 0.42,
        outputGain: 0.76,
        amountVariation: 0.08,
        outputGainVariation: 0.05,
      };
    case 'combat-magic':
      return {
        mode: 'saturation' as const,
        amount: 0.28,
        outputGain: 0.84,
        amountVariation: 0.06,
        outputGainVariation: 0.04,
      };
    case 'train-engine':
      return {
        mode: 'saturation' as const,
        amount: 0.22,
        outputGain: 0.88,
        amountVariation: 0.05,
        outputGainVariation: 0.03,
      };
    default:
      return undefined;
  }
}

function resolveProceduralSoundDelay(kind: SoundEffectKind) {
  switch (kind) {
    case 'combat-magic':
      return {
        timeMs: 118,
        feedback: 0.32,
        mix: 0.24,
        timeVariation: 0.05,
        feedbackVariation: 0.08,
        mixVariation: 0.06,
      };
    case 'steam-whistle':
      return {
        timeMs: 164,
        feedback: 0.26,
        mix: 0.22,
        timeVariation: 0.04,
        feedbackVariation: 0.06,
        mixVariation: 0.05,
      };
    case 'cave-ambience':
      return {
        timeMs: 210,
        feedback: 0.38,
        mix: 0.18,
        timeVariation: 0.03,
        feedbackVariation: 0.04,
        mixVariation: 0.04,
      };
    default:
      return undefined;
  }
}

function resolveProceduralSoundReverb(kind: SoundEffectKind) {
  switch (kind) {
    case 'cave-ambience':
      return {
        profileId: 'cavern-chamber',
        decayMs: 1480,
        mix: 0.34,
        preDelayMs: 24,
        toneHz: 3200,
        decayVariation: 0.05,
        mixVariation: 0.04,
        preDelayVariation: 0.08,
        toneVariation: 0.06,
      };
    case 'combat-magic':
      return {
        profileId: 'arcane-burst',
        decayMs: 820,
        mix: 0.22,
        preDelayMs: 18,
        toneHz: 4200,
        decayVariation: 0.06,
        mixVariation: 0.05,
        preDelayVariation: 0.08,
        toneVariation: 0.05,
      };
    case 'steam-whistle':
      return {
        profileId: 'industrial-yard',
        decayMs: 960,
        mix: 0.18,
        preDelayMs: 16,
        toneHz: 3600,
        decayVariation: 0.04,
        mixVariation: 0.04,
        preDelayVariation: 0.05,
        toneVariation: 0.05,
      };
    default:
      return undefined;
  }
}

function resolveProceduralSoundTremolo(kind: SoundEffectKind) {
  switch (kind) {
    case 'wind':
      return {
        rateHz: 4.2,
        depth: 0.28,
        waveform: ['sine', 'triangle'] as const,
        rateVariation: 0.08,
        depthVariation: 0.06,
      };
    case 'steam-whistle':
      return {
        rateHz: 5.4,
        depth: 0.18,
        waveform: ['triangle', 'sine'] as const,
        rateVariation: 0.05,
        depthVariation: 0.05,
      };
    default:
      return undefined;
  }
}

function resolveProceduralSoundVibrato(kind: SoundEffectKind) {
  switch (kind) {
    case 'steam-whistle':
      return {
        rateHz: 5.6,
        depthHz: 18,
        waveform: ['sine', 'triangle'] as const,
        rateVariation: 0.04,
        depthVariation: 0.08,
      };
    case 'combat-magic':
      return {
        rateHz: 6.8,
        depthHz: 10,
        waveform: ['triangle', 'sine'] as const,
        rateVariation: 0.05,
        depthVariation: 0.08,
      };
    default:
      return undefined;
  }
}

function resolveProceduralSoundFrequencyModulation(kind: SoundEffectKind) {
  switch (kind) {
    case 'advancement':
      return {
        modulatorFrequencyHz: 312,
        depthHz: 24,
        waveform: ['sine', 'triangle'] as const,
        rateVariation: 0.03,
        depthVariation: 0.08,
      };
    case 'combat-magic':
      return {
        modulatorFrequencyHz: 168,
        depthHz: 42,
        waveform: ['triangle', 'sine'] as const,
        rateVariation: 0.05,
        depthVariation: 0.1,
      };
    default:
      return undefined;
  }
}

function resolveProceduralSoundRingModulation(kind: SoundEffectKind) {
  switch (kind) {
    case 'combat-magic':
      return {
        modulatorFrequencyHz: 92,
        depth: 0.68,
        waveform: ['square', 'triangle'] as const,
        rateVariation: 0.05,
        depthVariation: 0.08,
      };
    case 'train-engine':
      return {
        modulatorFrequencyHz: 48,
        depth: 0.42,
        waveform: ['triangle', 'sine'] as const,
        rateVariation: 0.04,
        depthVariation: 0.06,
      };
    default:
      return undefined;
  }
}

function resolveProceduralSoundSweeps(kind: SoundEffectKind) {
  switch (kind) {
    case 'jump':
      return [
        {
          curve: 'exponential' as const,
          targetMultiplier: 1.35,
          atProgress: 1,
        },
      ] as const;
    case 'landing':
      return [
        {
          curve: 'exponential' as const,
          targetMultiplier: 0.78,
          atProgress: 1,
        },
      ] as const;
    case 'advancement':
      return [
        {
          curve: 'exponential' as const,
          targetMultiplier: 1.5,
          atProgress: 0.55,
        },
      ] as const;
    case 'train-engine':
      return [
        {
          curve: 'exponential' as const,
          targetMultiplier: 0.82,
          atProgress: 1,
        },
      ] as const;
    case 'train-whistle':
      return [
        {
          curve: 'exponential' as const,
          targetMultiplier: 1.28,
          atProgress: 0.72,
        },
      ] as const;
    case 'paddle-calliope':
      return [
        {
          curve: 'linear' as const,
          targetMultiplier: 1.08,
          atProgress: 0.32,
        },
        {
          curve: 'linear' as const,
          targetMultiplier: 0.94,
          atProgress: 0.88,
        },
      ] as const;
    case 'steam-whistle':
      return [
        {
          curve: 'exponential' as const,
          targetMultiplier: 1.22,
          atProgress: 0.22,
        },
        {
          curve: 'exponential' as const,
          targetMultiplier: 0.92,
          atProgress: 1,
        },
      ] as const;
    case 'combat-weapon':
      return [
        {
          curve: 'exponential' as const,
          targetMultiplier: 0.64,
          atProgress: 1,
        },
      ] as const;
    case 'combat-magic':
      return [
        {
          curve: 'linear' as const,
          targetMultiplier: 1.18,
          atProgress: 0.3,
        },
        {
          curve: 'linear' as const,
          targetMultiplier: 0.86,
          atProgress: 1,
        },
      ] as const;
    default:
      return undefined;
  }
}

function resolveProceduralSoundLayers(
  kind: SoundEffectKind,
  identityVariant?: string
): SoundLayerRecipe | undefined {
  const seasonalVariant = resolveSeasonalVariantSeason(identityVariant);
  const baseVariant = resolveSeasonalVariantBase(identityVariant);
  switch (kind) {
    case 'snowstorm':
      if (identityVariant === 'whiteout') {
        return [
          {
            id: 'snowstorm-whiteout-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['white', 'pink'] as const,
            frequencyMultiplier: 0.68,
            durationMultiplier: 1,
            volumeMultiplier: 0.66,
            frequencyVariation: 0.024,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.96,
          },
          {
            id: 'snowstorm-ice-shear',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.18,
            durationMultiplier: 0.82,
            volumeMultiplier: 0.18,
            startOffsetMs: 34,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.024,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.76,
          },
        ] as const;
      }
      return [
        {
          id: 'snowstorm-flurry-bed',
          waveform: ['triangle', 'sine'] as const,
          noiseColor: ['white', 'pink'] as const,
          frequencyMultiplier: 0.72,
          durationMultiplier: 1,
          volumeMultiplier: 0.58,
          frequencyVariation: 0.022,
          durationVariation: 0.12,
          volumeVariation: 0.08,
          variationDepth: 0.92,
        },
        {
          id: 'snowstorm-grit',
          waveform: ['triangle', 'sine'] as const,
          noiseColor: 'white' as const,
          frequencyMultiplier: 1.06,
          durationMultiplier: 0.86,
          volumeMultiplier: 0.16,
          startOffsetMs: 44,
          startOffsetVariation: 0.26,
          frequencyVariation: 0.022,
          durationVariation: 0.12,
          volumeVariation: 0.08,
          variationDepth: 0.72,
        },
      ] as const;
    case 'thunder':
      if (seasonalVariant === 'summer') {
        return [
          {
            id: 'thunder-summer-crack',
            waveform: ['sawtooth', 'square'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: baseVariant === 'distant' ? 1.18 : 1.46,
            durationMultiplier: baseVariant === 'distant' ? 0.24 : 0.2,
            volumeMultiplier: baseVariant === 'distant' ? 0.18 : 0.28,
            frequencyVariation: 0.03,
            durationVariation: 0.08,
            volumeVariation: 0.08,
            variationDepth: 0.76,
          },
          {
            id: 'thunder-summer-rumble',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.56,
            durationMultiplier: 1,
            volumeMultiplier: 0.64,
            startOffsetMs: 104,
            startOffsetVariation: 0.12,
            frequencyVariation: 0.022,
            durationVariation: 0.14,
            volumeVariation: 0.06,
            variationDepth: 0.82,
          },
          {
            id: 'thunder-summer-reflections',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.4,
            durationMultiplier: 0.76,
            volumeMultiplier: 0.18,
            startOffsetMs: 320,
            startOffsetVariation: 0.14,
            frequencyVariation: 0.02,
            durationVariation: 0.12,
            volumeVariation: 0.06,
            variationDepth: 0.72,
          },
        ] as const;
      }
      if (seasonalVariant === 'spring') {
        return [
          {
            id: 'thunder-spring-crack',
            waveform: ['square', 'sawtooth'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.24,
            durationMultiplier: 0.2,
            volumeMultiplier: 0.2,
            frequencyVariation: 0.03,
            durationVariation: 0.08,
            volumeVariation: 0.08,
            variationDepth: 0.7,
          },
          {
            id: 'thunder-spring-rumble',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.6,
            durationMultiplier: 1,
            volumeMultiplier: 0.58,
            startOffsetMs: 128,
            startOffsetVariation: 0.14,
            frequencyVariation: 0.022,
            durationVariation: 0.14,
            volumeVariation: 0.06,
            variationDepth: 0.8,
          },
        ] as const;
      }
      if (baseVariant === 'overhead') {
        return [
          {
            id: 'thunder-overhead-crack',
            waveform: ['sawtooth', 'square'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.56,
            durationMultiplier: 0.22,
            volumeMultiplier: 0.3,
            frequencyVariation: 0.03,
            durationVariation: 0.08,
            volumeVariation: 0.08,
            variationDepth: 0.72,
          },
          {
            id: 'thunder-overhead-rumble',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.54,
            durationMultiplier: 1,
            volumeMultiplier: 0.66,
            startOffsetMs: 90,
            startOffsetVariation: 0.1,
            frequencyVariation: 0.024,
            durationVariation: 0.14,
            volumeVariation: 0.06,
            variationDepth: 0.84,
          },
          {
            id: 'thunder-overhead-reflections',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.38,
            durationMultiplier: 0.72,
            volumeMultiplier: 0.18,
            startOffsetMs: 360,
            startOffsetVariation: 0.12,
            frequencyVariation: 0.02,
            durationVariation: 0.12,
            volumeVariation: 0.06,
            variationDepth: 0.7,
          },
        ] as const;
      }
      if (baseVariant === 'near') {
        return [
          {
            id: 'thunder-near-crack',
            waveform: ['square', 'sawtooth'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.3,
            durationMultiplier: 0.18,
            volumeMultiplier: 0.18,
            frequencyVariation: 0.03,
            durationVariation: 0.06,
            volumeVariation: 0.08,
            variationDepth: 0.68,
          },
          {
            id: 'thunder-near-rumble',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.58,
            durationMultiplier: 1,
            volumeMultiplier: 0.62,
            startOffsetMs: 120,
            startOffsetVariation: 0.14,
            frequencyVariation: 0.022,
            durationVariation: 0.14,
            volumeVariation: 0.06,
            variationDepth: 0.82,
          },
          {
            id: 'thunder-near-reflections',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.34,
            durationMultiplier: 0.78,
            volumeMultiplier: 0.16,
            startOffsetMs: 440,
            startOffsetVariation: 0.16,
            frequencyVariation: 0.02,
            durationVariation: 0.12,
            volumeVariation: 0.06,
            variationDepth: 0.7,
          },
        ] as const;
      }
      return [
        {
          id: 'thunder-distant-rumble',
          waveform: ['triangle', 'sine'] as const,
          noiseColor: 'brown' as const,
          frequencyMultiplier: 0.46,
          durationMultiplier: 1,
          volumeMultiplier: 0.58,
          frequencyVariation: 0.02,
          durationVariation: 0.14,
          volumeVariation: 0.06,
          variationDepth: 0.8,
        },
        {
          id: 'thunder-distant-reflections',
          waveform: ['sine', 'triangle'] as const,
          noiseColor: 'brown' as const,
          frequencyMultiplier: 0.28,
          durationMultiplier: 0.84,
          volumeMultiplier: 0.2,
          startOffsetMs: 520,
          startOffsetVariation: 0.2,
          frequencyVariation: 0.018,
          durationVariation: 0.12,
          volumeVariation: 0.06,
          variationDepth: 0.68,
        },
      ] as const;
    case 'hail':
      if (identityVariant === 'roof') {
        return [
          {
            id: 'hail-roof-bed',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.1,
            durationMultiplier: 0.76,
            volumeMultiplier: 0.26,
            frequencyVariation: 0.03,
            durationVariation: 0.16,
            volumeVariation: 0.1,
            variationDepth: 0.84,
          },
          {
            id: 'hail-roof-pings',
            waveform: ['square', 'sine'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.56,
            durationMultiplier: 0.46,
            volumeMultiplier: 0.18,
            startOffsetMs: 16,
            startOffsetVariation: 0.18,
            frequencyVariation: 0.04,
            durationVariation: 0.18,
            volumeVariation: 0.1,
            variationDepth: 0.82,
          },
        ] as const;
      }
      if (identityVariant === 'wood') {
        return [
          {
            id: 'hail-wood-bed',
            waveform: ['triangle', 'square'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 0.98,
            durationMultiplier: 0.8,
            volumeMultiplier: 0.22,
            frequencyVariation: 0.03,
            durationVariation: 0.16,
            volumeVariation: 0.1,
            variationDepth: 0.82,
          },
          {
            id: 'hail-wood-knocks',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.36,
            durationMultiplier: 0.5,
            volumeMultiplier: 0.16,
            startOffsetMs: 18,
            startOffsetVariation: 0.2,
            frequencyVariation: 0.04,
            durationVariation: 0.18,
            volumeVariation: 0.1,
            variationDepth: 0.8,
          },
        ] as const;
      }
      if (identityVariant === 'rock') {
        return [
          {
            id: 'hail-stone-bed',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.16,
            durationMultiplier: 0.72,
            volumeMultiplier: 0.24,
            frequencyVariation: 0.03,
            durationVariation: 0.16,
            volumeVariation: 0.1,
            variationDepth: 0.84,
          },
          {
            id: 'hail-stone-ticks',
            waveform: ['square', 'sine'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.62,
            durationMultiplier: 0.44,
            volumeMultiplier: 0.18,
            startOffsetMs: 14,
            startOffsetVariation: 0.16,
            frequencyVariation: 0.04,
            durationVariation: 0.18,
            volumeVariation: 0.1,
            variationDepth: 0.82,
          },
        ] as const;
      }
      if (identityVariant === 'water') {
        return [
          {
            id: 'hail-water-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['white', 'pink'] as const,
            frequencyMultiplier: 0.9,
            durationMultiplier: 0.84,
            volumeMultiplier: 0.22,
            frequencyVariation: 0.03,
            durationVariation: 0.16,
            volumeVariation: 0.1,
            variationDepth: 0.82,
          },
          {
            id: 'hail-water-splashes',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.28,
            durationMultiplier: 0.56,
            volumeMultiplier: 0.18,
            startOffsetMs: 24,
            startOffsetVariation: 0.2,
            frequencyVariation: 0.04,
            durationVariation: 0.18,
            volumeVariation: 0.1,
            variationDepth: 0.8,
          },
        ] as const;
      }
      if (identityVariant === 'vegetation') {
        return [
          {
            id: 'hail-canopy-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['white', 'pink'] as const,
            frequencyMultiplier: 0.92,
            durationMultiplier: 0.88,
            volumeMultiplier: 0.22,
            frequencyVariation: 0.03,
            durationVariation: 0.16,
            volumeVariation: 0.1,
            variationDepth: 0.82,
          },
          {
            id: 'hail-leaf-ticks',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.22,
            durationMultiplier: 0.54,
            volumeMultiplier: 0.16,
            startOffsetMs: 20,
            startOffsetVariation: 0.2,
            frequencyVariation: 0.04,
            durationVariation: 0.18,
            volumeVariation: 0.1,
            variationDepth: 0.8,
          },
        ] as const;
      }
      if (identityVariant === 'snow') {
        return [
          {
            id: 'hail-snow-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['white', 'pink'] as const,
            frequencyMultiplier: 0.82,
            durationMultiplier: 0.9,
            volumeMultiplier: 0.18,
            frequencyVariation: 0.028,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.78,
          },
          {
            id: 'hail-snow-crunch',
            waveform: ['triangle', 'square'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.06,
            durationMultiplier: 0.6,
            volumeMultiplier: 0.12,
            startOffsetMs: 22,
            startOffsetVariation: 0.18,
            frequencyVariation: 0.034,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.76,
          },
        ] as const;
      }
      return [
        {
          id: 'hail-open-bed',
          waveform: ['triangle', 'square'] as const,
          noiseColor: 'white' as const,
          frequencyMultiplier: 1.02,
          durationMultiplier: 0.78,
          volumeMultiplier: 0.22,
          frequencyVariation: 0.03,
          durationVariation: 0.16,
          volumeVariation: 0.1,
          variationDepth: 0.82,
        },
        {
          id: 'hail-open-ticks',
          waveform: ['square', 'sine'] as const,
          noiseColor: 'white' as const,
          frequencyMultiplier: 1.42,
          durationMultiplier: 0.48,
          volumeMultiplier: 0.18,
          startOffsetMs: 18,
          startOffsetVariation: 0.18,
          frequencyVariation: 0.04,
          durationVariation: 0.18,
          volumeVariation: 0.1,
          variationDepth: 0.8,
        },
      ] as const;
    case 'wind':
      if (identityVariant === 'autumn-stormfront') {
        return [
          {
            id: 'wind-autumn-gale-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.7,
            durationMultiplier: 1,
            volumeMultiplier: 0.68,
            frequencyVariation: 0.028,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 1,
          },
          {
            id: 'wind-autumn-leaf-gust',
            waveform: ['triangle', 'square'] as const,
            noiseColor: ['brown', 'pink'] as const,
            frequencyMultiplier: 1.22,
            durationMultiplier: 0.86,
            volumeMultiplier: 0.24,
            startOffsetMs: 26,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.028,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
        ] as const;
      }
      if (baseVariant === 'stormfront') {
        return [
          {
            id: 'wind-storm-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.68,
            durationMultiplier: 1,
            volumeMultiplier: 0.66,
            frequencyVariation: 0.028,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 1,
          },
          {
            id: 'wind-storm-whip',
            waveform: ['sine', 'triangle'] as const,
            frequencyMultiplier: 1.3,
            durationMultiplier: 0.88,
            volumeMultiplier: 0.24,
            startOffsetMs: 28,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.03,
            durationVariation: 0.1,
            volumeVariation: 0.08,
            variationDepth: 0.82,
            tremolo: {
              rateHz: 5.6,
              depth: 0.2,
              waveform: ['sine', 'triangle'] as const,
              rateVariation: 0.05,
              depthVariation: 0.06,
            },
          },
        ] as const;
      }
      if (baseVariant === 'sandstorm') {
        return [
          {
            id: 'wind-sandstorm-bed',
            waveform: ['triangle', 'sawtooth'] as const,
            noiseColor: ['brown', 'white'] as const,
            frequencyMultiplier: 0.78,
            durationMultiplier: 1,
            volumeMultiplier: 0.7,
            frequencyVariation: 0.028,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 1,
          },
          {
            id: 'wind-sand-grit',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.5,
            durationMultiplier: 0.82,
            volumeMultiplier: 0.24,
            startOffsetMs: 18,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.03,
            durationVariation: 0.1,
            volumeVariation: 0.08,
            variationDepth: 0.82,
          },
        ] as const;
      }
      if (identityVariant === 'summer-cyclone') {
        return [
          {
            id: 'wind-summer-cyclone-bed',
            waveform: ['sawtooth', 'triangle'] as const,
            noiseColor: ['brown', 'white'] as const,
            frequencyMultiplier: 0.66,
            durationMultiplier: 1,
            volumeMultiplier: 0.76,
            frequencyVariation: 0.03,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 1,
          },
          {
            id: 'wind-summer-cyclone-whirl',
            waveform: ['sine', 'sawtooth'] as const,
            frequencyMultiplier: 1.26,
            durationMultiplier: 0.9,
            volumeMultiplier: 0.22,
            startOffsetMs: 22,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.026,
            durationVariation: 0.1,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
        ] as const;
      }
      if (baseVariant === 'cyclone') {
        return [
          {
            id: 'wind-cyclone-bed',
            waveform: ['sawtooth', 'triangle'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.62,
            durationMultiplier: 1,
            volumeMultiplier: 0.74,
            frequencyVariation: 0.03,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 1,
          },
          {
            id: 'wind-cyclone-whirl',
            waveform: ['sine', 'sawtooth'] as const,
            frequencyMultiplier: 1.22,
            durationMultiplier: 0.92,
            volumeMultiplier: 0.22,
            startOffsetMs: 24,
            startOffsetVariation: 0.2,
            frequencyVariation: 0.026,
            durationVariation: 0.1,
            volumeVariation: 0.08,
            variationDepth: 0.8,
            tremolo: {
              rateHz: 6.2,
              depth: 0.24,
              waveform: ['triangle', 'sine'] as const,
              rateVariation: 0.06,
              depthVariation: 0.06,
            },
          },
        ] as const;
      }
      if (baseVariant === 'crossdraft') {
        return [
          {
            id: 'wind-crossdraft-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.74,
            durationMultiplier: 1,
            volumeMultiplier: 0.46,
            frequencyVariation: 0.022,
            durationVariation: 0.12,
            volumeVariation: 0.06,
            variationDepth: 0.88,
          },
          {
            id: 'wind-crossdraft-whistle',
            waveform: ['sine', 'triangle'] as const,
            frequencyMultiplier: 1.42,
            durationMultiplier: 0.72,
            volumeMultiplier: 0.22,
            startOffsetMs: 20,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.022,
            durationVariation: 0.08,
            volumeVariation: 0.08,
            variationDepth: 0.72,
            vibrato: {
              rateHz: 5.2,
              depthHz: 8,
              waveform: ['sine', 'triangle'] as const,
              rateVariation: 0.05,
              depthVariation: 0.06,
            },
          },
        ] as const;
      }
      if (baseVariant === 'canopy') {
        return [
          {
            id: 'wind-canopy-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.72,
            durationMultiplier: 1,
            volumeMultiplier: 0.58,
            frequencyVariation: 0.02,
            durationVariation: 0.12,
            volumeVariation: 0.06,
            variationDepth: 1,
          },
          {
            id: 'wind-leaf-whistle',
            waveform: ['sine', 'triangle'] as const,
            frequencyMultiplier: 1.18,
            durationMultiplier: 0.84,
            volumeMultiplier: 0.18,
            startOffsetMs: 36,
            startOffsetVariation: 0.28,
            frequencyVariation: 0.024,
            durationVariation: 0.09,
            volumeVariation: 0.08,
            variationDepth: 0.72,
            tremolo: {
              rateHz: 5.1,
              depth: 0.16,
              waveform: ['sine', 'triangle'] as const,
              rateVariation: 0.05,
              depthVariation: 0.06,
            },
          },
        ] as const;
      }
      return [
        {
          id: 'wind-noise-bed',
          waveform: ['triangle', 'sine'] as const,
          noiseColor: 'brown' as const,
          frequencyMultiplier: 0.72,
          durationMultiplier: 1,
          volumeMultiplier: 0.58,
          frequencyVariation: 0.02,
          durationVariation: 0.12,
          volumeVariation: 0.06,
          variationDepth: 1,
        },
        {
          id: 'wind-edge-whistle',
          waveform: ['sine', 'triangle'] as const,
          frequencyMultiplier: 1.18,
          durationMultiplier: 0.84,
          volumeMultiplier: 0.18,
          startOffsetMs: 36,
          startOffsetVariation: 0.28,
          frequencyVariation: 0.024,
          durationVariation: 0.09,
          volumeVariation: 0.08,
          variationDepth: 0.72,
          tremolo: {
            rateHz: 5.1,
            depth: 0.16,
            waveform: ['sine', 'triangle'] as const,
            rateVariation: 0.05,
            depthVariation: 0.06,
          },
        },
      ] as const;
    case 'rain':
      if (seasonalVariant === 'spring') {
        return [
          {
            id: 'rain-spring-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['white', 'pink'] as const,
            frequencyMultiplier: 0.8,
            durationMultiplier: 1,
            volumeMultiplier: 0.54,
            frequencyVariation: 0.024,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.9,
          },
          {
            id:
              baseVariant === 'water'
                ? 'rain-spring-runoff'
                : 'rain-spring-squall',
            waveform: ['triangle', 'square'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: baseVariant === 'water' ? 1.18 : 1.3,
            durationMultiplier: 0.62,
            volumeMultiplier: 0.2,
            startOffsetMs: 24,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.03,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.82,
          },
        ] as const;
      }
      if (seasonalVariant === 'autumn') {
        return [
          {
            id: 'rain-autumn-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['pink', 'brown'] as const,
            frequencyMultiplier: 0.78,
            durationMultiplier: 1,
            volumeMultiplier: 0.52,
            frequencyVariation: 0.024,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.88,
          },
          {
            id: 'rain-autumn-sheets',
            waveform: ['triangle', 'square'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.22,
            durationMultiplier: 0.6,
            volumeMultiplier: 0.18,
            startOffsetMs: 30,
            startOffsetVariation: 0.26,
            frequencyVariation: 0.03,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
        ] as const;
      }
      if (baseVariant === 'roof') {
        return [
          {
            id: 'rain-roof-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['white', 'pink'] as const,
            frequencyMultiplier: 0.82,
            durationMultiplier: 1,
            volumeMultiplier: 0.48,
            frequencyVariation: 0.022,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.88,
          },
          {
            id: 'rain-roof-ticks',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.36,
            durationMultiplier: 0.54,
            volumeMultiplier: 0.2,
            startOffsetMs: 18,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.034,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.78,
          },
        ] as const;
      }
      if (baseVariant === 'leaves') {
        return [
          {
            id: 'rain-canopy-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['pink', 'brown'] as const,
            frequencyMultiplier: 0.8,
            durationMultiplier: 1,
            volumeMultiplier: 0.52,
            frequencyVariation: 0.024,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.9,
          },
          {
            id: 'rain-leaf-drips',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.22,
            durationMultiplier: 0.6,
            volumeMultiplier: 0.18,
            startOffsetMs: 44,
            startOffsetVariation: 0.28,
            frequencyVariation: 0.03,
            durationVariation: 0.18,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
        ] as const;
      }
      if (baseVariant === 'water') {
        return [
          {
            id: 'rain-water-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['white', 'pink'] as const,
            frequencyMultiplier: 0.78,
            durationMultiplier: 1,
            volumeMultiplier: 0.5,
            frequencyVariation: 0.024,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.9,
          },
          {
            id: 'rain-water-ripples',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.14,
            durationMultiplier: 0.66,
            volumeMultiplier: 0.2,
            startOffsetMs: 26,
            startOffsetVariation: 0.26,
            frequencyVariation: 0.03,
            durationVariation: 0.18,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
        ] as const;
      }
      return [
        {
          id: 'rain-open-bed',
          waveform: ['triangle', 'sine'] as const,
          noiseColor: ['white', 'pink'] as const,
          frequencyMultiplier: 0.76,
          durationMultiplier: 1,
          volumeMultiplier: 0.54,
          frequencyVariation: 0.024,
          durationVariation: 0.14,
          volumeVariation: 0.08,
          variationDepth: 0.92,
        },
        {
          id: 'rain-open-drops',
          waveform: ['triangle', 'square'] as const,
          noiseColor: 'white' as const,
          frequencyMultiplier: 1.28,
          durationMultiplier: 0.62,
          volumeMultiplier: 0.18,
          startOffsetMs: 24,
          startOffsetVariation: 0.3,
          frequencyVariation: 0.03,
          durationVariation: 0.18,
          volumeVariation: 0.08,
          variationDepth: 0.82,
        },
      ] as const;
    case 'river-ambience':
      if (identityVariant === 'frozen') {
        return [
          {
            id: 'river-frozen-bed',
            waveform: ['triangle', 'square'] as const,
            noiseColor: ['white', 'brown'] as const,
            frequencyMultiplier: 0.74,
            durationMultiplier: 1,
            volumeMultiplier: 0.4,
            frequencyVariation: 0.02,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.78,
          },
          {
            id: 'river-ice-cracks',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.22,
            durationMultiplier: 0.72,
            volumeMultiplier: 0.18,
            startOffsetMs: 28,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.028,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.72,
          },
        ] as const;
      }
      if (identityVariant === 'water-splashes') {
        return [
          {
            id: 'river-splash-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['white', 'pink'] as const,
            frequencyMultiplier: 0.82,
            durationMultiplier: 1,
            volumeMultiplier: 0.42,
            frequencyVariation: 0.024,
            durationVariation: 0.12,
            volumeVariation: 0.07,
            variationDepth: 0.88,
          },
          {
            id: 'river-splash-pop',
            waveform: ['sine', 'square'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.64,
            durationMultiplier: 0.5,
            volumeMultiplier: 0.18,
            startOffsetMs: 22,
            startOffsetVariation: 0.34,
            frequencyVariation: 0.034,
            durationVariation: 0.16,
            volumeVariation: 0.1,
            variationDepth: 0.82,
          },
        ] as const;
      }
      return [
        {
          id: 'river-current-bed',
          waveform: ['triangle', 'sine'] as const,
          noiseColor: ['white', 'pink'] as const,
          frequencyMultiplier: 0.78,
          durationMultiplier: 1,
          volumeMultiplier: 0.54,
          frequencyVariation: 0.024,
          durationVariation: 0.12,
          volumeVariation: 0.07,
          variationDepth: 0.94,
        },
        {
          id: 'river-splash-detail',
          waveform: ['sine', 'square'] as const,
          noiseColor: 'white' as const,
          frequencyMultiplier: 1.46,
          durationMultiplier: 0.62,
          volumeMultiplier: 0.16,
          startOffsetMs: 28,
          startOffsetVariation: 0.4,
          frequencyVariation: 0.03,
          durationVariation: 0.16,
          volumeVariation: 0.1,
          variationDepth: 0.82,
        },
      ] as const;
    case 'forest-ambience':
      if (identityVariant === 'nearby-birds') {
        return [
          {
            id: 'forest-near-birdsong',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.46,
            durationMultiplier: 0.66,
            volumeMultiplier: 0.24,
            frequencyVariation: 0.038,
            durationVariation: 0.18,
            volumeVariation: 0.1,
            variationDepth: 0.9,
          },
          {
            id: 'forest-bird-rustle',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['pink', 'brown'] as const,
            frequencyMultiplier: 0.92,
            durationMultiplier: 0.94,
            volumeMultiplier: 0.2,
            startOffsetMs: 18,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.022,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
        ] as const;
      }
      if (identityVariant === 'distant-birds') {
        return [
          {
            id: 'forest-distant-birdsong',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.28,
            durationMultiplier: 0.72,
            volumeMultiplier: 0.14,
            frequencyVariation: 0.032,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.84,
          },
          {
            id: 'forest-far-air-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['brown', 'pink'] as const,
            frequencyMultiplier: 0.78,
            durationMultiplier: 1,
            volumeMultiplier: 0.28,
            startOffsetMs: 42,
            startOffsetVariation: 0.26,
            frequencyVariation: 0.02,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.78,
          },
        ] as const;
      }
      if (identityVariant === 'branch-creak') {
        return [
          {
            id: 'forest-branch-creak',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 0.98,
            durationMultiplier: 0.82,
            volumeMultiplier: 0.18,
            frequencyVariation: 0.026,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
          {
            id: 'forest-bough-rustle',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['brown', 'pink'] as const,
            frequencyMultiplier: 0.82,
            durationMultiplier: 1,
            volumeMultiplier: 0.32,
            startOffsetMs: 34,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.022,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
        ] as const;
      }
      if (identityVariant === 'animal-calls') {
        return [
          {
            id: 'forest-animal-call',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.02,
            durationMultiplier: 0.86,
            volumeMultiplier: 0.16,
            frequencyVariation: 0.028,
            durationVariation: 0.18,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
          {
            id: 'forest-animal-distance-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['brown', 'pink'] as const,
            frequencyMultiplier: 0.76,
            durationMultiplier: 1,
            volumeMultiplier: 0.26,
            startOffsetMs: 46,
            startOffsetVariation: 0.28,
            frequencyVariation: 0.02,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.76,
          },
        ] as const;
      }
      if (identityVariant === 'vegetation-rustle') {
        return [
          {
            id: 'forest-vegetation-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['pink', 'brown'] as const,
            frequencyMultiplier: 0.84,
            durationMultiplier: 1,
            volumeMultiplier: 0.38,
            frequencyVariation: 0.022,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.82,
          },
          {
            id: 'forest-fern-shift',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.08,
            durationMultiplier: 0.72,
            volumeMultiplier: 0.12,
            startOffsetMs: 26,
            startOffsetVariation: 0.2,
            frequencyVariation: 0.028,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.76,
          },
        ] as const;
      }
      if (identityVariant === 'mystery-hint') {
        return [
          {
            id: 'forest-mystery-tone',
            waveform: ['sine', 'triangle'] as const,
            frequencyMultiplier: 1.14,
            durationMultiplier: 0.92,
            volumeMultiplier: 0.1,
            frequencyVariation: 0.02,
            durationVariation: 0.12,
            volumeVariation: 0.06,
            variationDepth: 0.68,
            delay: {
              timeMs: 148,
              feedback: 0.18,
              mix: 0.14,
              timeVariation: 0.05,
              feedbackVariation: 0.06,
              mixVariation: 0.08,
            },
          },
          {
            id: 'forest-mystery-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.7,
            durationMultiplier: 1,
            volumeMultiplier: 0.22,
            startOffsetMs: 52,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.018,
            durationVariation: 0.12,
            volumeVariation: 0.06,
            variationDepth: 0.7,
          },
        ] as const;
      }
      if (identityVariant === 'migrating-birds') {
        return [
          {
            id: 'forest-migration-calls',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.36,
            durationMultiplier: 0.7,
            volumeMultiplier: 0.16,
            frequencyVariation: 0.034,
            durationVariation: 0.18,
            volumeVariation: 0.08,
            variationDepth: 0.84,
          },
          {
            id: 'forest-open-sky-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['pink', 'white'] as const,
            frequencyMultiplier: 0.8,
            durationMultiplier: 1,
            volumeMultiplier: 0.24,
            startOffsetMs: 36,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.02,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.76,
          },
        ] as const;
      }
      if (identityVariant === 'autumn-leaves') {
        return [
          {
            id: 'forest-autumn-leaf-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['brown', 'white'] as const,
            frequencyMultiplier: 0.82,
            durationMultiplier: 1,
            volumeMultiplier: 0.36,
            frequencyVariation: 0.022,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
          {
            id: 'forest-dry-leaf-fall',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.04,
            durationMultiplier: 0.74,
            volumeMultiplier: 0.14,
            startOffsetMs: 28,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.028,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.76,
          },
        ] as const;
      }
      if (identityVariant === 'dawn-birds') {
        return [
          {
            id: 'forest-dawn-birdsong',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.42,
            durationMultiplier: 0.72,
            volumeMultiplier: 0.22,
            frequencyVariation: 0.036,
            durationVariation: 0.18,
            volumeVariation: 0.1,
            variationDepth: 0.9,
            vibrato: {
              rateHz: 5.8,
              depthHz: 0.04,
              waveform: ['sine', 'triangle'] as const,
              rateVariation: 0.05,
              depthVariation: 0.04,
            },
          },
          {
            id: 'forest-morning-canopy',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['pink', 'brown'] as const,
            frequencyMultiplier: 0.9,
            durationMultiplier: 1,
            volumeMultiplier: 0.38,
            startOffsetMs: 24,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.024,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.82,
          },
        ] as const;
      }
      if (identityVariant === 'summer-insects') {
        return [
          {
            id: 'forest-summer-cicadas',
            waveform: ['square', 'sine'] as const,
            noiseColor: 'pink' as const,
            frequencyMultiplier: 1.38,
            durationMultiplier: 0.68,
            volumeMultiplier: 0.2,
            frequencyVariation: 0.034,
            durationVariation: 0.2,
            volumeVariation: 0.1,
            variationDepth: 0.92,
            tremolo: {
              rateHz: 9.4,
              depth: 0.24,
              waveform: 'square' as const,
              rateVariation: 0.08,
              depthVariation: 0.06,
            },
          },
          {
            id: 'forest-warm-leaf-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['pink', 'brown'] as const,
            frequencyMultiplier: 0.86,
            durationMultiplier: 1,
            volumeMultiplier: 0.42,
            startOffsetMs: 30,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.022,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.84,
          },
        ] as const;
      }
      if (identityVariant === 'night-crickets') {
        return [
          {
            id: 'forest-cricket-bed',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'pink' as const,
            frequencyMultiplier: 1.3,
            durationMultiplier: 0.66,
            volumeMultiplier: 0.16,
            frequencyVariation: 0.03,
            durationVariation: 0.18,
            volumeVariation: 0.08,
            variationDepth: 0.88,
            tremolo: {
              rateHz: 8.2,
              depth: 0.2,
              waveform: 'square' as const,
              rateVariation: 0.08,
              depthVariation: 0.06,
            },
          },
          {
            id: 'forest-nocturnal-rustle',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['brown', 'pink'] as const,
            frequencyMultiplier: 0.76,
            durationMultiplier: 1,
            volumeMultiplier: 0.3,
            startOffsetMs: 40,
            startOffsetVariation: 0.26,
            frequencyVariation: 0.02,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
        ] as const;
      }
      if (identityVariant === 'owl') {
        return [
          {
            id: 'forest-owl-call',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.06,
            durationMultiplier: 0.88,
            volumeMultiplier: 0.14,
            frequencyVariation: 0.028,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.76,
            vibrato: {
              rateHz: 4.2,
              depthHz: 0.04,
              waveform: ['sine', 'triangle'] as const,
              rateVariation: 0.05,
              depthVariation: 0.05,
            },
          },
          {
            id: 'forest-night-canopy',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['brown', 'pink'] as const,
            frequencyMultiplier: 0.74,
            durationMultiplier: 1,
            volumeMultiplier: 0.28,
            startOffsetMs: 50,
            startOffsetVariation: 0.28,
            frequencyVariation: 0.02,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.78,
          },
        ] as const;
      }
      if (identityVariant === 'spring-frogs') {
        return [
          {
            id: 'forest-spring-frogs',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.98,
            durationMultiplier: 0.78,
            volumeMultiplier: 0.2,
            frequencyVariation: 0.03,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.84,
          },
          {
            id: 'forest-thaw-rustle',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['pink', 'brown'] as const,
            frequencyMultiplier: 0.84,
            durationMultiplier: 1,
            volumeMultiplier: 0.34,
            startOffsetMs: 34,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.022,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
        ] as const;
      }
      if (identityVariant === 'winter-quiet') {
        return [
          {
            id: 'forest-winter-hush',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.7,
            durationMultiplier: 1,
            volumeMultiplier: 0.38,
            frequencyVariation: 0.018,
            durationVariation: 0.12,
            volumeVariation: 0.06,
            variationDepth: 0.78,
          },
          {
            id: 'forest-bare-branches',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 0.92,
            durationMultiplier: 0.8,
            volumeMultiplier: 0.12,
            startOffsetMs: 44,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.026,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.72,
          },
        ] as const;
      }
      if (identityVariant === 'wildlife') {
        return [
          {
            id: 'forest-bird-bed',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'pink' as const,
            frequencyMultiplier: 1.18,
            durationMultiplier: 0.82,
            volumeMultiplier: 0.22,
            frequencyVariation: 0.03,
            durationVariation: 0.18,
            volumeVariation: 0.1,
            variationDepth: 0.9,
            tremolo: {
              rateHz: 6.2,
              depth: 0.18,
              waveform: ['sine', 'triangle'] as const,
              rateVariation: 0.06,
              depthVariation: 0.05,
            },
          },
          {
            id: 'forest-far-branches',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['brown', 'pink'] as const,
            frequencyMultiplier: 0.92,
            durationMultiplier: 1,
            volumeMultiplier: 0.38,
            startOffsetMs: 48,
            startOffsetVariation: 0.28,
            frequencyVariation: 0.02,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.82,
          },
        ] as const;
      }
      if (identityVariant === 'insects') {
        return [
          {
            id: 'forest-insect-bed',
            waveform: ['square', 'sine'] as const,
            noiseColor: 'pink' as const,
            frequencyMultiplier: 1.34,
            durationMultiplier: 0.74,
            volumeMultiplier: 0.18,
            frequencyVariation: 0.032,
            durationVariation: 0.2,
            volumeVariation: 0.1,
            variationDepth: 0.92,
            tremolo: {
              rateHz: 8.8,
              depth: 0.22,
              waveform: 'square' as const,
              rateVariation: 0.08,
              depthVariation: 0.06,
            },
          },
          {
            id: 'forest-leaf-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['pink', 'brown'] as const,
            frequencyMultiplier: 0.88,
            durationMultiplier: 1,
            volumeMultiplier: 0.42,
            startOffsetMs: 32,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.022,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.84,
          },
        ] as const;
      }
      return [
        {
          id: 'forest-noise-bed',
          waveform: ['triangle', 'sine'] as const,
          noiseColor: 'pink' as const,
          frequencyMultiplier: 0.8,
          durationMultiplier: 1,
          volumeMultiplier: 0.5,
          frequencyVariation: 0.02,
          durationVariation: 0.12,
          volumeVariation: 0.08,
          variationDepth: 1,
        },
        {
          id: 'forest-canopy-rustle',
          waveform: ['sine', 'triangle'] as const,
          noiseColor: ['pink', 'brown'] as const,
          frequencyMultiplier: 1.24,
          durationMultiplier: 0.88,
          volumeMultiplier: 0.2,
          startOffsetMs: 44,
          startOffsetVariation: 0.34,
          frequencyVariation: 0.026,
          durationVariation: 0.11,
          volumeVariation: 0.08,
          variationDepth: 0.78,
          filters: [
            {
              type: 'bandpass' as const,
              frequency: 980,
              q: 0.9,
              frequencyVariation: 0.04,
              qVariation: 0.05,
            },
          ] as const,
        },
      ] as const;
    case 'plains-ambience':
      if (identityVariant === 'nearby-birds') {
        return [
          {
            id: 'plains-near-birdsong',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.4,
            durationMultiplier: 0.66,
            volumeMultiplier: 0.22,
            frequencyVariation: 0.034,
            durationVariation: 0.18,
            volumeVariation: 0.08,
            variationDepth: 0.86,
          },
          {
            id: 'plains-bird-grass-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['pink', 'white'] as const,
            frequencyMultiplier: 0.84,
            durationMultiplier: 1,
            volumeMultiplier: 0.28,
            startOffsetMs: 20,
            startOffsetVariation: 0.2,
            frequencyVariation: 0.022,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.78,
          },
        ] as const;
      }
      if (identityVariant === 'distant-birds') {
        return [
          {
            id: 'plains-distant-birdsong',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.2,
            durationMultiplier: 0.72,
            volumeMultiplier: 0.12,
            frequencyVariation: 0.03,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
          {
            id: 'plains-distance-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['pink', 'white'] as const,
            frequencyMultiplier: 0.78,
            durationMultiplier: 1,
            volumeMultiplier: 0.24,
            startOffsetMs: 42,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.02,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.76,
          },
        ] as const;
      }
      if (identityVariant === 'animal-calls') {
        return [
          {
            id: 'plains-animal-call',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1,
            durationMultiplier: 0.82,
            volumeMultiplier: 0.14,
            frequencyVariation: 0.028,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.78,
          },
          {
            id: 'plains-herd-distance-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['brown', 'pink'] as const,
            frequencyMultiplier: 0.76,
            durationMultiplier: 1,
            volumeMultiplier: 0.24,
            startOffsetMs: 40,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.02,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.74,
          },
        ] as const;
      }
      if (identityVariant === 'vegetation-rustle') {
        return [
          {
            id: 'plains-vegetation-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['pink', 'white'] as const,
            frequencyMultiplier: 0.82,
            durationMultiplier: 1,
            volumeMultiplier: 0.34,
            frequencyVariation: 0.022,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.78,
          },
          {
            id: 'plains-stalk-shift',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.02,
            durationMultiplier: 0.7,
            volumeMultiplier: 0.1,
            startOffsetMs: 24,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.026,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.74,
          },
        ] as const;
      }
      if (identityVariant === 'migrating-birds') {
        return [
          {
            id: 'plains-migration-calls',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.28,
            durationMultiplier: 0.68,
            volumeMultiplier: 0.14,
            frequencyVariation: 0.032,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
          {
            id: 'plains-open-sky-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['white', 'pink'] as const,
            frequencyMultiplier: 0.78,
            durationMultiplier: 1,
            volumeMultiplier: 0.22,
            startOffsetMs: 36,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.02,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.74,
          },
        ] as const;
      }
      if (identityVariant === 'autumn-leaves') {
        return [
          {
            id: 'plains-autumn-grass-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['brown', 'white'] as const,
            frequencyMultiplier: 0.8,
            durationMultiplier: 1,
            volumeMultiplier: 0.32,
            frequencyVariation: 0.022,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.76,
          },
          {
            id: 'plains-dry-leaf-scatter',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.04,
            durationMultiplier: 0.7,
            volumeMultiplier: 0.12,
            startOffsetMs: 22,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.026,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.74,
          },
        ] as const;
      }
      if (identityVariant === 'dawn-birds') {
        return [
          {
            id: 'plains-dawn-birds',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.34,
            durationMultiplier: 0.7,
            volumeMultiplier: 0.2,
            frequencyVariation: 0.034,
            durationVariation: 0.18,
            volumeVariation: 0.08,
            variationDepth: 0.88,
          },
          {
            id: 'plains-morning-grass',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['pink', 'white'] as const,
            frequencyMultiplier: 0.86,
            durationMultiplier: 1,
            volumeMultiplier: 0.34,
            startOffsetMs: 24,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.022,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
        ] as const;
      }
      if (identityVariant === 'summer-insects') {
        return [
          {
            id: 'plains-summer-insects',
            waveform: ['square', 'sine'] as const,
            noiseColor: 'pink' as const,
            frequencyMultiplier: 1.36,
            durationMultiplier: 0.66,
            volumeMultiplier: 0.18,
            frequencyVariation: 0.032,
            durationVariation: 0.18,
            volumeVariation: 0.08,
            variationDepth: 0.88,
          },
          {
            id: 'plains-heat-breeze',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['white', 'pink'] as const,
            frequencyMultiplier: 0.8,
            durationMultiplier: 1,
            volumeMultiplier: 0.36,
            startOffsetMs: 28,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.022,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
        ] as const;
      }
      if (identityVariant === 'night-crickets') {
        return [
          {
            id: 'plains-night-crickets',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'pink' as const,
            frequencyMultiplier: 1.24,
            durationMultiplier: 0.64,
            volumeMultiplier: 0.16,
            frequencyVariation: 0.03,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.84,
          },
          {
            id: 'plains-night-breeze',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['white', 'brown'] as const,
            frequencyMultiplier: 0.74,
            durationMultiplier: 1,
            volumeMultiplier: 0.28,
            startOffsetMs: 34,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.02,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.76,
          },
        ] as const;
      }
      if (identityVariant === 'spring-frogs') {
        return [
          {
            id: 'plains-spring-frogs',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.94,
            durationMultiplier: 0.78,
            volumeMultiplier: 0.18,
            frequencyVariation: 0.03,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.82,
          },
          {
            id: 'plains-thaw-breeze',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['pink', 'brown'] as const,
            frequencyMultiplier: 0.82,
            durationMultiplier: 1,
            volumeMultiplier: 0.32,
            startOffsetMs: 30,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.022,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.78,
          },
        ] as const;
      }
      if (identityVariant === 'winter-quiet') {
        return [
          {
            id: 'plains-winter-hush',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.68,
            durationMultiplier: 1,
            volumeMultiplier: 0.34,
            frequencyVariation: 0.018,
            durationVariation: 0.12,
            volumeVariation: 0.06,
            variationDepth: 0.76,
          },
          {
            id: 'plains-cold-grass',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 0.88,
            durationMultiplier: 0.76,
            volumeMultiplier: 0.1,
            startOffsetMs: 42,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.024,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.72,
          },
        ] as const;
      }
      if (identityVariant === 'wildlife') {
        return [
          {
            id: 'plains-herd-calls',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.06,
            durationMultiplier: 0.84,
            volumeMultiplier: 0.14,
            frequencyVariation: 0.028,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.78,
          },
          {
            id: 'plains-field-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['pink', 'white'] as const,
            frequencyMultiplier: 0.82,
            durationMultiplier: 1,
            volumeMultiplier: 0.36,
            startOffsetMs: 34,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.022,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
        ] as const;
      }
      return [
        {
          id: 'plains-grass-bed',
          waveform: ['triangle', 'sine'] as const,
          noiseColor: ['pink', 'white'] as const,
          frequencyMultiplier: 0.8,
          durationMultiplier: 1,
          volumeMultiplier: 0.4,
          frequencyVariation: 0.022,
          durationVariation: 0.12,
          volumeVariation: 0.08,
          variationDepth: 0.82,
        },
        {
          id: 'plains-breeze-edge',
          waveform: ['sine', 'triangle'] as const,
          noiseColor: 'white' as const,
          frequencyMultiplier: 1.08,
          durationMultiplier: 0.84,
          volumeMultiplier: 0.14,
          startOffsetMs: 28,
          startOffsetVariation: 0.22,
          frequencyVariation: 0.026,
          durationVariation: 0.14,
          volumeVariation: 0.08,
          variationDepth: 0.76,
        },
      ] as const;
    case 'mountain-ambience':
      if (identityVariant === 'falling-rocks') {
        return [
          {
            id: 'mountain-fall-bed',
            waveform: ['triangle', 'sawtooth'] as const,
            noiseColor: ['brown', 'white'] as const,
            frequencyMultiplier: 0.78,
            durationMultiplier: 1,
            volumeMultiplier: 0.4,
            frequencyVariation: 0.024,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.84,
          },
          {
            id: 'mountain-rockfall-clack',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.16,
            durationMultiplier: 0.68,
            volumeMultiplier: 0.18,
            startOffsetMs: 54,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.03,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
        ] as const;
      }
      if (identityVariant === 'animal-calls') {
        return [
          {
            id: 'mountain-animal-call',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.08,
            durationMultiplier: 0.84,
            volumeMultiplier: 0.14,
            frequencyVariation: 0.03,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.78,
          },
          {
            id: 'mountain-far-air-bed',
            waveform: ['triangle', 'sawtooth'] as const,
            noiseColor: ['white', 'brown'] as const,
            frequencyMultiplier: 0.74,
            durationMultiplier: 1,
            volumeMultiplier: 0.28,
            startOffsetMs: 40,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.02,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.76,
          },
        ] as const;
      }
      if (identityVariant === 'migrating-birds') {
        return [
          {
            id: 'mountain-migration-calls',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.46,
            durationMultiplier: 0.66,
            volumeMultiplier: 0.14,
            frequencyVariation: 0.034,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
          {
            id: 'mountain-open-ridge-bed',
            waveform: ['triangle', 'sawtooth'] as const,
            noiseColor: ['white', 'brown'] as const,
            frequencyMultiplier: 0.76,
            durationMultiplier: 1,
            volumeMultiplier: 0.24,
            startOffsetMs: 36,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.02,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.74,
          },
        ] as const;
      }
      if (identityVariant === 'mystery-hint') {
        return [
          {
            id: 'mountain-mystery-tone',
            waveform: ['sine', 'triangle'] as const,
            frequencyMultiplier: 1.18,
            durationMultiplier: 0.88,
            volumeMultiplier: 0.1,
            frequencyVariation: 0.02,
            durationVariation: 0.12,
            volumeVariation: 0.06,
            variationDepth: 0.7,
          },
          {
            id: 'mountain-void-bed',
            waveform: ['triangle', 'sawtooth'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.72,
            durationMultiplier: 1,
            volumeMultiplier: 0.2,
            startOffsetMs: 56,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.018,
            durationVariation: 0.12,
            volumeVariation: 0.06,
            variationDepth: 0.68,
          },
        ] as const;
      }
      if (identityVariant === 'highland-birds') {
        return [
          {
            id: 'mountain-bird-calls',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.54,
            durationMultiplier: 0.68,
            volumeMultiplier: 0.16,
            frequencyVariation: 0.034,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.86,
            vibrato: {
              rateHz: 5.8,
              depthHz: 0.05,
              waveform: ['sine', 'triangle'] as const,
              rateVariation: 0.05,
              depthVariation: 0.05,
            },
          },
          {
            id: 'mountain-air-bed',
            waveform: ['triangle', 'sawtooth'] as const,
            noiseColor: ['white', 'brown'] as const,
            frequencyMultiplier: 0.78,
            durationMultiplier: 1,
            volumeMultiplier: 0.48,
            startOffsetMs: 36,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.02,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.82,
          },
        ] as const;
      }
      if (identityVariant === 'stone') {
        return [
          {
            id: 'mountain-rumble-bed',
            waveform: ['sawtooth', 'triangle'] as const,
            noiseColor: ['brown', 'white'] as const,
            frequencyMultiplier: 0.74,
            durationMultiplier: 1,
            volumeMultiplier: 0.52,
            frequencyVariation: 0.024,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.88,
          },
          {
            id: 'mountain-rock-shift',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.08,
            durationMultiplier: 0.72,
            volumeMultiplier: 0.18,
            startOffsetMs: 68,
            startOffsetVariation: 0.26,
            frequencyVariation: 0.03,
            durationVariation: 0.18,
            volumeVariation: 0.1,
            variationDepth: 0.84,
            delay: {
              timeMs: 92,
              feedback: 0.16,
              mix: 0.12,
              timeVariation: 0.05,
              feedbackVariation: 0.06,
              mixVariation: 0.08,
            },
          },
        ] as const;
      }
      return [
        {
          id: 'mountain-wind-bed',
          waveform: ['triangle', 'sawtooth'] as const,
          noiseColor: ['white', 'brown'] as const,
          frequencyMultiplier: 0.76,
          durationMultiplier: 1,
          volumeMultiplier: 0.54,
          frequencyVariation: 0.024,
          durationVariation: 0.16,
          volumeVariation: 0.08,
          variationDepth: 0.92,
        },
        {
          id: 'mountain-ridge-echo',
          waveform: ['sine', 'triangle'] as const,
          frequencyMultiplier: 1.12,
          durationMultiplier: 0.84,
          volumeMultiplier: 0.16,
          startOffsetMs: 52,
          startOffsetVariation: 0.24,
          frequencyVariation: 0.03,
          durationVariation: 0.14,
          volumeVariation: 0.08,
          variationDepth: 0.8,
          delay: {
            timeMs: 108,
            feedback: 0.2,
            mix: 0.14,
            timeVariation: 0.05,
            feedbackVariation: 0.06,
            mixVariation: 0.08,
          },
        },
      ] as const;
    case 'cave-ambience':
      if (identityVariant === 'drips') {
        return [
          {
            id: 'cave-drip-bed',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.72,
            durationMultiplier: 1,
            volumeMultiplier: 0.46,
            frequencyVariation: 0.018,
            durationVariation: 0.1,
            volumeVariation: 0.06,
            variationDepth: 0.84,
          },
          {
            id: 'cave-drip-strike',
            waveform: ['triangle', 'sine'] as const,
            frequencyMultiplier: 1.74,
            durationMultiplier: 0.48,
            volumeMultiplier: 0.15,
            startOffsetMs: 96,
            startOffsetVariation: 0.38,
            frequencyVariation: 0.028,
            durationVariation: 0.16,
            volumeVariation: 0.1,
            variationDepth: 0.78,
            delay: {
              timeMs: 136,
              feedback: 0.24,
              mix: 0.18,
              timeVariation: 0.06,
              feedbackVariation: 0.07,
              mixVariation: 0.08,
            },
          },
        ] as const;
      }
      if (identityVariant === 'underground-wind') {
        return [
          {
            id: 'cave-wind-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['brown', 'pink'] as const,
            frequencyMultiplier: 0.7,
            durationMultiplier: 1,
            volumeMultiplier: 0.5,
            frequencyVariation: 0.02,
            durationVariation: 0.12,
            volumeVariation: 0.06,
            variationDepth: 0.88,
          },
          {
            id: 'cave-whistle-edge',
            waveform: ['sine', 'triangle'] as const,
            frequencyMultiplier: 1.26,
            durationMultiplier: 0.82,
            volumeMultiplier: 0.14,
            startOffsetMs: 44,
            startOffsetVariation: 0.28,
            frequencyVariation: 0.024,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.76,
            tremolo: {
              rateHz: 4.6,
              depth: 0.14,
              waveform: ['sine', 'triangle'] as const,
              rateVariation: 0.05,
              depthVariation: 0.05,
            },
          },
        ] as const;
      }
      return [
        {
          id: 'cave-hollow-bed',
          waveform: ['sine', 'triangle'] as const,
          noiseColor: 'brown' as const,
          frequencyMultiplier: 0.76,
          durationMultiplier: 1,
          volumeMultiplier: 0.52,
          frequencyVariation: 0.018,
          durationVariation: 0.1,
          volumeVariation: 0.06,
          variationDepth: 0.86,
        },
        {
          id: 'cave-drip-echo',
          waveform: ['sine', 'triangle'] as const,
          frequencyMultiplier: 1.62,
          durationMultiplier: 0.52,
          volumeMultiplier: 0.13,
          startOffsetMs: 80,
          startOffsetVariation: 0.42,
          frequencyVariation: 0.028,
          durationVariation: 0.14,
          volumeVariation: 0.1,
          variationDepth: 0.74,
          delay: {
            timeMs: 124,
            feedback: 0.22,
            mix: 0.16,
            timeVariation: 0.06,
            feedbackVariation: 0.07,
            mixVariation: 0.08,
          },
        },
      ] as const;
    case 'settlement-ambience':
      if (identityVariant === 'nearby-birds') {
        return [
          {
            id: 'settlement-courtyard-birds',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.3,
            durationMultiplier: 0.66,
            volumeMultiplier: 0.16,
            frequencyVariation: 0.03,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.78,
          },
          {
            id: 'settlement-eaves-rustle',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['pink', 'white'] as const,
            frequencyMultiplier: 0.84,
            durationMultiplier: 1,
            volumeMultiplier: 0.22,
            startOffsetMs: 22,
            startOffsetVariation: 0.2,
            frequencyVariation: 0.022,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.74,
          },
        ] as const;
      }
      if (identityVariant === 'rooster-bells') {
        return [
          {
            id: 'settlement-rooster-call',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.22,
            durationMultiplier: 0.74,
            volumeMultiplier: 0.16,
            frequencyVariation: 0.03,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
          {
            id: 'settlement-dawn-bell',
            waveform: ['triangle', 'sine'] as const,
            frequencyMultiplier: 1.58,
            durationMultiplier: 0.6,
            volumeMultiplier: 0.12,
            startOffsetMs: 54,
            startOffsetVariation: 0.18,
            frequencyVariation: 0.024,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.74,
          },
        ] as const;
      }
      if (identityVariant === 'market') {
        return [
          {
            id: 'settlement-market-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['pink', 'white'] as const,
            frequencyMultiplier: 0.84,
            durationMultiplier: 1,
            volumeMultiplier: 0.42,
            frequencyVariation: 0.022,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.82,
          },
          {
            id: 'settlement-work-rattle',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.18,
            durationMultiplier: 0.72,
            volumeMultiplier: 0.14,
            startOffsetMs: 34,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.028,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.78,
          },
        ] as const;
      }
      if (identityVariant === 'tavern') {
        return [
          {
            id: 'settlement-tavern-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['pink', 'white'] as const,
            frequencyMultiplier: 0.86,
            durationMultiplier: 1,
            volumeMultiplier: 0.38,
            frequencyVariation: 0.022,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
          {
            id: 'settlement-evening-fiddle',
            waveform: ['sine', 'triangle'] as const,
            frequencyMultiplier: 1.24,
            durationMultiplier: 0.76,
            volumeMultiplier: 0.14,
            startOffsetMs: 38,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.028,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.76,
            vibrato: {
              rateHz: 5.1,
              depthHz: 0.04,
              waveform: ['sine', 'triangle'] as const,
              rateVariation: 0.05,
              depthVariation: 0.05,
            },
          },
        ] as const;
      }
      if (identityVariant === 'quiet-lanterns') {
        return [
          {
            id: 'settlement-lantern-hum',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.76,
            durationMultiplier: 1,
            volumeMultiplier: 0.28,
            frequencyVariation: 0.018,
            durationVariation: 0.1,
            volumeVariation: 0.06,
            variationDepth: 0.72,
          },
          {
            id: 'settlement-night-step',
            waveform: ['triangle', 'square'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 0.98,
            durationMultiplier: 0.7,
            volumeMultiplier: 0.08,
            startOffsetMs: 46,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.024,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.72,
          },
        ] as const;
      }
      return [
        {
          id: 'settlement-town-bed',
          waveform: ['triangle', 'sine'] as const,
          noiseColor: ['pink', 'white'] as const,
          frequencyMultiplier: 0.82,
          durationMultiplier: 1,
          volumeMultiplier: 0.38,
          frequencyVariation: 0.022,
          durationVariation: 0.12,
          volumeVariation: 0.08,
          variationDepth: 0.78,
        },
        {
          id: 'settlement-far-clatter',
          waveform: ['square', 'triangle'] as const,
          noiseColor: 'white' as const,
          frequencyMultiplier: 1.08,
          durationMultiplier: 0.7,
          volumeMultiplier: 0.12,
          startOffsetMs: 34,
          startOffsetVariation: 0.22,
          frequencyVariation: 0.026,
          durationVariation: 0.14,
          volumeVariation: 0.08,
          variationDepth: 0.74,
        },
      ] as const;
    case 'ocean':
      if (identityVariant === 'frozen') {
        return [
          {
            id: 'ocean-frozen-surge',
            waveform: ['triangle', 'square'] as const,
            noiseColor: ['white', 'brown'] as const,
            frequencyMultiplier: 0.72,
            durationMultiplier: 1,
            volumeMultiplier: 0.42,
            frequencyVariation: 0.022,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
          {
            id: 'ocean-ice-shear',
            waveform: ['square', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.16,
            durationMultiplier: 0.76,
            volumeMultiplier: 0.16,
            startOffsetMs: 32,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.026,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.74,
          },
        ] as const;
      }
      if (identityVariant === 'water-splashes') {
        return [
          {
            id: 'ocean-splash-bed',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.76,
            durationMultiplier: 1,
            volumeMultiplier: 0.44,
            frequencyVariation: 0.024,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.88,
          },
          {
            id: 'ocean-splash-break',
            waveform: ['triangle', 'square'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.18,
            durationMultiplier: 0.68,
            volumeMultiplier: 0.18,
            startOffsetMs: 30,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.03,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.8,
          },
        ] as const;
      }
      if (identityVariant === 'seabirds') {
        return [
          {
            id: 'ocean-gull-calls',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.82,
            durationMultiplier: 0.6,
            volumeMultiplier: 0.14,
            frequencyVariation: 0.04,
            durationVariation: 0.18,
            volumeVariation: 0.1,
            variationDepth: 0.9,
            vibrato: {
              rateHz: 5.4,
              depthHz: 0.04,
              waveform: 'sine' as const,
              rateVariation: 0.05,
              depthVariation: 0.05,
            },
          },
          {
            id: 'ocean-surf-bed',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.76,
            durationMultiplier: 1,
            volumeMultiplier: 0.5,
            startOffsetMs: 40,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.024,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.82,
          },
        ] as const;
      }
      if (identityVariant === 'shoreline') {
        return [
          {
            id: 'shore-wash-bed',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: ['brown', 'white'] as const,
            frequencyMultiplier: 0.72,
            durationMultiplier: 1,
            volumeMultiplier: 0.52,
            frequencyVariation: 0.026,
            durationVariation: 0.14,
            volumeVariation: 0.08,
            variationDepth: 0.92,
          },
          {
            id: 'shore-pebble-shift',
            waveform: ['triangle', 'square'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.08,
            durationMultiplier: 0.72,
            volumeMultiplier: 0.18,
            startOffsetMs: 52,
            startOffsetVariation: 0.26,
            frequencyVariation: 0.03,
            durationVariation: 0.18,
            volumeVariation: 0.1,
            variationDepth: 0.8,
          },
        ] as const;
      }
      return [
        {
          id: 'ocean-surf-bed',
          waveform: ['sine', 'triangle'] as const,
          noiseColor: 'brown' as const,
          frequencyMultiplier: 0.74,
          durationMultiplier: 1,
          volumeMultiplier: 0.54,
          frequencyVariation: 0.024,
          durationVariation: 0.14,
          volumeVariation: 0.08,
          variationDepth: 0.94,
        },
        {
          id: 'ocean-wind-spray',
          waveform: ['triangle', 'sine'] as const,
          noiseColor: ['white', 'pink'] as const,
          frequencyMultiplier: 1.12,
          durationMultiplier: 0.84,
          volumeMultiplier: 0.16,
          startOffsetMs: 36,
          startOffsetVariation: 0.3,
          frequencyVariation: 0.03,
          durationVariation: 0.16,
          volumeVariation: 0.08,
          variationDepth: 0.82,
        },
      ] as const;
    case 'ruins-ambience':
      if (identityVariant === 'landmark-hint') {
        return [
          {
            id: 'ruins-landmark-tone',
            waveform: ['sine', 'triangle'] as const,
            frequencyMultiplier: 1.22,
            durationMultiplier: 0.86,
            volumeMultiplier: 0.1,
            frequencyVariation: 0.02,
            durationVariation: 0.12,
            volumeVariation: 0.06,
            variationDepth: 0.7,
            delay: {
              timeMs: 164,
              feedback: 0.2,
              mix: 0.16,
              timeVariation: 0.05,
              feedbackVariation: 0.06,
              mixVariation: 0.08,
            },
          },
          {
            id: 'ruins-stone-hum',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: 'brown' as const,
            frequencyMultiplier: 0.72,
            durationMultiplier: 1,
            volumeMultiplier: 0.22,
            startOffsetMs: 48,
            startOffsetVariation: 0.24,
            frequencyVariation: 0.018,
            durationVariation: 0.12,
            volumeVariation: 0.06,
            variationDepth: 0.68,
          },
        ] as const;
      }
      if (identityVariant === 'migrating-birds') {
        return [
          {
            id: 'ruins-migration-calls',
            waveform: ['sine', 'triangle'] as const,
            noiseColor: 'white' as const,
            frequencyMultiplier: 1.26,
            durationMultiplier: 0.7,
            volumeMultiplier: 0.12,
            frequencyVariation: 0.03,
            durationVariation: 0.16,
            volumeVariation: 0.08,
            variationDepth: 0.76,
          },
          {
            id: 'ruins-open-court-bed',
            waveform: ['triangle', 'sine'] as const,
            noiseColor: ['white', 'brown'] as const,
            frequencyMultiplier: 0.76,
            durationMultiplier: 1,
            volumeMultiplier: 0.2,
            startOffsetMs: 36,
            startOffsetVariation: 0.22,
            frequencyVariation: 0.02,
            durationVariation: 0.12,
            volumeVariation: 0.08,
            variationDepth: 0.72,
          },
        ] as const;
      }
      return [
        {
          id: 'ruins-mystery-tone',
          waveform: ['sine', 'triangle'] as const,
          frequencyMultiplier: 1.16,
          durationMultiplier: 0.9,
          volumeMultiplier: 0.1,
          frequencyVariation: 0.02,
          durationVariation: 0.12,
          volumeVariation: 0.06,
          variationDepth: 0.7,
        },
        {
          id: 'ruins-ghost-bed',
          waveform: ['triangle', 'sine'] as const,
          noiseColor: 'brown' as const,
          frequencyMultiplier: 0.7,
          durationMultiplier: 1,
          volumeMultiplier: 0.22,
          startOffsetMs: 50,
          startOffsetVariation: 0.24,
          frequencyVariation: 0.018,
          durationVariation: 0.12,
          volumeVariation: 0.06,
          variationDepth: 0.68,
        },
      ] as const;
    default:
      return undefined;
  }
}

function resolveBaseSoundEffectFrequency(
  options: ResolveSoundRecipeOptions
): number {
  const seasonalVariant = resolveSeasonalVariantSeason(options.identityVariant);
  const baseVariant = resolveSeasonalVariantBase(options.identityVariant);
  switch (options.kind) {
    case 'jump':
      return options.profile.footstepFrequency + 72;
    case 'thunder':
      return (
        114 +
        (baseVariant === 'overhead' ? 34 : baseVariant === 'near' ? 10 : -20) +
        (seasonalVariant === 'summer'
          ? 12
          : seasonalVariant === 'spring'
            ? 6
            : 0) +
        options.variantOffset * 0.32
      );
    case 'hail':
      return (
        228 +
        (options.identityVariant === 'roof'
          ? 24
          : options.identityVariant === 'rock'
            ? 18
            : options.identityVariant === 'wood'
              ? 8
              : options.identityVariant === 'water'
                ? -10
                : options.identityVariant === 'snow'
                  ? -26
                  : 0) +
        options.variantOffset * 0.45
      );
    case 'snowstorm':
      return (
        168 +
        (options.identityVariant === 'whiteout' ? -12 : 0) +
        options.variantOffset * 0.3
      );
    case 'rain':
      return (
        176 +
        (baseVariant === 'roof'
          ? -12
          : baseVariant === 'leaves'
            ? 6
            : baseVariant === 'water'
              ? 10
              : 0) +
        (seasonalVariant === 'spring'
          ? 10
          : seasonalVariant === 'autumn'
            ? -6
            : 0) +
        options.variantOffset * 0.35
      );
    case 'wind':
      return (
        190 +
        (baseVariant === 'sandstorm'
          ? 38
          : baseVariant === 'cyclone'
            ? -22
            : baseVariant === 'canopy'
              ? 16
              : baseVariant === 'crossdraft'
                ? 30
                : baseVariant === 'stormfront'
                  ? 10
                  : options.tileKind === 'forest'
                    ? 16
                    : 0) +
        (seasonalVariant === 'autumn'
          ? 8
          : seasonalVariant === 'summer'
            ? -6
            : 0) +
        options.variantOffset * 0.4
      );
    case 'ocean':
      return (
        options.resolveAmbientSoundFrequency('ocean', undefined) +
        (options.identityVariant === 'frozen' ? 18 : 0)
      );
    case 'river-ambience':
      return (
        options.resolveAmbientSoundFrequency('river', undefined) +
        (options.identityVariant === 'frozen' ? 22 : 0)
      );
    case 'forest-ambience':
      return options.resolveAmbientSoundFrequency('forest', undefined);
    case 'plains-ambience':
      return options.resolveAmbientSoundFrequency('plains', undefined);
    case 'mountain-ambience':
      return options.resolveAmbientSoundFrequency('mountain', undefined);
    case 'cave-ambience':
      return options.resolveAmbientSoundFrequency('cave', undefined);
    case 'settlement-ambience':
      return options.resolveAmbientSoundFrequency('settlement', undefined);
    case 'ruins-ambience':
      return options.resolveAmbientSoundFrequency('ruins', undefined);
    case 'advancement':
      return options.resolveAdvancementFrequency();
    case 'train-engine':
      return 74 + options.variantOffset * 0.35;
    case 'train-whistle':
      return 356 + options.variantOffset * 0.6;
    case 'paddle-calliope':
      return options.resolvePaddleBoatCalliopeFrequency(undefined);
    case 'steam-whistle':
      return options.resolveSteamWhistleFrequency();
    case 'combat-weapon':
      return 148 + options.variantOffset * 0.5;
    case 'combat-magic':
      return 244 + options.variantOffset * 0.5;
    case 'open':
      return options.resolveInteractionFrequency(
        'open',
        options.tileKind,
        options.profile,
        options.variantOffset
      );
    case 'close':
      return options.resolveInteractionFrequency(
        'close',
        options.tileKind,
        options.profile,
        options.variantOffset
      );
    case 'blocked':
      return Math.max(
        58,
        options.profile.landingFrequency - 18 + options.variantOffset
      );
    case 'landing':
      return (
        options.profile.landingFrequency +
        options.variantOffset +
        resolveMovementIdentityVariantOffset(options.identityVariant)
      );
    case 'footstep':
    default:
      return (
        options.profile.footstepFrequency +
        options.variantOffset +
        resolveMovementIdentityVariantOffset(options.identityVariant)
      );
  }
}

function resolveBaseSoundEffectDurationMs(kind: SoundEffectKind): number {
  switch (kind) {
    case 'jump':
      return 140;
    case 'thunder':
      return 2600;
    case 'hail':
      return 980;
    case 'snowstorm':
      return 2100;
    case 'rain':
      return 1900;
    case 'wind':
      return 680;
    case 'ocean':
    case 'river-ambience':
    case 'forest-ambience':
    case 'plains-ambience':
    case 'mountain-ambience':
    case 'cave-ambience':
    case 'settlement-ambience':
    case 'ruins-ambience':
      return 1680;
    case 'advancement':
      return 260;
    case 'train-engine':
      return 420;
    case 'train-whistle':
      return 880;
    case 'paddle-calliope':
      return 1180;
    case 'steam-whistle':
      return 1050;
    case 'combat-weapon':
      return 160;
    case 'combat-magic':
      return 320;
    case 'landing':
      return 120;
    case 'blocked':
      return 105;
    case 'open':
    case 'close':
      return 135;
    case 'footstep':
    default:
      return 90;
  }
}

function resolveBaseSoundEffectVolume(
  kind: SoundEffectKind,
  profile: SoundRecipeSurfaceProfile,
  identityVariant?: string
): number {
  const seasonalVariant = resolveSeasonalVariantSeason(identityVariant);
  switch (kind) {
    case 'jump':
      return profile.footstepVolume * 1.2;
    case 'thunder':
      return seasonalVariant === 'summer'
        ? 0.034
        : seasonalVariant === 'spring'
          ? 0.032
          : 0.03;
    case 'hail':
      return 0.02;
    case 'snowstorm':
      return 0.018;
    case 'rain':
      return seasonalVariant === 'spring'
        ? 0.026
        : seasonalVariant === 'autumn'
          ? 0.023
          : 0.024;
    case 'wind':
      return seasonalVariant === 'autumn'
        ? 0.02
        : seasonalVariant === 'summer'
          ? 0.019
          : 0.018;
    case 'ocean':
      return identityVariant === 'frozen' ? 0.022 : 0.026;
    case 'river-ambience':
      return identityVariant === 'frozen' ? 0.019 : 0.022;
    case 'forest-ambience':
      return 0.018;
    case 'plains-ambience':
      return 0.016;
    case 'mountain-ambience':
      return 0.02;
    case 'cave-ambience':
      return 0.022;
    case 'settlement-ambience':
      return 0.017;
    case 'ruins-ambience':
      return 0.019;
    case 'advancement':
      return 0.052;
    case 'train-engine':
      return 0.03;
    case 'train-whistle':
      return 0.042;
    case 'paddle-calliope':
      return 0.034;
    case 'steam-whistle':
      return 0.048;
    case 'combat-weapon':
      return 0.056;
    case 'combat-magic':
      return 0.05;
    case 'open':
    case 'close':
      return profile.landingVolume * 0.8;
    case 'blocked':
      return profile.landingVolume * 0.7;
    case 'landing':
      return identityVariant === 'winter-snow'
        ? profile.landingVolume * 0.9
        : identityVariant === 'dry-leaves'
          ? profile.landingVolume * 0.96
          : profile.landingVolume;
    case 'footstep':
    default:
      return identityVariant === 'winter-snow'
        ? profile.footstepVolume * 0.92
        : identityVariant === 'dry-leaves'
          ? profile.footstepVolume * 0.98
          : profile.footstepVolume;
  }
}

function resolveBaseSoundEffectWaveform(
  kind: SoundEffectKind,
  tileKind: string | undefined,
  profile: SoundRecipeSurfaceProfile,
  resolveInteractionWaveform: ResolveSoundRecipeOptions['resolveInteractionWaveform'],
  identityVariant?: string
): SoundWaveform | readonly SoundWaveform[] {
  const seasonalVariant = resolveSeasonalVariantSeason(identityVariant);
  switch (kind) {
    case 'blocked':
      return 'sawtooth';
    case 'thunder':
      return seasonalVariant === 'summer'
        ? ['sawtooth', 'square', 'triangle']
        : ['sawtooth', 'triangle', 'sine'];
    case 'hail':
      return ['square', 'triangle'];
    case 'snowstorm':
      return ['triangle', 'sine'];
    case 'rain':
      return seasonalVariant === 'autumn'
        ? ['triangle', 'square']
        : ['triangle', 'sine'];
    case 'wind':
      return seasonalVariant === 'summer'
        ? ['sawtooth', 'triangle']
        : 'triangle';
    case 'ocean':
      return identityVariant === 'frozen' ? ['triangle', 'square'] : 'sine';
    case 'river-ambience':
      return identityVariant === 'frozen'
        ? ['triangle', 'square']
        : ['triangle', 'sine'];
    case 'forest-ambience':
      return ['triangle', 'sine', 'square'];
    case 'plains-ambience':
      return ['sine', 'triangle'];
    case 'mountain-ambience':
      return ['sawtooth', 'triangle'];
    case 'cave-ambience':
      return ['sine', 'triangle'];
    case 'settlement-ambience':
      return ['square', 'triangle'];
    case 'ruins-ambience':
      return ['triangle', 'sawtooth'];
    case 'advancement':
      return ['sine', 'triangle'];
    case 'train-engine':
      return 'sawtooth';
    case 'train-whistle':
      return 'square';
    case 'paddle-calliope':
      return ['triangle', 'sine', 'square'];
    case 'steam-whistle':
      return ['square', 'sawtooth'];
    case 'combat-weapon':
      return 'sawtooth';
    case 'combat-magic':
      return ['triangle', 'sine', 'square'];
    case 'open':
    case 'close':
      return resolveInteractionWaveform(tileKind, profile.waveform);
    case 'footstep':
    case 'jump':
    case 'landing':
    default:
      return identityVariant === 'dry-leaves'
        ? ['triangle', 'square']
        : profile.waveform;
  }
}

function resolveBaseSoundEffectNoiseColor(
  kind: SoundEffectKind,
  identityVariant?: string
): ProceduralNoiseColor | readonly ProceduralNoiseColor[] | undefined {
  const seasonalVariant = resolveSeasonalVariantSeason(identityVariant);
  switch (kind) {
    case 'thunder':
      return seasonalVariant === 'summer'
        ? ['white', 'pink']
        : ['white', 'brown'];
    case 'hail':
      return ['white', 'pink'];
    case 'snowstorm':
      return ['white', 'pink'];
    case 'rain':
      return seasonalVariant === 'autumn'
        ? ['pink', 'brown']
        : ['white', 'pink'];
    case 'wind':
      return seasonalVariant === 'autumn' ? ['brown', 'pink'] : 'brown';
    case 'ocean':
      return identityVariant === 'frozen' ? ['white', 'brown'] : 'brown';
    case 'river-ambience':
      return identityVariant === 'frozen'
        ? ['white', 'brown']
        : ['white', 'pink'];
    case 'forest-ambience':
      return ['pink', 'brown'];
    case 'plains-ambience':
      return ['white', 'pink'];
    case 'mountain-ambience':
      return ['white', 'brown'];
    case 'cave-ambience':
      return 'brown';
    case 'ruins-ambience':
      return 'pink';
    default:
      return identityVariant === 'dry-leaves' ? ['brown', 'pink'] : undefined;
  }
}
