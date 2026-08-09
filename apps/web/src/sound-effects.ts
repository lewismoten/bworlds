import { appendHashSeedPart, registerHashSeeds } from '@bworlds/core';
import { MAX_SIMULTANEOUS_PROCEDURAL_SOUND_VOICES } from './audio-budget.ts';
import type { AudioCategory } from './audio-categories.ts';
import { resolveSoundEffectCategory } from './audio-categories.ts';
import type { NearbyAmbientKind } from './nearby-ambient.ts';
import {
  createProceduralSoundEffectGenerator,
  type ProceduralSoundEffect,
  type SoundEffectKind,
  type SoundPosition,
  type SoundWaveform,
} from './procedural-sound-effect-generator.ts';

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
    ...resolveProceduralSoundVariation(kind),
  };
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
type ActiveSoundVoice = {
  kind: SoundEffectKind;
  priority: number;
  loudness: number;
  oscillator: OscillatorNode;
  gain: GainNode;
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

export function createWebAudioSoundEffectSink(
  options: SoundEffectSinkOptions = {}
): SoundEffectSink {
  let audioContext: AudioContext | null = null;
  let activeSourceCount = 0;
  let outputGainNode: GainNode | null = null;
  const activeVoices = new Set<ActiveSoundVoice>();

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
    voice.oscillator.onended = null;
    voice.oscillator.disconnect?.();
    voice.gain.disconnect?.();
    voice.mixGain.disconnect?.();
    voice.panner?.disconnect?.();
    if (audioContext) {
      updateOutputGain(audioContext);
    }
  }

  function stopVoice(voice: ActiveSoundVoice, stopAt?: number): void {
    try {
      if (typeof stopAt === 'number') {
        voice.oscillator.stop(stopAt);
      } else {
        voice.oscillator.stop();
      }
    } catch {
      // Ignore invalid repeated stop calls from already-ending voices.
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
      const durationSeconds = effect.durationMs / 1000;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const mixGain = context.createGain();
      const panner =
        typeof context.createStereoPanner === 'function'
          ? context.createStereoPanner()
          : null;
      const loudness =
        normalizedVolume * categoryVolume * spatialMix.gainMultiplier;
      const priority = resolveSoundEffectPriority(effect.kind);
      const voice: ActiveSoundVoice = {
        kind: effect.kind,
        priority,
        loudness,
        oscillator,
        gain,
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
      oscillator.type = effect.waveform;
      oscillator.frequency.setValueAtTime(effect.frequency, startAt);
      if (effect.kind === 'jump') {
        oscillator.frequency.exponentialRampToValueAtTime(
          effect.frequency * 1.35,
          startAt + durationSeconds
        );
      }
      if (effect.kind === 'landing') {
        oscillator.frequency.exponentialRampToValueAtTime(
          Math.max(40, effect.frequency * 0.78),
          startAt + durationSeconds
        );
      }
      if (effect.kind === 'advancement') {
        oscillator.frequency.exponentialRampToValueAtTime(
          effect.frequency * 1.5,
          startAt + durationSeconds * 0.55
        );
      }
      if (effect.kind === 'train-engine') {
        oscillator.frequency.exponentialRampToValueAtTime(
          Math.max(48, effect.frequency * 0.82),
          startAt + durationSeconds
        );
      }
      if (effect.kind === 'train-whistle') {
        oscillator.frequency.exponentialRampToValueAtTime(
          effect.frequency * 1.28,
          startAt + durationSeconds * 0.72
        );
      }
      if (effect.kind === 'paddle-calliope') {
        oscillator.frequency.linearRampToValueAtTime(
          effect.frequency * 1.08,
          startAt + durationSeconds * 0.32
        );
        oscillator.frequency.linearRampToValueAtTime(
          effect.frequency * 0.94,
          startAt + durationSeconds * 0.88
        );
      }
      if (effect.kind === 'steam-whistle') {
        oscillator.frequency.exponentialRampToValueAtTime(
          effect.frequency * 1.22,
          startAt + durationSeconds * 0.22
        );
        oscillator.frequency.exponentialRampToValueAtTime(
          effect.frequency * 0.92,
          startAt + durationSeconds
        );
      }
      if (effect.kind === 'combat-weapon') {
        oscillator.frequency.exponentialRampToValueAtTime(
          Math.max(60, effect.frequency * 0.64),
          startAt + durationSeconds
        );
      }
      if (effect.kind === 'combat-magic') {
        oscillator.frequency.linearRampToValueAtTime(
          effect.frequency * 1.18,
          startAt + durationSeconds * 0.3
        );
        oscillator.frequency.linearRampToValueAtTime(
          effect.frequency * 0.86,
          startAt + durationSeconds
        );
      }
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(
        normalizedVolume * categoryVolume * spatialMix.gainMultiplier,
        startAt + durationSeconds * 0.2
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSeconds);
      oscillator.connect(gain);
      if (panner) {
        panner.pan.setValueAtTime(spatialMix.pan, startAt);
        gain.connect(mixGain);
        mixGain.connect(panner);
        panner.connect(outputGain);
      } else {
        gain.connect(mixGain);
        mixGain.connect(outputGain);
      }
      activeVoices.add(voice);
      activeSourceCount += 1;
      updateOutputGain(context);
      oscillator.onended = () => {
        removeVoice(voice);
      };
      oscillator.start(startAt);
      oscillator.stop(startAt + durationSeconds);
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
