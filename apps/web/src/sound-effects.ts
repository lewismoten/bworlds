import {
  appendHashSeedPart,
  createRandom,
  registerHashSeeds,
} from '@bworlds/core';
import { MAX_SIMULTANEOUS_PROCEDURAL_SOUND_VOICES } from './audio-budget.ts';
import type { AudioCategory } from './audio-categories.ts';
import { resolveSoundEffectCategory } from './audio-categories.ts';
import type { NearbyAmbientKind } from './nearby-ambient.ts';
import {
  type ProceduralAmplitudeEnvelope,
  type ProceduralSoundDelay,
  createProceduralSoundEffectGenerator,
  type ProceduralSoundDistortion,
  type ProceduralNoiseColor,
  type ProceduralSoundReverb,
  type ProceduralSoundTremolo,
  type ProceduralSoundVibrato,
  type ProceduralSoundFrequencyModulation,
  type ProceduralSoundRingModulation,
  type ProceduralSoundEffectLayer,
  type ProceduralSoundFilter,
  type ProceduralPitchEnvelope,
  type ProceduralSoundEffect,
  type SoundEffectKind,
  type SoundPosition,
  type SoundWaveform,
} from './procedural-sound-effect-generator.ts';
import { createProceduralNoiseSamples } from './procedural-sound-noise.ts';

type ViewModeLike = '2d' | '3d' | 'text';
type SurfaceKind = string;
type AmbientSoundKind = NearbyAmbientKind;
const MAX_CLOSE_SOUND_GAIN = 0.82;
export type CombatSoundStyle =
  | 'slash'
  | 'pierce'
  | 'blunt'
  | 'bow'
  | 'fire'
  | 'frost'
  | 'arcane'
  | 'healing';
type SurfaceAudioFamily =
  | 'default'
  | 'road'
  | 'bridge'
  | 'dock'
  | 'shore'
  | 'interior'
  | 'town'
  | 'cave';

export type { ProceduralSoundEffect } from './procedural-sound-effect-generator.ts';

export type SoundEffectSink = {
  resume?(): void;
  play(effect: ProceduralSoundEffect): void;
  stopAll?(): void;
  getActiveSourceCount?(): number;
};

type SoundEffectSinkOptions = {
  getCategoryVolume?: (category: AudioCategory) => number;
};

type SoundEffectVolumeBounds = {
  min: number;
  max: number;
};

export type SoundEffectController = {
  resume(): void;
  stopAll(): void;
  getActiveSourceCount(): number;
  getRecentCombatIntensity(nowMs: number): number;
  getRecentPrioritySoundIntensity(nowMs: number): number;
  triggerProgression(options: {
    nowMs: number;
    level?: number;
    emitter?: SoundPosition;
    listener?: SoundPosition;
  }): void;
  triggerInteraction(options: {
    nowMs: number;
    event: 'open' | 'close';
    tileKind?: SurfaceKind;
    emitter?: SoundPosition;
    listener?: SoundPosition;
  }): void;
  triggerJump(options: {
    nowMs: number;
    tileKind?: SurfaceKind;
    emitter?: SoundPosition;
    listener?: SoundPosition;
  }): void;
  triggerBlockedMovement(options: {
    nowMs: number;
    tileKind?: SurfaceKind;
    emitter?: SoundPosition;
    listener?: SoundPosition;
  }): void;
  triggerCombat(options: {
    nowMs: number;
    style: CombatSoundStyle;
    emitter?: SoundPosition;
    listener?: SoundPosition;
  }): void;
  update(options: {
    nowMs: number;
    walking: boolean;
    isJumping: boolean;
    viewMode: ViewModeLike;
    ambianceEnabled?: boolean;
    tileKind?: SurfaceKind;
    weatherKind?: string;
    weatherIntensity?: number;
    windStrength?: number;
    nearbyTrain?: {
      progress?: number;
      emitter?: SoundPosition;
      listener?: SoundPosition;
    } | null;
    nearbyPaddleBoat?: {
      progress?: number;
      whistlePhase?: 'arrival' | 'departure';
      emitter?: SoundPosition;
      listener?: SoundPosition;
    } | null;
    nearbyAmbient?: {
      kind: AmbientSoundKind;
      intensity?: number;
      emitter?: SoundPosition;
      listener?: SoundPosition;
    } | null;
    emitter?: SoundPosition;
    listener?: SoundPosition;
  }): void;
};

type SurfaceAudioProfile = {
  cadenceMs: number;
  footstepFrequency: number;
  landingFrequency: number;
  footstepVolume: number;
  landingVolume: number;
  waveform: SoundWaveform;
};

const SURFACE_AUDIO_PROFILES: Record<SurfaceAudioFamily, SurfaceAudioProfile> =
  {
    default: {
      cadenceMs: 310,
      footstepFrequency: 122,
      landingFrequency: 92,
      footstepVolume: 0.045,
      landingVolume: 0.065,
      waveform: 'triangle',
    },
    road: {
      cadenceMs: 265,
      footstepFrequency: 168,
      landingFrequency: 122,
      footstepVolume: 0.038,
      landingVolume: 0.056,
      waveform: 'square',
    },
    bridge: {
      cadenceMs: 290,
      footstepFrequency: 188,
      landingFrequency: 132,
      footstepVolume: 0.042,
      landingVolume: 0.06,
      waveform: 'square',
    },
    dock: {
      cadenceMs: 300,
      footstepFrequency: 176,
      landingFrequency: 126,
      footstepVolume: 0.04,
      landingVolume: 0.058,
      waveform: 'square',
    },
    shore: {
      cadenceMs: 305,
      footstepFrequency: 132,
      landingFrequency: 98,
      footstepVolume: 0.034,
      landingVolume: 0.05,
      waveform: 'triangle',
    },
    interior: {
      cadenceMs: 285,
      footstepFrequency: 146,
      landingFrequency: 104,
      footstepVolume: 0.032,
      landingVolume: 0.048,
      waveform: 'square',
    },
    town: {
      cadenceMs: 275,
      footstepFrequency: 156,
      landingFrequency: 112,
      footstepVolume: 0.036,
      landingVolume: 0.052,
      waveform: 'square',
    },
    cave: {
      cadenceMs: 330,
      footstepFrequency: 108,
      landingFrequency: 82,
      footstepVolume: 0.048,
      landingVolume: 0.072,
      waveform: 'triangle',
    },
  };

const SURFACE_AUDIO_FAMILY_SEED_PARTS: Record<SurfaceAudioFamily, number> = {
  default: 0,
  road: 1,
  bridge: 2,
  dock: 3,
  shore: 4,
  interior: 5,
  town: 6,
  cave: 7,
};

const SOUND_EFFECT_SEEDS = registerHashSeeds([
  'footstep',
  'jump',
  'landing',
  'blocked',
  'open',
  'close',
  'wind',
  'ocean',
  'river-ambience',
  'forest-ambience',
  'plains-ambience',
  'mountain-ambience',
  'cave-ambience',
  'settlement-ambience',
  'ruins-ambience',
  'advancement',
  'train-engine',
  'train-whistle',
  'paddle-calliope',
  'steam-whistle',
  'combat-weapon',
  'combat-magic',
] as const);

const proceduralSoundEffectGenerator = createProceduralSoundEffectGenerator();

export function getSurfaceAudioFamily(
  tileKind: SurfaceKind | undefined
): SurfaceAudioFamily {
  if (!tileKind) {
    return 'default';
  }
  if (tileKind === 'cave-floor' || tileKind === 'cave-mushrooms') {
    return 'cave';
  }
  if (
    tileKind === 'floor' ||
    tileKind === 'shop' ||
    tileKind === 'stairsUp' ||
    tileKind === 'stairsDown'
  ) {
    return 'interior';
  }
  if (tileKind === 'shore') {
    return 'shore';
  }
  if (tileKind === 'town') {
    return 'town';
  }
  if (tileKind === 'road') {
    return 'road';
  }
  if (tileKind === 'bridge') {
    return 'bridge';
  }
  if (tileKind === 'dock') {
    return 'dock';
  }
  return 'default';
}

export function getSurfaceAudioProfile(
  tileKind: SurfaceKind | undefined
): SurfaceAudioProfile {
  return SURFACE_AUDIO_PROFILES[getSurfaceAudioFamily(tileKind)];
}

function createProceduralEffectSeed(
  kind: SoundEffectKind,
  nowMs: number,
  tileKind: SurfaceKind | undefined,
  variationIndex: number
): number {
  let seed = SOUND_EFFECT_SEEDS[kind];
  seed = appendHashSeedPart(
    seed,
    SURFACE_AUDIO_FAMILY_SEED_PARTS[getSurfaceAudioFamily(tileKind)]
  );
  seed = appendHashSeedPart(seed, Math.round(nowMs));
  return appendHashSeedPart(seed, variationIndex);
}

function resolveProceduralSoundRecipe(
  kind: SoundEffectKind,
  tileKind: SurfaceKind | undefined,
  profile: SurfaceAudioProfile,
  variantOffset: number
) {
  return {
    id: kind,
    baseFrequency: resolveBaseSoundEffectFrequency(
      kind,
      tileKind,
      profile,
      variantOffset
    ),
    baseDurationMs: resolveBaseSoundEffectDurationMs(kind),
    baseVolume: resolveBaseSoundEffectVolume(kind, profile),
    waveform: resolveBaseSoundEffectWaveform(kind, tileKind, profile),
    noiseColor: resolveBaseSoundEffectNoiseColor(kind),
    envelope: resolveProceduralSoundEnvelope(kind),
    pitchEnvelope: resolveProceduralSoundPitchEnvelope(kind),
    filters: resolveProceduralSoundFilters(kind),
    distortion: resolveProceduralSoundDistortion(kind),
    delay: resolveProceduralSoundDelay(kind),
    reverb: resolveProceduralSoundReverb(kind),
    tremolo: resolveProceduralSoundTremolo(kind),
    vibrato: resolveProceduralSoundVibrato(kind),
    frequencyModulation: resolveProceduralSoundFrequencyModulation(kind),
    ringModulation: resolveProceduralSoundRingModulation(kind),
    sweeps: resolveProceduralSoundSweeps(kind),
    layers: resolveProceduralSoundLayers(kind),
    ...resolveProceduralSoundVariation(kind),
  };
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
        waveform: 'sine' as const,
        rateVariation: 0.08,
        depthVariation: 0.06,
      };
    case 'steam-whistle':
      return {
        rateHz: 5.4,
        depth: 0.18,
        waveform: 'triangle' as const,
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
        waveform: 'sine' as const,
        rateVariation: 0.04,
        depthVariation: 0.08,
      };
    case 'combat-magic':
      return {
        rateHz: 6.8,
        depthHz: 10,
        waveform: 'triangle' as const,
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
        waveform: 'sine' as const,
        rateVariation: 0.03,
        depthVariation: 0.08,
      };
    case 'combat-magic':
      return {
        modulatorFrequencyHz: 168,
        depthHz: 42,
        waveform: 'triangle' as const,
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
        waveform: 'square' as const,
        rateVariation: 0.05,
        depthVariation: 0.08,
      };
    case 'train-engine':
      return {
        modulatorFrequencyHz: 48,
        depth: 0.42,
        waveform: 'triangle' as const,
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

function resolveProceduralSoundLayers(kind: SoundEffectKind) {
  switch (kind) {
    case 'wind':
      return [
        {
          id: 'wind-noise-bed',
          waveform: 'triangle' as const,
          noiseColor: 'brown' as const,
          frequencyMultiplier: 0.72,
          durationMultiplier: 1,
          volumeMultiplier: 0.58,
          frequencyVariation: 0.02,
          durationVariation: 0.12,
          volumeVariation: 0.06,
          variationDepth: 1,
        },
      ] as const;
    case 'forest-ambience':
      return [
        {
          id: 'forest-noise-bed',
          waveform: 'triangle' as const,
          noiseColor: 'pink' as const,
          frequencyMultiplier: 0.8,
          durationMultiplier: 1,
          volumeMultiplier: 0.5,
          frequencyVariation: 0.02,
          durationVariation: 0.12,
          volumeVariation: 0.08,
          variationDepth: 1,
        },
      ] as const;
    default:
      return undefined;
  }
}

function resolveBaseSoundEffectFrequency(
  kind: SoundEffectKind,
  tileKind: SurfaceKind | undefined,
  profile: SurfaceAudioProfile,
  variantOffset: number
): number {
  switch (kind) {
    case 'jump':
      return profile.footstepFrequency + 72;
    case 'wind':
      return 190 + (tileKind === 'forest' ? 16 : 0) + variantOffset * 0.4;
    case 'ocean':
      return resolveAmbientSoundFrequency('ocean', undefined);
    case 'river-ambience':
      return resolveAmbientSoundFrequency('river', undefined);
    case 'forest-ambience':
      return resolveAmbientSoundFrequency('forest', undefined);
    case 'plains-ambience':
      return resolveAmbientSoundFrequency('plains', undefined);
    case 'mountain-ambience':
      return resolveAmbientSoundFrequency('mountain', undefined);
    case 'cave-ambience':
      return resolveAmbientSoundFrequency('cave', undefined);
    case 'settlement-ambience':
      return resolveAmbientSoundFrequency('settlement', undefined);
    case 'ruins-ambience':
      return resolveAmbientSoundFrequency('ruins', undefined);
    case 'advancement':
      return resolveAdvancementFrequency();
    case 'train-engine':
      return 74 + variantOffset * 0.35;
    case 'train-whistle':
      return 356 + variantOffset * 0.6;
    case 'paddle-calliope':
      return resolvePaddleBoatCalliopeFrequency(undefined);
    case 'steam-whistle':
      return resolveSteamWhistleFrequency();
    case 'combat-weapon':
      return 148 + variantOffset * 0.5;
    case 'combat-magic':
      return 244 + variantOffset * 0.5;
    case 'open':
      return resolveInteractionFrequency(
        'open',
        tileKind,
        profile,
        variantOffset
      );
    case 'close':
      return resolveInteractionFrequency(
        'close',
        tileKind,
        profile,
        variantOffset
      );
    case 'blocked':
      return Math.max(58, profile.landingFrequency - 18 + variantOffset);
    case 'landing':
      return profile.landingFrequency + variantOffset;
    case 'footstep':
    default:
      return profile.footstepFrequency + variantOffset;
  }
}

function resolveBaseSoundEffectDurationMs(kind: SoundEffectKind): number {
  switch (kind) {
    case 'jump':
      return 140;
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
  profile: SurfaceAudioProfile
): number {
  switch (kind) {
    case 'jump':
      return profile.footstepVolume * 1.2;
    case 'wind':
      return 0.018;
    case 'ocean':
      return 0.026;
    case 'river-ambience':
      return 0.022;
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
      return profile.landingVolume;
    case 'footstep':
    default:
      return profile.footstepVolume;
  }
}

function resolveBaseSoundEffectWaveform(
  kind: SoundEffectKind,
  tileKind: SurfaceKind | undefined,
  profile: SurfaceAudioProfile
): SoundWaveform | readonly SoundWaveform[] {
  switch (kind) {
    case 'blocked':
      return 'sawtooth';
    case 'wind':
      return 'triangle';
    case 'ocean':
      return 'sine';
    case 'river-ambience':
      return ['triangle', 'sine'];
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
      return profile.waveform;
  }
}

function resolveBaseSoundEffectNoiseColor(
  kind: SoundEffectKind
): ProceduralNoiseColor | readonly ProceduralNoiseColor[] | undefined {
  switch (kind) {
    case 'wind':
      return 'brown';
    case 'ocean':
      return 'brown';
    case 'river-ambience':
      return ['white', 'pink'];
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
      return undefined;
  }
}

function resolveProceduralSoundVariation(kind: SoundEffectKind): {
  frequencyVariation?: number;
  durationVariation?: number;
  volumeVariation?: number;
  variationDepth?: number;
} {
  switch (kind) {
    case 'footstep':
    case 'jump':
    case 'landing':
    case 'blocked':
      return {
        frequencyVariation: 0.02,
        durationVariation: 0.08,
        volumeVariation: 0.06,
        variationDepth: 1,
      };
    case 'open':
    case 'close':
      return {
        frequencyVariation: 0.015,
        durationVariation: 0.04,
        volumeVariation: 0.04,
        variationDepth: 0.8,
      };
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
        frequencyVariation: 0.03,
        durationVariation: 0.14,
        volumeVariation: 0.08,
        variationDepth: 1,
      };
    case 'train-engine':
    case 'train-whistle':
    case 'paddle-calliope':
    case 'steam-whistle':
      return {
        frequencyVariation: 0.015,
        durationVariation: 0.05,
        volumeVariation: 0.04,
        variationDepth: 0.75,
      };
    default:
      return {
        variationDepth: 0,
      };
  }
}

export function getSoundSpatialMix(
  emitter?: SoundPosition,
  listener?: SoundPosition
): { gainMultiplier: number; pan: number } {
  if (!emitter || !listener) {
    return { gainMultiplier: 1, pan: 0 };
  }
  const deltaX = emitter.x - listener.x;
  const deltaY = emitter.y - listener.y;
  const distance = Math.hypot(deltaX, deltaY);
  return {
    gainMultiplier: Math.min(MAX_CLOSE_SOUND_GAIN, 1 / (1 + distance * 0.85)),
    pan: clampValue(deltaX / 2.8, -1, 1),
  };
}

export function createSoundEffectController(
  sink: SoundEffectSink
): SoundEffectController {
  let lastFootstepAtMs = -Infinity;
  let lastJumpAtMs = -Infinity;
  let lastBlockedAtMs = -Infinity;
  let lastCombatAtMs = -Infinity;
  let lastPrioritySoundAtMs = -Infinity;
  let lastPrioritySoundStrength = 0;
  let lastCombatSignature = '';
  let lastInteractionAtMs = -Infinity;
  let lastWindAtMs = -Infinity;
  let lastProgressionAtMs = -Infinity;
  let lastOceanAtMs = -Infinity;
  let lastTrainEngineAtMs = -Infinity;
  let lastTrainWhistleAtMs = -Infinity;
  let lastPaddleCalliopeAtMs = -Infinity;
  let lastSteamWhistleAtMs = -Infinity;
  let lastSteamWhistleSignature = '';
  let lastAmbientSignature = '';
  let previousJumping = false;
  let footstepVariant = 0;

  function createProceduralEffect(
    kind: SoundEffectKind,
    nowMs: number,
    tileKind?: SurfaceKind,
    emitter?: SoundPosition,
    listener?: SoundPosition
  ): ProceduralSoundEffect {
    const profile = getSurfaceAudioProfile(tileKind);
    const variationIndex = footstepVariant;
    const variantOffset = variationIndex % 2 === 0 ? -8 : 6;
    footstepVariant += 1;
    return proceduralSoundEffectGenerator.generate({
      kind,
      nowMs,
      seed: createProceduralEffectSeed(kind, nowMs, tileKind, variationIndex),
      recipe: resolveProceduralSoundRecipe(
        kind,
        tileKind,
        profile,
        variantOffset
      ),
      emitter,
      listener,
    });
  }

  function play(
    kind: SoundEffectKind,
    nowMs: number,
    tileKind?: SurfaceKind,
    emitter?: SoundPosition,
    listener?: SoundPosition,
    volumeMultiplier = 1
  ) {
    const effect = createProceduralEffect(
      kind,
      nowMs,
      tileKind,
      emitter,
      listener
    );
    sink.play({
      ...effect,
      volume: effect.volume * volumeMultiplier,
    });
  }

  return {
    resume() {
      sink.resume?.();
    },
    stopAll() {
      sink.stopAll?.();
    },
    getActiveSourceCount() {
      return sink.getActiveSourceCount?.() ?? 0;
    },
    getRecentCombatIntensity(nowMs) {
      const elapsedMs = nowMs - lastCombatAtMs;
      if (!Number.isFinite(elapsedMs) || elapsedMs >= 4000) {
        return 0;
      }

      return clampValue(1 - elapsedMs / 4000, 0, 1);
    },
    getRecentPrioritySoundIntensity(nowMs) {
      const elapsedMs = nowMs - lastPrioritySoundAtMs;
      if (!Number.isFinite(elapsedMs) || elapsedMs >= 2200) {
        return 0;
      }

      return clampValue(
        lastPrioritySoundStrength * (1 - elapsedMs / 2200),
        0,
        1
      );
    },
    triggerProgression({ nowMs, level, emitter, listener }) {
      if (nowMs - lastProgressionAtMs < 180) {
        return;
      }
      lastProgressionAtMs = nowMs;
      lastPrioritySoundAtMs = nowMs;
      lastPrioritySoundStrength = 0.9;
      sink.play({
        kind: 'advancement',
        nowMs,
        frequency: resolveAdvancementFrequency(level),
        durationMs: 260,
        volume: 0.052,
        waveform: 'sine',
        emitter,
        listener,
      });
    },
    triggerInteraction({ nowMs, event, tileKind, emitter, listener }) {
      if (nowMs - lastInteractionAtMs < 90) {
        return;
      }
      lastInteractionAtMs = nowMs;
      lastPrioritySoundAtMs = nowMs;
      lastPrioritySoundStrength = event === 'open' ? 0.46 : 0.42;
      play(event, nowMs, tileKind, emitter, listener);
    },
    triggerJump({ nowMs, tileKind, emitter, listener }) {
      if (nowMs - lastJumpAtMs < 120) {
        return;
      }
      lastJumpAtMs = nowMs;
      lastPrioritySoundAtMs = nowMs;
      lastPrioritySoundStrength = 0.36;
      play('jump', nowMs, tileKind, emitter, listener);
    },
    triggerBlockedMovement({ nowMs, tileKind, emitter, listener }) {
      if (!shouldPlayBlockedMovementSound(tileKind)) {
        return;
      }
      if (nowMs - lastBlockedAtMs < 180) {
        return;
      }
      lastBlockedAtMs = nowMs;
      lastPrioritySoundAtMs = nowMs;
      lastPrioritySoundStrength = 0.52;
      play('blocked', nowMs, tileKind, emitter, listener);
    },
    triggerCombat({ nowMs, style, emitter, listener }) {
      const signature = `${style}:${Math.round(emitter?.x ?? 0)}:${Math.round(emitter?.y ?? 0)}`;
      if (
        signature === lastCombatSignature &&
        nowMs - lastCombatAtMs < getCombatSoundCadenceMs(style)
      ) {
        return;
      }
      lastCombatAtMs = nowMs;
      lastPrioritySoundAtMs = nowMs;
      lastPrioritySoundStrength = style === 'healing' ? 0.45 : 0.82;
      lastCombatSignature = signature;
      const kind = isMagicCombatStyle(style) ? 'combat-magic' : 'combat-weapon';
      sink.play({
        kind,
        nowMs,
        frequency: resolveCombatSoundFrequency(style),
        durationMs: getCombatSoundDurationMs(style),
        volume: getCombatSoundVolume(style),
        waveform: resolveCombatSoundWaveform(style),
        emitter,
        listener,
      });
    },
    update({
      nowMs,
      walking,
      isJumping,
      viewMode,
      ambianceEnabled,
      tileKind,
      weatherKind,
      weatherIntensity,
      windStrength,
      nearbyTrain,
      nearbyPaddleBoat,
      nearbyAmbient,
      emitter,
      listener,
    }) {
      if (viewMode !== '3d') {
        previousJumping = isJumping;
        return;
      }

      if (ambianceEnabled !== false) {
        const ambienceDuckingGain = resolveAmbienceDuckingGain(
          this.getRecentPrioritySoundIntensity(nowMs)
        );
        if (
          nearbyTrain &&
          nearbyTrain.emitter &&
          nowMs - lastTrainEngineAtMs >= getTrainEngineCadenceMs()
        ) {
          lastTrainEngineAtMs = nowMs;
          play(
            'train-engine',
            nowMs,
            'rail',
            nearbyTrain.emitter,
            nearbyTrain.listener ?? listener,
            ambienceDuckingGain
          );
        }
        if (
          nearbyTrain &&
          nearbyTrain.emitter &&
          shouldPlayTrainWhistle(nearbyTrain.progress) &&
          nowMs - lastTrainWhistleAtMs >= 9000
        ) {
          lastTrainWhistleAtMs = nowMs;
          play(
            'train-whistle',
            nowMs,
            'rail',
            nearbyTrain.emitter,
            nearbyTrain.listener ?? listener
          );
        }
        if (
          nearbyPaddleBoat &&
          nearbyPaddleBoat.emitter &&
          nowMs - lastPaddleCalliopeAtMs >= getPaddleBoatCalliopeCadenceMs()
        ) {
          lastPaddleCalliopeAtMs = nowMs;
          sink.play({
            kind: 'paddle-calliope',
            nowMs,
            frequency: resolvePaddleBoatCalliopeFrequency(
              nearbyPaddleBoat.progress
            ),
            durationMs: 1180,
            volume: 0.034 * ambienceDuckingGain,
            waveform: 'triangle',
            emitter: nearbyPaddleBoat.emitter,
            listener: nearbyPaddleBoat.listener ?? listener,
          });
        }
        if (
          nearbyPaddleBoat?.emitter &&
          shouldPlaySteamWhistle(nearbyPaddleBoat.whistlePhase)
        ) {
          const whistleSignature = `${nearbyPaddleBoat.emitter.x}:${nearbyPaddleBoat.emitter.y}:${nearbyPaddleBoat.whistlePhase}`;
          if (
            whistleSignature !== lastSteamWhistleSignature &&
            nowMs - lastSteamWhistleAtMs >= 1200
          ) {
            lastSteamWhistleSignature = whistleSignature;
            lastSteamWhistleAtMs = nowMs;
            sink.play({
              kind: 'steam-whistle',
              nowMs,
              frequency: resolveSteamWhistleFrequency(
                nearbyPaddleBoat.whistlePhase
              ),
              durationMs: 1050,
              volume: 0.048,
              waveform: 'square',
              emitter: nearbyPaddleBoat.emitter,
              listener: nearbyPaddleBoat.listener ?? listener,
            });
          }
        } else {
          lastSteamWhistleSignature = '';
        }

        const ambientSignature = nearbyAmbient?.emitter
          ? `${nearbyAmbient.kind}:${Math.round(nearbyAmbient.emitter.x)}:${Math.round(nearbyAmbient.emitter.y)}`
          : '';
        const ambientChanged =
          ambientSignature.length > 0 &&
          ambientSignature !== lastAmbientSignature;
        const ambientReady = nearbyAmbient?.emitter
          ? ambientChanged
            ? nowMs - lastOceanAtMs >= 900
            : nowMs - lastOceanAtMs >=
              getAmbientSoundCadenceMs(
                nearbyAmbient.kind,
                nearbyAmbient.intensity ?? 0.5
              )
          : false;

        if (nearbyAmbient?.emitter && ambientReady) {
          lastOceanAtMs = nowMs;
          lastAmbientSignature = ambientSignature;
          sink.play({
            kind: resolveAmbientEffectKind(nearbyAmbient.kind),
            nowMs,
            frequency: resolveAmbientSoundFrequency(
              nearbyAmbient.kind,
              nearbyAmbient.intensity
            ),
            durationMs: 1680,
            volume:
              getAmbientSoundVolume(
                nearbyAmbient.kind,
                nearbyAmbient.intensity
              ) * ambienceDuckingGain,
            waveform: resolveAmbientSoundWaveform(nearbyAmbient.kind),
            emitter: nearbyAmbient.emitter,
            listener: nearbyAmbient.listener ?? listener,
          });
        } else if (!nearbyAmbient?.emitter) {
          lastAmbientSignature = '';
        }

        if (
          shouldPlayForestWindSound(tileKind, weatherKind, windStrength) &&
          nowMs - lastWindAtMs >=
            getForestWindCadenceMs(windStrength ?? weatherIntensity ?? 0)
        ) {
          lastWindAtMs = nowMs;
          play('wind', nowMs, tileKind, emitter, listener, ambienceDuckingGain);
        }
      } else {
        lastSteamWhistleSignature = '';
      }

      if (!previousJumping && isJumping) {
        previousJumping = true;
        return;
      }

      if (previousJumping && !isJumping) {
        play('landing', nowMs, tileKind, emitter, listener);
      }
      previousJumping = isJumping;

      if (!walking || isJumping) {
        return;
      }

      const profile = getSurfaceAudioProfile(tileKind);
      if (nowMs - lastFootstepAtMs < profile.cadenceMs) {
        return;
      }
      lastFootstepAtMs = nowMs;
      play('footstep', nowMs, tileKind, emitter, listener);
    },
  };
}

export function shouldPlayBlockedMovementSound(
  tileKind: SurfaceKind | undefined
): boolean {
  return tileKind === 'forest';
}

export function shouldPlayForestWindSound(
  tileKind: SurfaceKind | undefined,
  weatherKind?: string,
  windStrength?: number
): boolean {
  return (
    tileKind === 'forest' &&
    (weatherKind === 'wind' || (windStrength ?? 0) >= 0.3)
  );
}

export function getForestWindCadenceMs(windStrength: number): number {
  return Math.round(clampValue(2600 - windStrength * 1200, 1200, 2600));
}

export function resolveAmbienceDuckingGain(
  prioritySoundIntensity: number
): number {
  const clamped = clampValue(prioritySoundIntensity, 0, 1);
  return 1 - clamped * 0.55;
}

export function getAmbientSoundCadenceMs(
  kind: AmbientSoundKind,
  intensity: number
): number {
  const clamped = clampValue(intensity, 0, 1);
  switch (kind) {
    case 'river':
      return Math.round(clampValue(3000 - clamped * 1100, 1500, 3000));
    case 'forest':
      return Math.round(clampValue(2800 - clamped * 900, 1400, 2800));
    case 'plains':
      return Math.round(clampValue(3400 - clamped * 1000, 1800, 3400));
    case 'mountain':
      return Math.round(clampValue(3600 - clamped * 900, 1800, 3600));
    case 'cave':
      return Math.round(clampValue(3600 - clamped * 900, 1800, 3600));
    case 'settlement':
      return Math.round(clampValue(4200 - clamped * 700, 2200, 4200));
    case 'ruins':
      return Math.round(clampValue(3900 - clamped * 800, 2000, 3900));
    case 'ocean':
    default:
      return Math.round(clampValue(3200 - clamped * 1400, 1400, 3200));
  }
}

export function getAmbientSoundVolume(
  kind: AmbientSoundKind,
  intensity: number | undefined
): number {
  const clamped = clampValue(intensity ?? 0.5, 0, 1);
  switch (kind) {
    case 'river':
      return 0.015 + clamped * 0.016;
    case 'forest':
      return 0.014 + clamped * 0.014;
    case 'plains':
      return 0.012 + clamped * 0.01;
    case 'mountain':
      return 0.014 + clamped * 0.016;
    case 'cave':
      return 0.018 + clamped * 0.018;
    case 'settlement':
      return 0.012 + clamped * 0.012;
    case 'ruins':
      return 0.014 + clamped * 0.014;
    case 'ocean':
    default:
      return 0.016 + clamped * 0.02;
  }
}

export function resolveAmbientSoundFrequency(
  kind: AmbientSoundKind,
  intensity: number | undefined
): number {
  const clamped = clampValue(intensity ?? 0.5, 0, 1);
  switch (kind) {
    case 'river':
      return 108 + clamped * 18;
    case 'forest':
      return 170 + clamped * 22;
    case 'plains':
      return 210 + clamped * 18;
    case 'mountain':
      return 126 + clamped * 18;
    case 'cave':
      return 118 + clamped * 18;
    case 'settlement':
      return 244 + clamped * 28;
    case 'ruins':
      return 136 + clamped * 16;
    case 'ocean':
    default:
      return 88 + clamped * 18;
  }
}

export function resolveAmbientSoundWaveform(
  kind: AmbientSoundKind
): SoundWaveform {
  switch (kind) {
    case 'river':
      return 'triangle';
    case 'forest':
      return 'triangle';
    case 'plains':
      return 'sine';
    case 'mountain':
      return 'sawtooth';
    case 'cave':
      return 'sine';
    case 'settlement':
      return 'square';
    case 'ruins':
      return 'triangle';
    case 'ocean':
    default:
      return 'sine';
  }
}

function resolveAmbientEffectKind(kind: AmbientSoundKind): SoundEffectKind {
  switch (kind) {
    case 'river':
      return 'river-ambience';
    case 'forest':
      return 'forest-ambience';
    case 'plains':
      return 'plains-ambience';
    case 'mountain':
      return 'mountain-ambience';
    case 'cave':
      return 'cave-ambience';
    case 'settlement':
      return 'settlement-ambience';
    case 'ruins':
      return 'ruins-ambience';
    case 'ocean':
    default:
      return 'ocean';
  }
}

export function getTrainEngineCadenceMs(): number {
  return 720;
}

export function shouldPlayTrainWhistle(progress: number | undefined): boolean {
  if (typeof progress !== 'number') {
    return false;
  }
  return progress <= 0.08 || progress >= 0.92;
}

export function getPaddleBoatCalliopeCadenceMs(): number {
  return 2600;
}

export function resolvePaddleBoatCalliopeFrequency(
  progress: number | undefined
): number {
  const melody = [392, 440, 523.25, 587.33, 659.25, 587.33, 523.25, 440];
  if (typeof progress !== 'number') {
    return melody[0] ?? 392;
  }
  const normalized = ((progress % 1) + 1) % 1;
  const index = Math.min(
    melody.length - 1,
    Math.floor(normalized * melody.length)
  );
  return melody[index] ?? melody[0] ?? 392;
}

export function shouldPlaySteamWhistle(
  whistlePhase: 'arrival' | 'departure' | undefined
): boolean {
  return whistlePhase === 'arrival' || whistlePhase === 'departure';
}

export function resolveSteamWhistleFrequency(
  whistlePhase?: 'arrival' | 'departure'
): number {
  return whistlePhase === 'arrival' ? 294 : 370;
}

export function isMagicCombatStyle(style: CombatSoundStyle): boolean {
  return (
    style === 'fire' ||
    style === 'frost' ||
    style === 'arcane' ||
    style === 'healing'
  );
}

export function getCombatSoundCadenceMs(style: CombatSoundStyle): number {
  return isMagicCombatStyle(style) ? 140 : 90;
}

export function getCombatSoundDurationMs(style: CombatSoundStyle): number {
  switch (style) {
    case 'slash':
      return 120;
    case 'pierce':
      return 105;
    case 'blunt':
      return 180;
    case 'bow':
      return 150;
    case 'fire':
      return 340;
    case 'frost':
      return 300;
    case 'arcane':
      return 360;
    case 'healing':
      return 320;
  }
}

export function getCombatSoundVolume(style: CombatSoundStyle): number {
  switch (style) {
    case 'slash':
    case 'pierce':
      return 0.054;
    case 'blunt':
      return 0.062;
    case 'bow':
      return 0.048;
    case 'fire':
      return 0.056;
    case 'frost':
      return 0.05;
    case 'arcane':
      return 0.052;
    case 'healing':
      return 0.044;
  }
}

export function resolveCombatSoundFrequency(style: CombatSoundStyle): number {
  switch (style) {
    case 'slash':
      return 210;
    case 'pierce':
      return 286;
    case 'blunt':
      return 116;
    case 'bow':
      return 178;
    case 'fire':
      return 322;
    case 'frost':
      return 196;
    case 'arcane':
      return 262;
    case 'healing':
      return 238;
  }
}

export function resolveCombatSoundWaveform(
  style: CombatSoundStyle
): SoundWaveform {
  switch (style) {
    case 'slash':
      return 'sawtooth';
    case 'pierce':
    case 'bow':
      return 'square';
    case 'blunt':
      return 'triangle';
    case 'fire':
      return 'sawtooth';
    case 'frost':
      return 'triangle';
    case 'arcane':
      return 'sine';
    case 'healing':
      return 'sine';
  }
}

function resolveInteractionFrequency(
  event: 'open' | 'close',
  tileKind: SurfaceKind | undefined,
  profile: SurfaceAudioProfile,
  variantOffset: number
): number {
  const family = getSurfaceAudioFamily(tileKind);
  const base =
    tileKind === 'door' || family === 'interior'
      ? 212
      : family === 'cave'
        ? 134
        : family === 'town'
          ? 184
          : 166;
  return event === 'open'
    ? base + 18 + variantOffset * 0.5
    : base - 14 + variantOffset * 0.35 + profile.landingFrequency * 0.08;
}

function resolveInteractionWaveform(
  tileKind: SurfaceKind | undefined,
  fallback: SoundWaveform
): SoundWaveform {
  const family = getSurfaceAudioFamily(tileKind);
  if (tileKind === 'door' || family === 'interior') {
    return 'square';
  }
  if (family === 'cave') {
    return 'triangle';
  }
  return fallback;
}

function resolveAdvancementFrequency(level?: number): number {
  const normalizedLevel = clampValue(Math.round(level ?? 1), 1, 99);
  return 300 + Math.min(18, normalizedLevel - 1) * 12;
}

type AudioContextCtor = new () => AudioContext;
type AudioBufferSourceNodeLike = AudioBufferSourceNode & {
  buffer: AudioBuffer | null;
};
type ScheduledSoundSourceNode = OscillatorNode | AudioBufferSourceNodeLike;
type WaveShaperNodeLike = WaveShaperNode & {
  oversample?: OverSampleType;
};
type DelayNodeLike = DelayNode;
type ConvolverNodeLike = ConvolverNode;
type ActiveSoundFilter = {
  node: BiquadFilterNode;
  config: ProceduralSoundFilter;
};
type ActiveSoundDistortion = {
  preGain: GainNode;
  waveShaper: WaveShaperNodeLike;
  postGain: GainNode;
  config: ProceduralSoundDistortion;
};
type ActiveSoundDelay = {
  delay: DelayNodeLike;
  feedbackGain: GainNode;
  wetGain: GainNode;
  config: ProceduralSoundDelay;
};
type ActiveSoundReverb = {
  preDelay: DelayNodeLike | null;
  convolver: ConvolverNodeLike;
  tone: BiquadFilterNode | null;
  wetGain: GainNode;
  config: ProceduralSoundReverb;
};
type ActiveSoundTremolo = {
  oscillator: OscillatorNode;
  depthGain: GainNode;
  output: GainNode;
  config: ProceduralSoundTremolo;
};
type ActiveSoundVibrato = {
  oscillator: OscillatorNode;
  depthGain: GainNode;
  config: ProceduralSoundVibrato;
};
type ActiveSoundFrequencyModulation = {
  oscillator: OscillatorNode;
  depthGain: GainNode;
  config: ProceduralSoundFrequencyModulation;
};
type ActiveSoundRingModulation = {
  oscillator: OscillatorNode;
  depthGain: GainNode;
  carrierGain: GainNode;
  config: ProceduralSoundRingModulation;
};
type ActiveSoundSource = {
  source: ScheduledSoundSourceNode;
  filters: ActiveSoundFilter[];
  distortion: ActiveSoundDistortion | null;
  delay: ActiveSoundDelay | null;
  reverb: ActiveSoundReverb | null;
  tremolo: ActiveSoundTremolo | null;
  vibrato: ActiveSoundVibrato | null;
  frequencyModulation: ActiveSoundFrequencyModulation | null;
  ringModulation: ActiveSoundRingModulation | null;
  gain: GainNode;
  effect: ProceduralSoundEffect;
};
type ActiveSoundVoice = {
  kind: SoundEffectKind;
  priority: number;
  loudness: number;
  sources: ActiveSoundSource[];
  mixGain: GainNode;
  panner: StereoPannerNode | null;
};

const SOUND_MIX_HEADROOM_LOUDNESS = 0.14;

const MAX_SIMULTANEOUS_SOUND_VOICES_BY_KIND: Partial<
  Record<SoundEffectKind, number>
> = {
  ocean: 1,
  'river-ambience': 1,
  'forest-ambience': 1,
  'plains-ambience': 1,
  'mountain-ambience': 1,
  'cave-ambience': 1,
  'settlement-ambience': 1,
  'ruins-ambience': 1,
  'train-engine': 1,
  'paddle-calliope': 1,
  wind: 1,
  footstep: 2,
};

const AMBIENT_SOUND_VOLUME_BOUNDS: SoundEffectVolumeBounds = {
  min: 0.012,
  max: 0.032,
};

const DEFAULT_PROCEDURAL_SOUND_ENVELOPE: ProceduralAmplitudeEnvelope = {
  attackMs: 4,
  decayMs: 24,
  sustainLevel: 0.4,
  releaseMs: 24,
};

export function createWebAudioSoundEffectSink(
  options: SoundEffectSinkOptions = {}
): SoundEffectSink {
  let audioContext: AudioContext | null = null;
  let activeSourceCount = 0;
  let outputGainNode: GainNode | null = null;
  const activeVoices = new Set<ActiveSoundVoice>();
  const noiseBufferCache = new Map<string, AudioBuffer>();
  const reverbImpulseCache = new Map<string, AudioBuffer>();

  function getAudioContext(): AudioContext | null {
    if (audioContext) {
      return audioContext;
    }
    const globalCtor = globalThis as {
      AudioContext?: AudioContextCtor;
      webkitAudioContext?: AudioContextCtor;
    };
    const ContextCtor =
      globalCtor.AudioContext ?? globalCtor.webkitAudioContext;
    if (!ContextCtor) {
      return null;
    }
    audioContext = new ContextCtor();
    return audioContext;
  }

  function getOutputGainNode(context: AudioContext): GainNode {
    if (outputGainNode) {
      return outputGainNode;
    }
    outputGainNode = context.createGain();
    outputGainNode.gain.setValueAtTime(1, context.currentTime);
    outputGainNode.connect(context.destination);
    return outputGainNode;
  }

  function updateOutputGain(context: AudioContext): void {
    const highestPriority = [...activeVoices].reduce(
      (highest, voice) => Math.max(highest, voice.priority),
      0
    );
    const totalLoudness = [...activeVoices].reduce(
      (sum, voice) =>
        sum +
        voice.loudness *
          resolvePriorityDynamicRangeGain(voice.priority, highestPriority),
      0
    );
    const mixGain = resolveSoundMixSafetyGain(totalLoudness);
    getOutputGainNode(context).gain.setValueAtTime(
      mixGain,
      context.currentTime
    );
    activeVoices.forEach((voice) => {
      voice.mixGain.gain.setValueAtTime(
        resolvePriorityDynamicRangeGain(voice.priority, highestPriority),
        context.currentTime
      );
    });
  }

  function removeVoice(voice: ActiveSoundVoice): void {
    if (!activeVoices.delete(voice)) {
      return;
    }
    activeSourceCount = Math.max(0, activeSourceCount - 1);
    for (const source of voice.sources) {
      source.source.onended = null;
      source.source.disconnect?.();
      for (const filter of source.filters) {
        filter.node.disconnect?.();
      }
      source.distortion?.preGain.disconnect?.();
      source.distortion?.waveShaper.disconnect?.();
      source.distortion?.postGain.disconnect?.();
      source.delay?.delay.disconnect?.();
      source.delay?.feedbackGain.disconnect?.();
      source.delay?.wetGain.disconnect?.();
      source.reverb?.preDelay?.disconnect?.();
      source.reverb?.convolver.disconnect?.();
      source.reverb?.tone?.disconnect?.();
      source.reverb?.wetGain.disconnect?.();
      source.tremolo?.oscillator.disconnect?.();
      source.tremolo?.depthGain.disconnect?.();
      source.tremolo?.output.disconnect?.();
      source.vibrato?.oscillator.disconnect?.();
      source.vibrato?.depthGain.disconnect?.();
      source.frequencyModulation?.oscillator.disconnect?.();
      source.frequencyModulation?.depthGain.disconnect?.();
      source.ringModulation?.oscillator.disconnect?.();
      source.ringModulation?.depthGain.disconnect?.();
      source.ringModulation?.carrierGain.disconnect?.();
      source.gain.disconnect?.();
    }
    voice.mixGain.disconnect?.();
    voice.panner?.disconnect?.();
    if (audioContext) {
      updateOutputGain(audioContext);
    }
  }

  function stopVoice(voice: ActiveSoundVoice, stopAt?: number): void {
    for (const source of voice.sources) {
      try {
        if (typeof stopAt === 'number') {
          source.source.stop(stopAt);
          source.tremolo?.oscillator.stop(stopAt);
          source.vibrato?.oscillator.stop(stopAt);
          source.frequencyModulation?.oscillator.stop(stopAt);
          source.ringModulation?.oscillator.stop(stopAt);
        } else {
          source.source.stop();
          source.tremolo?.oscillator.stop();
          source.vibrato?.oscillator.stop();
          source.frequencyModulation?.oscillator.stop();
          source.ringModulation?.oscillator.stop();
        }
      } catch {
        // Ignore invalid repeated stop calls from already-ending voices.
      }
    }
    removeVoice(voice);
  }

  return {
    resume() {
      const context = getAudioContext();
      if (!context || context.state === 'running') {
        return;
      }
      void context.resume();
    },
    play(effect) {
      const context = getAudioContext();
      if (!context) {
        return;
      }
      const categoryVolume = clampValue(
        options.getCategoryVolume?.(resolveSoundEffectCategory(effect.kind)) ??
          1,
        0,
        1
      );
      if (categoryVolume <= 0) {
        return;
      }
      const outputGain = getOutputGainNode(context);
      const spatialMix = getSoundSpatialMix(effect.emitter, effect.listener);
      const normalizedVolume = normalizeSoundEffectVolume(
        effect.kind,
        effect.volume
      );
      const startAt = context.currentTime;
      const sources = createScheduledSoundSources(
        context,
        effect,
        noiseBufferCache,
        reverbImpulseCache
      );
      const mixGain = context.createGain();
      const panner =
        typeof context.createStereoPanner === 'function'
          ? context.createStereoPanner()
          : null;
      const loudness =
        normalizeSoundEffectVolume(
          effect.kind,
          resolveTotalSoundEffectVolume(effect)
        ) *
        categoryVolume *
        spatialMix.gainMultiplier;
      const priority = resolveSoundEffectPriority(effect.kind);
      const voice: ActiveSoundVoice = {
        kind: effect.kind,
        priority,
        loudness,
        sources,
        mixGain,
        panner,
      };
      const sameKindVoices = [...activeVoices].filter(
        (activeVoice) => activeVoice.kind === effect.kind
      );
      const sameKindLimit =
        MAX_SIMULTANEOUS_SOUND_VOICES_BY_KIND[effect.kind] ?? Infinity;
      if (sameKindVoices.length >= sameKindLimit) {
        const weakestSameKindVoice = sameKindVoices.reduce((weakest, active) =>
          compareActiveSoundVoices(active, weakest) < 0 ? active : weakest
        );
        if (
          compareIncomingSoundToActiveVoice(voice, weakestSameKindVoice) <= 0
        ) {
          return;
        }
        stopVoice(weakestSameKindVoice);
      }
      if (activeVoices.size >= MAX_SIMULTANEOUS_PROCEDURAL_SOUND_VOICES) {
        const weakestActiveVoice = [...activeVoices].reduce(
          (weakest, active) =>
            compareActiveSoundVoices(active, weakest) < 0 ? active : weakest
        );
        if (compareIncomingSoundToActiveVoice(voice, weakestActiveVoice) <= 0) {
          return;
        }
        stopVoice(weakestActiveVoice);
      }
      let finalSource = sources[sources.length - 1]!;
      let finalEndAt = startAt + finalSource.effect.durationMs / 1000;
      for (const source of sources) {
        const sourceStartAt =
          startAt + (source.effect.startOffsetMs ?? 0) / 1000;
        const durationSeconds = source.effect.durationMs / 1000;
        applySoundEffectSourceShape(
          source.source,
          source.effect,
          sourceStartAt,
          durationSeconds
        );
        applySoundEffectFilterEnvelopes(source, sourceStartAt, durationSeconds);
        applyAmplitudeEnvelope(
          source.gain,
          source.effect,
          normalizeSoundEffectVolume(source.effect.kind, source.effect.volume) *
            categoryVolume *
            spatialMix.gainMultiplier,
          sourceStartAt,
          durationSeconds
        );
        connectSoundEffectSourceModulation(source);
        connectSoundEffectSourceChain(source);
        source.gain.connect(mixGain);
        const sourceEndAt = sourceStartAt + durationSeconds;
        if (sourceEndAt >= finalEndAt) {
          finalSource = source;
          finalEndAt = sourceEndAt;
        }
      }
      if (panner) {
        panner.pan.setValueAtTime(spatialMix.pan, startAt);
        mixGain.connect(panner);
        panner.connect(outputGain);
      } else {
        mixGain.connect(outputGain);
      }
      activeVoices.add(voice);
      activeSourceCount += 1;
      updateOutputGain(context);
      finalSource.source.onended = () => {
        removeVoice(voice);
      };
      for (const source of sources) {
        const sourceStartAt =
          startAt + (source.effect.startOffsetMs ?? 0) / 1000;
        const sourceEndAt = sourceStartAt + source.effect.durationMs / 1000;
        source.tremolo?.oscillator.start(sourceStartAt);
        source.tremolo?.oscillator.stop(sourceEndAt);
        source.vibrato?.oscillator.start(sourceStartAt);
        source.vibrato?.oscillator.stop(sourceEndAt);
        source.frequencyModulation?.oscillator.start(sourceStartAt);
        source.frequencyModulation?.oscillator.stop(sourceEndAt);
        source.ringModulation?.oscillator.start(sourceStartAt);
        source.ringModulation?.oscillator.stop(sourceEndAt);
        source.source.start(sourceStartAt);
        source.source.stop(sourceEndAt);
      }
    },
    stopAll() {
      for (const voice of [...activeVoices]) {
        stopVoice(voice, audioContext?.currentTime ?? 0);
      }
      activeSourceCount = 0;
    },
    getActiveSourceCount() {
      return activeSourceCount;
    },
  };
}

function createScheduledSoundSources(
  context: AudioContext,
  effect: ProceduralSoundEffect,
  noiseBufferCache: Map<string, AudioBuffer>,
  reverbImpulseCache: Map<string, AudioBuffer>
): ActiveSoundSource[] {
  const sources = [
    createActiveSoundSource(
      context,
      effect,
      noiseBufferCache,
      reverbImpulseCache
    ),
  ];

  for (const layer of effect.layers ?? []) {
    sources.push(
      createActiveSoundSource(
        context,
        createLayeredSoundEffect(effect, layer),
        noiseBufferCache,
        reverbImpulseCache
      )
    );
  }

  return sources;
}

function createActiveSoundSource(
  context: AudioContext,
  effect: ProceduralSoundEffect,
  noiseBufferCache: Map<string, AudioBuffer>,
  reverbImpulseCache: Map<string, AudioBuffer>
): ActiveSoundSource {
  return {
    source: createScheduledSoundSource(context, effect, noiseBufferCache),
    filters: createSoundEffectFilters(context, effect),
    distortion: createSoundEffectDistortion(context, effect),
    delay: createSoundEffectDelay(context, effect),
    reverb: createSoundEffectReverb(context, effect, reverbImpulseCache),
    tremolo: createSoundEffectTremolo(context, effect),
    vibrato: createSoundEffectVibrato(context, effect),
    frequencyModulation: createSoundEffectFrequencyModulation(context, effect),
    ringModulation: createSoundEffectRingModulation(context, effect),
    gain: context.createGain(),
    effect,
  };
}

function createLayeredSoundEffect(
  effect: ProceduralSoundEffect,
  layer: ProceduralSoundEffectLayer
): ProceduralSoundEffect {
  return {
    ...effect,
    startOffsetMs: layer.startOffsetMs,
    frequency: layer.frequency,
    durationMs: layer.durationMs,
    volume: layer.volume,
    waveform: layer.waveform,
    noiseColor: layer.noiseColor,
    envelope: layer.envelope ?? effect.envelope,
    pitchEnvelope: layer.pitchEnvelope ?? effect.pitchEnvelope,
    filters: layer.filters ?? effect.filters,
    distortion: layer.distortion ?? effect.distortion,
    delay: layer.delay ?? effect.delay,
    reverb: layer.reverb ?? effect.reverb,
    tremolo: layer.tremolo ?? effect.tremolo,
    vibrato: layer.vibrato ?? effect.vibrato,
    frequencyModulation:
      layer.frequencyModulation ?? effect.frequencyModulation,
    ringModulation: layer.ringModulation ?? effect.ringModulation,
    sweeps: layer.sweeps ?? effect.sweeps,
    layers: undefined,
  };
}

function createSoundEffectFilters(
  context: AudioContext,
  effect: ProceduralSoundEffect
): ActiveSoundFilter[] {
  if (
    typeof context.createBiquadFilter !== 'function' ||
    !effect.filters ||
    effect.filters.length === 0
  ) {
    return [];
  }

  return effect.filters.map((filter) => ({
    node: createSoundEffectFilterNode(context, filter),
    config: filter,
  }));
}

function createSoundEffectFilterNode(
  context: AudioContext,
  filter: ProceduralSoundFilter
): BiquadFilterNode {
  const node = context.createBiquadFilter();
  node.type = filter.type;
  node.frequency.setValueAtTime(filter.frequency, context.currentTime);
  if (typeof filter.q === 'number') {
    node.Q.setValueAtTime(filter.q, context.currentTime);
  }
  if (typeof filter.gain === 'number') {
    node.gain.setValueAtTime(filter.gain, context.currentTime);
  }
  return node;
}

function createSoundEffectDistortion(
  context: AudioContext,
  effect: ProceduralSoundEffect
): ActiveSoundDistortion | null {
  if (
    typeof context.createWaveShaper !== 'function' ||
    !effect.distortion ||
    typeof context.createGain !== 'function'
  ) {
    return null;
  }

  const preGain = context.createGain();
  const waveShaper = context.createWaveShaper() as WaveShaperNodeLike;
  const postGain = context.createGain();
  const amount = clampValue(effect.distortion.amount, 0, 1);
  preGain.gain.setValueAtTime(1 + amount * 3.5, context.currentTime);
  waveShaper.curve = createDistortionCurve(effect.distortion);
  waveShaper.oversample = '2x';
  postGain.gain.setValueAtTime(
    effect.distortion.outputGain,
    context.currentTime
  );
  return {
    preGain,
    waveShaper,
    postGain,
    config: effect.distortion,
  };
}

function createSoundEffectDelay(
  context: AudioContext,
  effect: ProceduralSoundEffect
): ActiveSoundDelay | null {
  if (
    typeof context.createDelay !== 'function' ||
    typeof context.createGain !== 'function' ||
    !effect.delay
  ) {
    return null;
  }

  const delay = context.createDelay() as DelayNodeLike;
  const feedbackGain = context.createGain();
  const wetGain = context.createGain();
  delay.delayTime.setValueAtTime(
    effect.delay.timeMs / 1000,
    context.currentTime
  );
  feedbackGain.gain.setValueAtTime(effect.delay.feedback, context.currentTime);
  wetGain.gain.setValueAtTime(effect.delay.mix, context.currentTime);
  return {
    delay,
    feedbackGain,
    wetGain,
    config: effect.delay,
  };
}

function createSoundEffectReverb(
  context: AudioContext,
  effect: ProceduralSoundEffect,
  reverbImpulseCache: Map<string, AudioBuffer>
): ActiveSoundReverb | null {
  if (
    typeof context.createConvolver !== 'function' ||
    typeof context.createGain !== 'function' ||
    !effect.reverb
  ) {
    return null;
  }

  const convolver = context.createConvolver() as ConvolverNodeLike;
  convolver.buffer = getOrCreateReverbImpulseBuffer(
    context,
    effect,
    reverbImpulseCache
  );
  const preDelay =
    typeof context.createDelay === 'function'
      ? (context.createDelay() as DelayNodeLike)
      : null;
  const tone =
    typeof context.createBiquadFilter === 'function'
      ? context.createBiquadFilter()
      : null;
  const wetGain = context.createGain();

  if (preDelay) {
    preDelay.delayTime.setValueAtTime(
      effect.reverb.preDelayMs / 1000,
      context.currentTime
    );
  }
  if (tone) {
    tone.type = 'lowpass';
    tone.frequency.setValueAtTime(effect.reverb.toneHz, context.currentTime);
    tone.Q.setValueAtTime(0.7, context.currentTime);
  }
  wetGain.gain.setValueAtTime(effect.reverb.mix, context.currentTime);

  return {
    preDelay,
    convolver,
    tone,
    wetGain,
    config: effect.reverb,
  };
}

function createSoundEffectTremolo(
  context: AudioContext,
  effect: ProceduralSoundEffect
): ActiveSoundTremolo | null {
  if (
    typeof context.createOscillator !== 'function' ||
    typeof context.createGain !== 'function' ||
    !effect.tremolo
  ) {
    return null;
  }

  const oscillator = context.createOscillator();
  const depthGain = context.createGain();
  const output = context.createGain();
  const depth = clampValue(effect.tremolo.depth, 0, 1);

  oscillator.type = effect.tremolo.waveform;
  oscillator.frequency.setValueAtTime(
    effect.tremolo.rateHz,
    context.currentTime
  );
  depthGain.gain.setValueAtTime(depth / 2, context.currentTime);
  output.gain.setValueAtTime(1 - depth / 2, context.currentTime);

  return {
    oscillator,
    depthGain,
    output,
    config: effect.tremolo,
  };
}

function createSoundEffectVibrato(
  context: AudioContext,
  effect: ProceduralSoundEffect
): ActiveSoundVibrato | null {
  if (
    typeof context.createOscillator !== 'function' ||
    typeof context.createGain !== 'function' ||
    !effect.vibrato
  ) {
    return null;
  }

  const oscillator = context.createOscillator();
  const depthGain = context.createGain();

  oscillator.type = effect.vibrato.waveform;
  oscillator.frequency.setValueAtTime(
    effect.vibrato.rateHz,
    context.currentTime
  );
  depthGain.gain.setValueAtTime(effect.vibrato.depthHz, context.currentTime);

  return {
    oscillator,
    depthGain,
    config: effect.vibrato,
  };
}

function createSoundEffectFrequencyModulation(
  context: AudioContext,
  effect: ProceduralSoundEffect
): ActiveSoundFrequencyModulation | null {
  if (
    typeof context.createOscillator !== 'function' ||
    typeof context.createGain !== 'function' ||
    !effect.frequencyModulation
  ) {
    return null;
  }

  const oscillator = context.createOscillator();
  const depthGain = context.createGain();

  oscillator.type = effect.frequencyModulation.waveform;
  oscillator.frequency.setValueAtTime(
    effect.frequencyModulation.modulatorFrequencyHz,
    context.currentTime
  );
  depthGain.gain.setValueAtTime(
    effect.frequencyModulation.depthHz,
    context.currentTime
  );

  return {
    oscillator,
    depthGain,
    config: effect.frequencyModulation,
  };
}

function createSoundEffectRingModulation(
  context: AudioContext,
  effect: ProceduralSoundEffect
): ActiveSoundRingModulation | null {
  if (
    typeof context.createOscillator !== 'function' ||
    typeof context.createGain !== 'function' ||
    !effect.ringModulation
  ) {
    return null;
  }

  const oscillator = context.createOscillator();
  const depthGain = context.createGain();
  const carrierGain = context.createGain();

  oscillator.type = effect.ringModulation.waveform;
  oscillator.frequency.setValueAtTime(
    effect.ringModulation.modulatorFrequencyHz,
    context.currentTime
  );
  depthGain.gain.setValueAtTime(
    effect.ringModulation.depth,
    context.currentTime
  );
  carrierGain.gain.setValueAtTime(0, context.currentTime);

  return {
    oscillator,
    depthGain,
    carrierGain,
    config: effect.ringModulation,
  };
}

function getOrCreateReverbImpulseBuffer(
  context: AudioContext,
  effect: ProceduralSoundEffect,
  cache: Map<string, AudioBuffer>
): AudioBuffer {
  const reverb = effect.reverb!;
  const seed = effect.seed ?? 0;
  const frameCount = Math.max(
    1,
    Math.ceil(context.sampleRate * (reverb.decayMs / 1000))
  );
  const cacheKey = `${reverb.profileId}:${seed}:${frameCount}:${Math.round(
    reverb.toneHz
  )}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channel = buffer.getChannelData(0);
  const random = createRandom(appendHashSeedPart(seed, frameCount));
  const toneFactor = Math.max(0.1, Math.min(1, reverb.toneHz / 12_000));
  for (let index = 0; index < frameCount; index += 1) {
    const progress = index / Math.max(1, frameCount - 1);
    const decay = Math.pow(1 - progress, 1.6 + (1 - toneFactor) * 1.2);
    const noise = random() * 2 - 1;
    channel[index] = noise * decay * toneFactor;
  }
  cache.set(cacheKey, buffer);
  return buffer;
}

function createDistortionCurve(
  distortion: ProceduralSoundDistortion
): Float32Array {
  const sampleCount = 256;
  const curve = new Float32Array(sampleCount);
  const amount = clampValue(distortion.amount, 0, 1);
  for (let index = 0; index < sampleCount; index += 1) {
    const input = (index / (sampleCount - 1)) * 2 - 1;
    curve[index] =
      distortion.mode === 'saturation'
        ? Math.tanh(input * (1 + amount * 4))
        : ((1 + amount * 12) * input) / (1 + amount * 12 * Math.abs(input));
  }
  return curve;
}

function connectSoundEffectSourceChain(source: ActiveSoundSource): void {
  const firstFilter = source.filters[0]?.node ?? null;
  const lastFilter = source.filters[source.filters.length - 1]?.node ?? null;
  const distortionInput = source.distortion?.preGain ?? null;
  const delayInput = source.delay?.delay ?? null;
  const reverbInput =
    source.reverb?.preDelay ?? source.reverb?.convolver ?? null;
  const dryOutput = source.distortion?.postGain ?? lastFilter ?? null;
  const amplitudeOutput = source.tremolo?.output ?? source.gain;
  const finalOutput = source.ringModulation?.carrierGain ?? amplitudeOutput;

  if (
    source.filters.length === 0 &&
    !source.distortion &&
    !source.delay &&
    !source.reverb &&
    !source.tremolo &&
    !source.ringModulation
  ) {
    source.source.connect(source.gain);
    return;
  }

  if (firstFilter) {
    source.source.connect(firstFilter);
    for (let index = 0; index < source.filters.length - 1; index += 1) {
      source.filters[index]!.node.connect(source.filters[index + 1]!.node);
    }
    if (distortionInput) {
      lastFilter!.connect(distortionInput);
    } else {
      lastFilter!.connect(finalOutput);
    }
  } else if (distortionInput) {
    source.source.connect(distortionInput);
  }

  if (source.distortion) {
    source.distortion.preGain.connect(source.distortion.waveShaper);
    source.distortion.waveShaper.connect(source.distortion.postGain);
    source.distortion.postGain.connect(finalOutput);
  }

  if (
    !firstFilter &&
    !source.distortion &&
    (delayInput || source.reverb || source.tremolo || source.ringModulation)
  ) {
    source.source.connect(finalOutput);
  }

  if (source.delay) {
    if (dryOutput) {
      dryOutput.connect(source.delay.delay);
    } else if (!distortionInput && !firstFilter) {
      source.source.connect(source.delay.delay);
    }
    source.delay.delay.connect(source.delay.wetGain);
    source.delay.wetGain.connect(finalOutput);
    source.delay.delay.connect(source.delay.feedbackGain);
    source.delay.feedbackGain.connect(source.delay.delay);
  }

  if (source.reverb && reverbInput) {
    if (dryOutput) {
      dryOutput.connect(reverbInput);
    } else if (!distortionInput && !firstFilter) {
      source.source.connect(reverbInput);
    }

    if (source.reverb.preDelay) {
      source.reverb.preDelay.connect(source.reverb.convolver);
    }

    if (source.reverb.tone) {
      source.reverb.convolver.connect(source.reverb.tone);
      source.reverb.tone.connect(source.reverb.wetGain);
    } else {
      source.reverb.convolver.connect(source.reverb.wetGain);
    }
    source.reverb.wetGain.connect(finalOutput);
  }

  if (source.tremolo) {
    source.tremolo.oscillator.connect(source.tremolo.depthGain);
    source.tremolo.depthGain.connect(source.tremolo.output.gain);
    source.tremolo.output.connect(source.gain);
  }

  if (source.ringModulation) {
    source.ringModulation.oscillator.connect(source.ringModulation.depthGain);
    source.ringModulation.depthGain.connect(
      source.ringModulation.carrierGain.gain
    );
    source.ringModulation.carrierGain.connect(amplitudeOutput);
  }
}

function createScheduledSoundSource(
  context: AudioContext,
  effect: ProceduralSoundEffect,
  noiseBufferCache: Map<string, AudioBuffer>
): ScheduledSoundSourceNode {
  if (
    effect.noiseColor &&
    typeof context.createBuffer === 'function' &&
    typeof context.createBufferSource === 'function'
  ) {
    const source = context.createBufferSource() as AudioBufferSourceNodeLike;
    source.buffer = getOrCreateNoiseBuffer(context, effect, noiseBufferCache);
    return source;
  }

  return context.createOscillator();
}

function resolveTotalSoundEffectVolume(effect: ProceduralSoundEffect): number {
  let layerVolume = 0;
  for (const layer of effect.layers ?? []) {
    layerVolume += layer.volume;
  }
  return effect.volume + layerVolume;
}

function applyAmplitudeEnvelope(
  gainNode: GainNode,
  effect: ProceduralSoundEffect,
  peakGain: number,
  startAt: number,
  durationSeconds: number
): void {
  const minimumGain = 0.0001;
  const envelope = effect.envelope ?? DEFAULT_PROCEDURAL_SOUND_ENVELOPE;
  const attackSeconds = Math.max(0, envelope.attackMs / 1000);
  const decaySeconds = Math.max(0, envelope.decayMs / 1000);
  const releaseSeconds = Math.max(0, envelope.releaseMs / 1000);
  const endAt = startAt + durationSeconds;
  const attackEndAt = Math.min(endAt, startAt + attackSeconds);
  const decayEndAt = Math.min(endAt, attackEndAt + decaySeconds);
  const releaseStartAt = Math.max(decayEndAt, endAt - releaseSeconds);
  const sustainGain = Math.max(minimumGain, peakGain * envelope.sustainLevel);

  gainNode.gain.setValueAtTime(minimumGain, startAt);
  if (attackEndAt > startAt) {
    gainNode.gain.exponentialRampToValueAtTime(peakGain, attackEndAt);
  } else {
    gainNode.gain.setValueAtTime(peakGain, startAt);
  }
  if (decayEndAt > attackEndAt) {
    gainNode.gain.exponentialRampToValueAtTime(sustainGain, decayEndAt);
  } else {
    gainNode.gain.setValueAtTime(sustainGain, attackEndAt);
  }
  if (releaseStartAt > decayEndAt) {
    gainNode.gain.setValueAtTime(sustainGain, releaseStartAt);
  }
  gainNode.gain.exponentialRampToValueAtTime(minimumGain, endAt);
}

function applyPitchEnvelope(
  source: OscillatorNode,
  effect: ProceduralSoundEffect,
  startAt: number,
  durationSeconds: number
): void {
  const envelope = effect.pitchEnvelope;
  if (!envelope) {
    return;
  }

  const attackSeconds = Math.max(0, envelope.attackMs / 1000);
  const decaySeconds = Math.max(0, envelope.decayMs / 1000);
  const releaseSeconds = Math.max(0, envelope.releaseMs / 1000);
  const endAt = startAt + durationSeconds;
  const attackEndAt = Math.min(endAt, startAt + attackSeconds);
  const decayEndAt = Math.min(endAt, attackEndAt + decaySeconds);
  const releaseStartAt = Math.max(decayEndAt, endAt - releaseSeconds);
  const peakFrequency = Math.max(
    40,
    effect.frequency * envelope.peakMultiplier
  );
  const sustainFrequency = Math.max(
    40,
    effect.frequency * envelope.sustainMultiplier
  );
  const releaseFrequency = Math.max(
    40,
    effect.frequency * envelope.releaseTargetMultiplier
  );

  if (attackEndAt > startAt) {
    source.frequency.linearRampToValueAtTime(peakFrequency, attackEndAt);
  } else {
    source.frequency.setValueAtTime(peakFrequency, startAt);
  }
  if (decayEndAt > attackEndAt) {
    source.frequency.linearRampToValueAtTime(sustainFrequency, decayEndAt);
  } else {
    source.frequency.setValueAtTime(sustainFrequency, attackEndAt);
  }
  if (releaseStartAt > decayEndAt) {
    source.frequency.setValueAtTime(sustainFrequency, releaseStartAt);
  }
  source.frequency.linearRampToValueAtTime(releaseFrequency, endAt);
}

function applySoundEffectFilterEnvelopes(
  source: ActiveSoundSource,
  startAt: number,
  durationSeconds: number
): void {
  for (const filter of source.filters) {
    applySoundEffectFilterEnvelope(
      filter.node,
      filter.config,
      startAt,
      durationSeconds
    );
  }
}

function applySoundEffectFilterEnvelope(
  node: BiquadFilterNode,
  filter: ProceduralSoundFilter,
  startAt: number,
  durationSeconds: number
): void {
  const envelope = filter.envelope;
  if (!envelope) {
    return;
  }

  const attackSeconds = Math.max(0, envelope.attackMs / 1000);
  const decaySeconds = Math.max(0, envelope.decayMs / 1000);
  const releaseSeconds = Math.max(0, envelope.releaseMs / 1000);
  const endAt = startAt + durationSeconds;
  const attackEndAt = Math.min(endAt, startAt + attackSeconds);
  const decayEndAt = Math.min(endAt, attackEndAt + decaySeconds);
  const releaseStartAt = Math.max(decayEndAt, endAt - releaseSeconds);
  const peakFrequency = clampValue(
    filter.frequency * envelope.peakFrequencyMultiplier,
    40,
    20_000
  );
  const sustainFrequency = clampValue(
    filter.frequency * envelope.sustainFrequencyMultiplier,
    40,
    20_000
  );
  const releaseFrequency = clampValue(
    filter.frequency * envelope.releaseFrequencyMultiplier,
    40,
    20_000
  );

  applyFilterEnvelopeParam(
    node.frequency,
    peakFrequency,
    sustainFrequency,
    releaseFrequency,
    startAt,
    attackEndAt,
    decayEndAt,
    releaseStartAt,
    endAt
  );

  if (
    typeof filter.q === 'number' &&
    typeof envelope.peakQMultiplier === 'number' &&
    typeof envelope.sustainQMultiplier === 'number' &&
    typeof envelope.releaseQMultiplier === 'number'
  ) {
    applyFilterEnvelopeParam(
      node.Q,
      Math.max(0.0001, filter.q * envelope.peakQMultiplier),
      Math.max(0.0001, filter.q * envelope.sustainQMultiplier),
      Math.max(0.0001, filter.q * envelope.releaseQMultiplier),
      startAt,
      attackEndAt,
      decayEndAt,
      releaseStartAt,
      endAt
    );
  }

  if (
    typeof filter.gain === 'number' &&
    typeof envelope.peakGainMultiplier === 'number' &&
    typeof envelope.sustainGainMultiplier === 'number' &&
    typeof envelope.releaseGainMultiplier === 'number'
  ) {
    applyFilterEnvelopeParam(
      node.gain,
      filter.gain * envelope.peakGainMultiplier,
      filter.gain * envelope.sustainGainMultiplier,
      filter.gain * envelope.releaseGainMultiplier,
      startAt,
      attackEndAt,
      decayEndAt,
      releaseStartAt,
      endAt
    );
  }
}

function applyFilterEnvelopeParam(
  param: AudioParam,
  peakValue: number,
  sustainValue: number,
  releaseValue: number,
  startAt: number,
  attackEndAt: number,
  decayEndAt: number,
  releaseStartAt: number,
  endAt: number
): void {
  if (attackEndAt > startAt) {
    param.linearRampToValueAtTime(peakValue, attackEndAt);
  } else {
    param.setValueAtTime(peakValue, startAt);
  }
  if (decayEndAt > attackEndAt) {
    param.linearRampToValueAtTime(sustainValue, decayEndAt);
  } else {
    param.setValueAtTime(sustainValue, attackEndAt);
  }
  if (releaseStartAt > decayEndAt) {
    param.setValueAtTime(sustainValue, releaseStartAt);
  }
  param.linearRampToValueAtTime(releaseValue, endAt);
}

function getOrCreateNoiseBuffer(
  context: AudioContext,
  effect: ProceduralSoundEffect,
  noiseBufferCache: Map<string, AudioBuffer>
): AudioBuffer {
  const seed = effect.seed ?? 0;
  const frameCount = Math.max(
    1,
    Math.ceil(context.sampleRate * (effect.durationMs / 1000))
  );
  const cacheKey = `${effect.noiseColor ?? 'none'}:${seed}:${frameCount}`;
  const cached = noiseBufferCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channelData = buffer.getChannelData(0);
  const samples = createProceduralNoiseSamples({
    color: effect.noiseColor ?? 'white',
    frameCount,
    seed,
  });
  channelData.set(samples);
  noiseBufferCache.set(cacheKey, buffer);
  return buffer;
}

function applySoundEffectSourceShape(
  source: ScheduledSoundSourceNode,
  effect: ProceduralSoundEffect,
  startAt: number,
  durationSeconds: number
): void {
  if (!('frequency' in source)) {
    return;
  }

  source.type = effect.waveform;
  source.frequency.setValueAtTime(effect.frequency, startAt);
  applyPitchEnvelope(source, effect, startAt, durationSeconds);
  for (const sweep of effect.sweeps ?? []) {
    const targetFrequency = Math.max(
      40,
      typeof sweep.targetFrequency === 'number'
        ? sweep.targetFrequency
        : effect.frequency * (sweep.targetMultiplier ?? 1)
    );
    const targetAt = startAt + durationSeconds * sweep.atProgress;
    if (sweep.curve === 'linear') {
      source.frequency.linearRampToValueAtTime(targetFrequency, targetAt);
      continue;
    }
    source.frequency.exponentialRampToValueAtTime(targetFrequency, targetAt);
  }
}

function connectSoundEffectSourceModulation(source: ActiveSoundSource): void {
  if ('frequency' in source.source && source.vibrato) {
    source.vibrato.oscillator.connect(source.vibrato.depthGain);
    source.vibrato.depthGain.connect(source.source.frequency);
  }
  if ('frequency' in source.source && source.frequencyModulation) {
    source.frequencyModulation.oscillator.connect(
      source.frequencyModulation.depthGain
    );
    source.frequencyModulation.depthGain.connect(source.source.frequency);
  }
}

function compareIncomingSoundToActiveVoice(
  incoming: Pick<ActiveSoundVoice, 'priority' | 'loudness'>,
  active: Pick<ActiveSoundVoice, 'priority' | 'loudness'>
): number {
  const incomingScore = resolveActiveSoundVoiceScore(incoming);
  const activeScore = resolveActiveSoundVoiceScore(active);
  return incomingScore - activeScore;
}

function compareActiveSoundVoices(
  left: Pick<ActiveSoundVoice, 'priority' | 'loudness'>,
  right: Pick<ActiveSoundVoice, 'priority' | 'loudness'>
): number {
  return (
    resolveActiveSoundVoiceScore(left) - resolveActiveSoundVoiceScore(right)
  );
}

function resolveActiveSoundVoiceScore(
  voice: Pick<ActiveSoundVoice, 'priority' | 'loudness'>
): number {
  return voice.priority * 1000 + voice.loudness;
}

function resolveSoundEffectPriority(kind: SoundEffectKind): number {
  switch (kind) {
    case 'combat-weapon':
    case 'combat-magic':
    case 'advancement':
    case 'steam-whistle':
    case 'train-whistle':
      return 6;
    case 'jump':
    case 'landing':
    case 'blocked':
    case 'open':
    case 'close':
      return 5;
    case 'footstep':
      return 4;
    case 'train-engine':
    case 'paddle-calliope':
      return 2;
    case 'wind':
    case 'ocean':
    case 'river-ambience':
    case 'forest-ambience':
    case 'plains-ambience':
    case 'mountain-ambience':
    case 'cave-ambience':
    case 'settlement-ambience':
    case 'ruins-ambience':
      return 1;
    default:
      return 3;
  }
}

function resolveSoundMixSafetyGain(totalLoudness: number): number {
  if (totalLoudness <= SOUND_MIX_HEADROOM_LOUDNESS) {
    return 1;
  }
  return clampValue(SOUND_MIX_HEADROOM_LOUDNESS / totalLoudness, 0.38, 1);
}

export function resolvePriorityDynamicRangeGain(
  voicePriority: number,
  highestPriority: number
): number {
  if (highestPriority < 5 || voicePriority >= highestPriority) {
    return 1;
  }
  const priorityGap = highestPriority - voicePriority;
  const reductionPerStep = highestPriority >= 6 ? 0.12 : 0.08;
  const floor = highestPriority >= 6 ? 0.52 : 0.64;
  return clampValue(1 - priorityGap * reductionPerStep, floor, 1);
}

export function resolveSoundEffectVolumeBounds(
  kind: SoundEffectKind
): SoundEffectVolumeBounds {
  switch (kind) {
    case 'ocean':
    case 'river-ambience':
    case 'forest-ambience':
    case 'plains-ambience':
    case 'mountain-ambience':
    case 'cave-ambience':
    case 'settlement-ambience':
    case 'ruins-ambience':
    case 'wind':
      return AMBIENT_SOUND_VOLUME_BOUNDS;
    case 'footstep':
    case 'jump':
    case 'landing':
    case 'blocked':
    case 'open':
    case 'close':
      return { min: 0.022, max: 0.06 };
    case 'train-engine':
    case 'paddle-calliope':
      return { min: 0.018, max: 0.038 };
    case 'train-whistle':
    case 'steam-whistle':
      return { min: 0.028, max: 0.05 };
    case 'combat-weapon':
    case 'combat-magic':
    case 'advancement':
      return { min: 0.038, max: 0.058 };
    default:
      return { min: 0.02, max: 0.05 };
  }
}

export function normalizeSoundEffectVolume(
  kind: SoundEffectKind,
  volume: number
): number {
  const bounds = resolveSoundEffectVolumeBounds(kind);
  return clampValue(volume, bounds.min, bounds.max);
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
