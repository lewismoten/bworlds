import {
  appendHashSeedPart,
  createRandom,
  registerHashSeeds,
} from '@bworlds/core';
import { MAX_SIMULTANEOUS_PROCEDURAL_SOUND_VOICES } from './audio-budget.ts';
import type { AudioCategory } from './audio-categories.ts';
import { resolveSoundEffectCategory } from './audio-categories.ts';
import type { NearbyAmbientKind } from './nearby-ambient.ts';
import type { NearbyAmbientProfile } from './nearby-ambient.ts';
import { resolveAmbientPlaybackLayers } from './ambient-soundscape.ts';
import { resolveAmbientSeason } from './ambient-cycle.ts';
import {
  buildRenderedProceduralSoundBufferKey,
  canRenderProceduralSoundToBuffer,
  renderProceduralSoundToBufferData,
  resolveRenderedSoundFrameCount,
} from './procedural-sound-render.ts';
import {
  buildProceduralSoundRecipe,
  buildProceduralSoundRecipeId,
} from './sound-effects/recipe-library.ts';
import { createSoundVariationSelector } from './sound-effects/variation-selector.ts';
import {
  isHailWeatherKind,
  isRainWeatherKind,
  isSnowWeatherKind,
  isThunderstormWeatherKind,
  isWindWeatherKind,
  normalizeHailAudioIntensity,
  normalizeSnowstormAudioIntensity,
  normalizeThunderstormAudioIntensity,
  normalizeWindAudioIntensity,
  normalizeWeatherAudioIntensity,
  resolveHailAudioSurface,
  resolveThunderLightningStrike,
  resolveWeatherAcousticGain,
  resolveWindAudioSurface,
  resolveWeatherPrecipitationSurface,
  type WeatherHailSurface,
  type WeatherPrecipitationSurface,
  type WeatherThunderVariant,
} from './weather-audio.ts';
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
  | 'grass'
  | 'mud'
  | 'sand'
  | 'gravel'
  | 'rock'
  | 'wood'
  | 'metal'
  | 'stone-floor'
  | 'snow'
  | 'shallow-water'
  | 'vegetation';

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
    dayProgress?: number;
    yearProgress?: number;
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
      blendedLayers?: NearbyAmbientProfile['blendedLayers'];
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
    grass: {
      cadenceMs: 315,
      footstepFrequency: 128,
      landingFrequency: 94,
      footstepVolume: 0.036,
      landingVolume: 0.052,
      waveform: 'triangle',
    },
    mud: {
      cadenceMs: 342,
      footstepFrequency: 98,
      landingFrequency: 76,
      footstepVolume: 0.046,
      landingVolume: 0.068,
      waveform: 'triangle',
    },
    sand: {
      cadenceMs: 322,
      footstepFrequency: 118,
      landingFrequency: 88,
      footstepVolume: 0.034,
      landingVolume: 0.049,
      waveform: 'triangle',
    },
    gravel: {
      cadenceMs: 265,
      footstepFrequency: 168,
      landingFrequency: 122,
      footstepVolume: 0.038,
      landingVolume: 0.056,
      waveform: 'square',
    },
    rock: {
      cadenceMs: 286,
      footstepFrequency: 176,
      landingFrequency: 128,
      footstepVolume: 0.042,
      landingVolume: 0.062,
      waveform: 'square',
    },
    wood: {
      cadenceMs: 290,
      footstepFrequency: 188,
      landingFrequency: 132,
      footstepVolume: 0.042,
      landingVolume: 0.06,
      waveform: 'square',
    },
    metal: {
      cadenceMs: 274,
      footstepFrequency: 214,
      landingFrequency: 148,
      footstepVolume: 0.04,
      landingVolume: 0.058,
      waveform: 'square',
    },
    'stone-floor': {
      cadenceMs: 282,
      footstepFrequency: 146,
      landingFrequency: 104,
      footstepVolume: 0.033,
      landingVolume: 0.05,
      waveform: 'triangle',
    },
    snow: {
      cadenceMs: 336,
      footstepFrequency: 106,
      landingFrequency: 78,
      footstepVolume: 0.04,
      landingVolume: 0.06,
      waveform: 'square',
    },
    'shallow-water': {
      cadenceMs: 330,
      footstepFrequency: 114,
      landingFrequency: 86,
      footstepVolume: 0.044,
      landingVolume: 0.064,
      waveform: 'triangle',
    },
    vegetation: {
      cadenceMs: 324,
      footstepFrequency: 124,
      landingFrequency: 90,
      footstepVolume: 0.039,
      landingVolume: 0.058,
      waveform: 'triangle',
    },
  };

const SURFACE_AUDIO_FAMILY_SEED_PARTS: Record<SurfaceAudioFamily, number> = {
  default: 0,
  grass: 1,
  mud: 2,
  sand: 3,
  gravel: 4,
  rock: 5,
  wood: 6,
  metal: 7,
  'stone-floor': 8,
  snow: 9,
  'shallow-water': 10,
  vegetation: 11,
};

const SOUND_EFFECT_SEEDS = registerHashSeeds([
  'footstep',
  'jump',
  'landing',
  'blocked',
  'open',
  'close',
  'thunder',
  'rain',
  'hail',
  'snowstorm',
  'wind',
  'ocean',
  'river-ambience',
  'forest-ambience',
  'plains-ambience',
  'snowfield-ambience',
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
const VARIATION_OFFSET_SEQUENCE = [-8, 6, -3, 10, -11, 4, 0, 8] as const;

export function getSurfaceAudioFamily(
  tileKind: SurfaceKind | undefined
): SurfaceAudioFamily {
  if (!tileKind) {
    return 'default';
  }
  if (tileKind === 'river' || tileKind === 'water' || tileKind === 'shallows') {
    return 'shallow-water';
  }
  if (tileKind === 'snow' || tileKind === 'ice') {
    return 'snow';
  }
  if (
    tileKind === 'forest' ||
    tileKind === 'cave-mushrooms' ||
    tileKind === 'vegetation'
  ) {
    return 'vegetation';
  }
  if (tileKind === 'mud' || tileKind === 'swamp') {
    return 'mud';
  }
  if (tileKind === 'sand' || tileKind === 'shore') {
    return 'sand';
  }
  if (
    tileKind === 'road' ||
    tileKind === 'path' ||
    tileKind === 'gravel' ||
    tileKind === 'quarry'
  ) {
    return 'gravel';
  }
  if (
    tileKind === 'mountain' ||
    tileKind === 'rock' ||
    tileKind === 'observatory'
  ) {
    return 'rock';
  }
  if (
    tileKind === 'bridge' ||
    tileKind === 'dock' ||
    tileKind === 'ship' ||
    tileKind === 'wood'
  ) {
    return 'wood';
  }
  if (tileKind === 'rail' || tileKind === 'station' || tileKind === 'metal') {
    return 'metal';
  }
  if (
    tileKind === 'floor' ||
    tileKind === 'shop' ||
    tileKind === 'stairsUp' ||
    tileKind === 'stairsDown' ||
    tileKind === 'town' ||
    tileKind === 'cave-floor' ||
    tileKind === 'stone-floor'
  ) {
    return 'stone-floor';
  }
  if (tileKind === 'plains' || tileKind === 'grass') {
    return 'grass';
  }
  return 'default';
}

export function getSurfaceAudioProfile(
  tileKind: SurfaceKind | undefined
): SurfaceAudioProfile {
  return SURFACE_AUDIO_PROFILES[getSurfaceAudioFamily(tileKind)];
}

export function resolveMovementIdentityVariant(options: {
  kind: 'footstep' | 'landing';
  tileKind: SurfaceKind | undefined;
  yearProgress?: number;
}): string | undefined {
  const season = resolveAmbientSeason(options.yearProgress);
  const family = getSurfaceAudioFamily(options.tileKind);
  if (season === 'autumn' && (family === 'grass' || family === 'vegetation')) {
    return 'dry-leaves';
  }
  if (season === 'winter' && family === 'snow') {
    return 'winter-snow';
  }
  return undefined;
}

export function resolveAmbientIdentityVariant(options: {
  ambientKind: NearbyAmbientKind;
  tileKind: SurfaceKind | undefined;
  yearProgress?: number;
  fallback?: string;
}): string | undefined {
  if (
    resolveAmbientSeason(options.yearProgress) === 'winter' &&
    options.tileKind === 'ice' &&
    (options.ambientKind === 'ocean' || options.ambientKind === 'river')
  ) {
    return 'frozen';
  }
  return options.fallback;
}

export function resolveRainIdentityVariant(options: {
  surface: WeatherPrecipitationSurface;
  weatherKind?: string;
  yearProgress?: number;
}): string {
  const season = resolveAmbientSeason(options.yearProgress);
  if (options.weatherKind === 'heavy-rain') {
    if (season === 'spring') {
      return `spring-${options.surface}`;
    }
    if (season === 'autumn') {
      return `autumn-${options.surface}`;
    }
  }
  return options.surface;
}

export function resolveThunderIdentityVariant(
  variant: WeatherThunderVariant,
  yearProgress?: number
): string {
  const season = resolveAmbientSeason(yearProgress);
  if (season === 'summer' || season === 'spring') {
    return `${season}-${variant}`;
  }
  return variant;
}

export function resolveSeasonalWindIdentityVariant(
  baseVariant: 'stormfront' | 'canopy' | 'crossdraft' | 'sandstorm' | 'cyclone',
  yearProgress?: number,
  weatherKind?: string
): string {
  const season = resolveAmbientSeason(yearProgress);
  if (weatherKind === 'wind' && season === 'autumn') {
    return `autumn-${baseVariant}`;
  }
  if (baseVariant === 'cyclone' && season === 'summer') {
    return 'summer-cyclone';
  }
  return baseVariant;
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
  variantOffset: number,
  durationMsOverride?: number,
  identityVariant?: string
) {
  return buildProceduralSoundRecipe({
    kind,
    tileKind,
    identityVariant,
    profile,
    variantOffset,
    durationMsOverride,
    resolveAdvancementFrequency,
    resolveAmbientSoundFrequency,
    resolveInteractionFrequency,
    resolveInteractionWaveform,
    resolvePaddleBoatCalliopeFrequency,
    resolveSteamWhistleFrequency,
  });
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
  let lastRainAtMs = -Infinity;
  let lastThunderAtMs = -Infinity;
  let lastHailAtMs = -Infinity;
  let lastSnowstormAtMs = -Infinity;
  let lastWindAtMs = -Infinity;
  let lastProgressionAtMs = -Infinity;
  const lastAmbientCueAtMsBySignature = new Map<string, number>();
  let lastTrainEngineAtMs = -Infinity;
  let lastTrainWhistleAtMs = -Infinity;
  let lastPaddleCalliopeAtMs = -Infinity;
  let lastSteamWhistleAtMs = -Infinity;
  let lastSteamWhistleSignature = '';
  let previousJumping = false;
  const variationSelector = createSoundVariationSelector();

  function createProceduralEffect(
    kind: SoundEffectKind,
    nowMs: number,
    tileKind?: SurfaceKind,
    emitter?: SoundPosition,
    listener?: SoundPosition,
    durationMsOverride?: number,
    identityVariant?: string
  ): ProceduralSoundEffect {
    const profile = getSurfaceAudioProfile(tileKind);
    const recipeId = buildProceduralSoundRecipeId(
      kind,
      tileKind,
      identityVariant
    );
    const variationIndex = variationSelector.select(
      recipeId,
      nowMs,
      resolveSoundVariationPolicy(kind)
    );
    const variantOffset =
      VARIATION_OFFSET_SEQUENCE[
        variationIndex % VARIATION_OFFSET_SEQUENCE.length
      ] ?? 0;
    return proceduralSoundEffectGenerator.generate({
      kind,
      nowMs,
      seed: createProceduralEffectSeed(kind, nowMs, tileKind, variationIndex),
      recipe: resolveProceduralSoundRecipe(
        kind,
        tileKind,
        profile,
        variantOffset,
        durationMsOverride,
        identityVariant
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
    volumeMultiplier = 1,
    durationMsOverride?: number,
    identityVariant?: string
  ) {
    const effect = createProceduralEffect(
      kind,
      nowMs,
      tileKind,
      emitter,
      listener,
      durationMsOverride,
      identityVariant
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
        durationMs: getProgressionSoundDurationMs(level),
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
      play(
        'jump',
        nowMs,
        tileKind,
        emitter,
        listener,
        1,
        getMovementSoundDurationMs('jump', getSurfaceAudioProfile(tileKind))
      );
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
      play(
        'blocked',
        nowMs,
        tileKind,
        emitter,
        listener,
        1,
        getMovementSoundDurationMs('blocked', getSurfaceAudioProfile(tileKind))
      );
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
        recipeId: buildProceduralSoundRecipeId(kind, undefined, style),
      });
    },
    update({
      nowMs,
      walking,
      isJumping,
      viewMode,
      ambianceEnabled,
      tileKind,
      dayProgress,
      yearProgress,
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
            ambienceDuckingGain,
            getTrainEngineDurationMs(nearbyTrain.progress)
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
            nearbyTrain.listener ?? listener,
            1,
            getTrainWhistleDurationMs(nearbyTrain.progress)
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
            durationMs: getPaddleBoatCalliopeDurationMs(
              nearbyPaddleBoat.progress
            ),
            volume: 0.034 * ambienceDuckingGain,
            waveform: 'triangle',
            emitter: nearbyPaddleBoat.emitter,
            listener: nearbyPaddleBoat.listener ?? listener,
            recipeId: buildProceduralSoundRecipeId(
              'paddle-calliope',
              'paddle-boat'
            ),
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
              durationMs: getSteamWhistleDurationMs(
                nearbyPaddleBoat.whistlePhase
              ),
              volume: 0.048,
              waveform: 'square',
              emitter: nearbyPaddleBoat.emitter,
              listener: nearbyPaddleBoat.listener ?? listener,
              recipeId: buildProceduralSoundRecipeId(
                'steam-whistle',
                'paddle-boat',
                nearbyPaddleBoat.whistlePhase
              ),
            });
          }
        } else {
          lastSteamWhistleSignature = '';
        }

        const ambientProfile =
          nearbyAmbient &&
          typeof nearbyAmbient.intensity === 'number' &&
          nearbyAmbient.emitter
            ? {
                kind: nearbyAmbient.kind,
                intensity: nearbyAmbient.intensity,
                emitter: nearbyAmbient.emitter,
                listener: nearbyAmbient.listener ?? listener,
                blendedLayers: nearbyAmbient.blendedLayers,
              }
            : null;

        const ambientLayers = resolveAmbientPlaybackLayers({
          profile: ambientProfile,
          listener,
          nowMs,
          dayProgress,
          yearProgress,
        });
        if (ambientLayers.length > 0) {
          for (let index = 0; index < ambientLayers.length; index += 1) {
            const layer = ambientLayers[index]!;
            const previousAmbientAtMs =
              lastAmbientCueAtMsBySignature.get(layer.signature) ?? -Infinity;
            const ambientReady =
              previousAmbientAtMs === -Infinity
                ? true
                : nowMs - previousAmbientAtMs >=
                  getAmbientSoundCadenceMs(layer.kind, layer.intensity) *
                    layer.cadenceMultiplier;
            if (!ambientReady) {
              continue;
            }
            lastAmbientCueAtMsBySignature.set(layer.signature, nowMs);
            sink.play({
              kind: resolveAmbientEffectKind(layer.kind),
              nowMs,
              frequency: resolveAmbientSoundFrequency(
                layer.kind,
                layer.intensity
              ),
              durationMs: getAmbientSoundDurationMs(
                layer.kind,
                layer.intensity
              ),
              volume:
                getAmbientSoundVolume(layer.kind, layer.intensity) *
                ambienceDuckingGain *
                layer.volumeMultiplier,
              waveform: resolveAmbientSoundWaveform(layer.kind),
              emitter: layer.emitter,
              listener: layer.listener ?? listener,
              recipeId: buildProceduralSoundRecipeId(
                resolveAmbientEffectKind(layer.kind),
                layer.kind,
                resolveAmbientIdentityVariant({
                  ambientKind: layer.kind,
                  tileKind,
                  yearProgress,
                  fallback: layer.identityVariant,
                })
              ),
            });
          }
        }

        if (
          isThunderstormWeatherKind(weatherKind) &&
          nowMs - lastThunderAtMs >=
            getThunderCadenceMs(
              normalizeThunderstormAudioIntensity(
                weatherIntensity,
                weatherKind,
                windStrength
              )
            )
        ) {
          const thunderIntensity = normalizeThunderstormAudioIntensity(
            weatherIntensity,
            weatherKind,
            windStrength
          );
          const thunderSeed = createWeatherEventSeed(
            'thunder',
            nowMs,
            tileKind,
            weatherKind,
            thunderIntensity
          );
          const thunderStrike = resolveThunderLightningStrike({
            weatherIntensity,
            weatherKind,
            windStrength,
            seed: thunderSeed,
          });
          const thunderEffect = createProceduralEffect(
            'thunder',
            nowMs,
            tileKind,
            emitter,
            listener,
            getThunderSoundDurationMs(thunderIntensity, thunderStrike.variant),
            resolveThunderIdentityVariant(thunderStrike.variant, yearProgress)
          );
          const weatherAcousticGain = resolveWeatherAcousticGain(
            tileKind,
            weatherKind
          );
          lastThunderAtMs = nowMs;
          sink.play({
            ...thunderEffect,
            startOffsetMs: thunderStrike.delayMs,
            volume:
              thunderEffect.volume *
              getThunderSoundVolume(thunderIntensity, thunderStrike.variant) *
              weatherAcousticGain *
              ambienceDuckingGain,
          });
        }
        if (
          isRainWeatherKind(weatherKind) &&
          nowMs - lastRainAtMs >=
            getRainCadenceMs(
              normalizeWeatherAudioIntensity(weatherIntensity, weatherKind)
            )
        ) {
          const rainIntensity = normalizeWeatherAudioIntensity(
            weatherIntensity,
            weatherKind
          );
          const weatherAcousticGain = resolveWeatherAcousticGain(
            tileKind,
            weatherKind
          );
          const precipitationSurface =
            resolveWeatherPrecipitationSurface(tileKind);
          lastRainAtMs = nowMs;
          play(
            'rain',
            nowMs,
            tileKind,
            emitter,
            listener,
            getRainSoundVolume(rainIntensity, precipitationSurface) *
              weatherAcousticGain *
              ambienceDuckingGain,
            getRainSoundDurationMs(rainIntensity),
            resolveRainIdentityVariant({
              surface: precipitationSurface,
              weatherKind,
              yearProgress,
            })
          );
        }
        const hailIntensity = normalizeHailAudioIntensity(
          weatherIntensity,
          weatherKind
        );
        if (
          isHailWeatherKind(weatherKind) &&
          nowMs - lastHailAtMs >= getHailCadenceMs(hailIntensity)
        ) {
          const hailSurface = resolveHailAudioSurface(tileKind);
          const weatherAcousticGain = resolveWeatherAcousticGain(
            tileKind,
            weatherKind
          );
          lastHailAtMs = nowMs;
          play(
            'hail',
            nowMs,
            tileKind,
            emitter,
            listener,
            getHailSoundVolume(hailIntensity, hailSurface) *
              weatherAcousticGain *
              ambienceDuckingGain,
            getHailSoundDurationMs(hailIntensity),
            hailSurface
          );
        }
        const snowstormIntensity = normalizeSnowstormAudioIntensity(
          weatherIntensity,
          weatherKind,
          windStrength
        );
        if (
          isSnowWeatherKind(weatherKind) &&
          snowstormIntensity >= 0.45 &&
          nowMs - lastSnowstormAtMs >= getSnowstormCadenceMs(snowstormIntensity)
        ) {
          const weatherAcousticGain = resolveWeatherAcousticGain(
            tileKind,
            weatherKind
          );
          lastSnowstormAtMs = nowMs;
          play(
            'snowstorm',
            nowMs,
            tileKind,
            emitter,
            listener,
            getSnowstormSoundVolume(snowstormIntensity) *
              weatherAcousticGain *
              ambienceDuckingGain,
            getSnowstormSoundDurationMs(snowstormIntensity),
            snowstormIntensity >= 0.72 ? 'whiteout' : 'flurries'
          );
        }
        const windAudioIntensity = normalizeWindAudioIntensity(
          windStrength,
          weatherKind
        );
        if (
          shouldPlayWindSound(tileKind, weatherKind, windStrength) &&
          nowMs - lastWindAtMs >= getForestWindCadenceMs(windAudioIntensity)
        ) {
          lastWindAtMs = nowMs;
          const windSurface = resolveWindAudioSurface(tileKind);
          const weatherAcousticGain = resolveWeatherAcousticGain(
            tileKind,
            weatherKind
          );
          play(
            'wind',
            nowMs,
            tileKind,
            emitter,
            listener,
            weatherAcousticGain * ambienceDuckingGain,
            getWindSoundDurationMs(windAudioIntensity),
            resolveSeasonalWindIdentityVariant(
              resolveWindIdentityVariant(
                windSurface,
                weatherKind,
                tileKind,
                windStrength
              ),
              yearProgress,
              weatherKind
            )
          );
        }
      } else {
        lastSteamWhistleSignature = '';
      }

      if (!previousJumping && isJumping) {
        previousJumping = true;
        return;
      }

      if (previousJumping && !isJumping) {
        const landingIdentityVariant = resolveMovementIdentityVariant({
          kind: 'landing',
          tileKind,
          yearProgress,
        });
        play(
          'landing',
          nowMs,
          tileKind,
          emitter,
          listener,
          1,
          getMovementSoundDurationMs(
            'landing',
            getSurfaceAudioProfile(tileKind)
          ),
          landingIdentityVariant
        );
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
      const footstepIdentityVariant = resolveMovementIdentityVariant({
        kind: 'footstep',
        tileKind,
        yearProgress,
      });
      play(
        'footstep',
        nowMs,
        tileKind,
        emitter,
        listener,
        1,
        getMovementSoundDurationMs('footstep', profile),
        footstepIdentityVariant
      );
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

export function shouldPlayWindSound(
  tileKind: SurfaceKind | undefined,
  weatherKind?: string,
  windStrength?: number
): boolean {
  const intensity = normalizeWindAudioIntensity(windStrength, weatherKind);
  const windSurface = resolveWindAudioSurface(tileKind);
  switch (windSurface) {
    case 'canopy':
      return intensity >= 0.3;
    case 'crossdraft':
      return intensity >= 0.38;
    case 'open-air':
    default:
      return isWindWeatherKind(weatherKind) && intensity >= 0.35;
  }
}

export function resolveWindIdentityVariant(
  surface: 'open-air' | 'canopy' | 'crossdraft',
  weatherKind?: string,
  tileKind?: SurfaceKind,
  windStrength?: number
): 'stormfront' | 'canopy' | 'crossdraft' | 'sandstorm' | 'cyclone' {
  const normalizedWindStrength = clampValue(windStrength ?? 0, 0, 1);
  if (
    weatherKind === 'wind' &&
    normalizedWindStrength >= 0.92 &&
    surface !== 'crossdraft'
  ) {
    return 'cyclone';
  }
  if (
    surface === 'open-air' &&
    (tileKind === 'sand' || tileKind === 'shore') &&
    normalizedWindStrength >= 0.58
  ) {
    return 'sandstorm';
  }
  if (surface === 'crossdraft') {
    return 'crossdraft';
  }
  if (surface === 'canopy' && weatherKind !== 'wind') {
    return 'canopy';
  }
  return 'stormfront';
}

export function getForestWindCadenceMs(windStrength: number): number {
  return Math.round(clampValue(2600 - windStrength * 1200, 1200, 2600));
}

export function getThunderCadenceMs(intensity: number): number {
  return Math.round(clampValue(14_000 - intensity * 7_600, 5_600, 14_000));
}

export function getRainCadenceMs(intensity: number): number {
  return Math.round(clampValue(2600 - intensity * 1350, 900, 2600));
}

export function getHailCadenceMs(intensity: number): number {
  return Math.round(clampValue(2200 - intensity * 1100, 760, 2200));
}

export function getSnowstormCadenceMs(intensity: number): number {
  return Math.round(clampValue(3200 - intensity * 1200, 1400, 3200));
}

export function getRainSoundDurationMs(intensity: number): number {
  return Math.round(clampValue(1500 + intensity * 900, 1500, 2400));
}

export function getThunderSoundDurationMs(
  intensity: number,
  variant: WeatherThunderVariant
): number {
  const baseDurationMs =
    variant === 'overhead' ? 2400 : variant === 'near' ? 2900 : 3400;
  return Math.round(clampValue(baseDurationMs + intensity * 760, 2200, 4200));
}

export function getHailSoundDurationMs(intensity: number): number {
  return Math.round(clampValue(720 + intensity * 420, 720, 1240));
}

export function getSnowstormSoundDurationMs(intensity: number): number {
  return Math.round(clampValue(1800 + intensity * 1200, 1800, 3000));
}

export function getRainSoundVolume(
  intensity: number,
  surface: WeatherPrecipitationSurface
): number {
  const clamped = clampValue(intensity, 0, 1);
  const baseVolume = clampValue(0.012 + clamped * 0.018, 0.012, 0.03);
  switch (surface) {
    case 'roof':
      return baseVolume * 0.72;
    case 'leaves':
      return baseVolume * 0.94;
    case 'water':
      return baseVolume * 1.08;
    case 'open':
    default:
      return baseVolume;
  }
}

export function getThunderSoundVolume(
  intensity: number,
  variant: WeatherThunderVariant
): number {
  const clamped = clampValue(intensity, 0, 1);
  const baseVolume = clampValue(0.026 + clamped * 0.018, 0.026, 0.044);
  switch (variant) {
    case 'overhead':
      return baseVolume * 1.18;
    case 'near':
      return baseVolume * 1.02;
    case 'distant':
    default:
      return baseVolume * 0.82;
  }
}

export function getHailSoundVolume(
  intensity: number,
  surface: WeatherHailSurface
): number {
  const clamped = clampValue(intensity, 0, 1);
  const baseVolume = clampValue(0.012 + clamped * 0.014, 0.012, 0.026);
  switch (surface) {
    case 'roof':
      return baseVolume * 1.1;
    case 'rock':
      return baseVolume * 1.06;
    case 'wood':
      return baseVolume * 0.96;
    case 'water':
      return baseVolume * 1.02;
    case 'vegetation':
      return baseVolume * 0.86;
    case 'snow':
      return baseVolume * 0.72;
    case 'open':
    default:
      return baseVolume;
  }
}

export function getSnowstormSoundVolume(intensity: number): number {
  const clamped = clampValue(intensity, 0, 1);
  return clampValue(0.012 + clamped * 0.014, 0.012, 0.026);
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
    case 'snowfield':
      return Math.round(clampValue(3800 - clamped * 900, 2200, 3800));
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
    case 'snowfield':
      return 0.011 + clamped * 0.012;
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
    case 'snowfield':
      return 132 + clamped * 14;
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
    case 'snowfield':
      return 'triangle';
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
    case 'snowfield':
      return 'snowfield-ambience';
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

export function getMovementSoundDurationMs(
  kind: 'footstep' | 'jump' | 'landing' | 'blocked',
  profile: SurfaceAudioProfile
): number {
  switch (kind) {
    case 'jump':
      return Math.round(clampValue(profile.cadenceMs * 0.48, 110, 180));
    case 'landing':
      return Math.round(clampValue(profile.cadenceMs * 0.42, 95, 165));
    case 'blocked':
      return Math.round(clampValue(profile.cadenceMs * 0.38, 85, 145));
    case 'footstep':
    default:
      return Math.round(clampValue(profile.cadenceMs * 0.3, 70, 120));
  }
}

export function getAmbientSoundDurationMs(
  kind: AmbientSoundKind,
  intensity: number | undefined
): number {
  const clamped = clampValue(intensity ?? 0.5, 0, 1);
  switch (kind) {
    case 'river':
      return Math.round(clampValue(1500 + clamped * 420, 1500, 1920));
    case 'forest':
      return Math.round(clampValue(1440 + clamped * 400, 1440, 1840));
    case 'plains':
      return Math.round(clampValue(1380 + clamped * 360, 1380, 1740));
    case 'snowfield':
      return Math.round(clampValue(1720 + clamped * 420, 1720, 2140));
    case 'mountain':
      return Math.round(clampValue(1560 + clamped * 420, 1560, 1980));
    case 'cave':
      return Math.round(clampValue(1620 + clamped * 480, 1620, 2100));
    case 'settlement':
      return Math.round(clampValue(1480 + clamped * 320, 1480, 1800));
    case 'ruins':
      return Math.round(clampValue(1540 + clamped * 360, 1540, 1900));
    case 'ocean':
    default:
      return Math.round(clampValue(1580 + clamped * 420, 1580, 2000));
  }
}

export function getWindSoundDurationMs(
  windStrength: number | undefined
): number {
  const clamped = clampValue(windStrength ?? 0, 0, 1);
  return Math.round(clampValue(520 + clamped * 360, 520, 880));
}

export function getTrainEngineDurationMs(progress: number | undefined): number {
  const clamped =
    typeof progress === 'number'
      ? clampValue(Math.abs(progress - 0.5) * 2, 0, 1)
      : 0.5;
  return Math.round(clampValue(360 + (1 - clamped) * 140, 360, 500));
}

export function getTrainWhistleDurationMs(
  progress: number | undefined
): number {
  const clamped =
    typeof progress === 'number'
      ? clampValue(Math.abs(progress - 0.5) * 2, 0, 1)
      : 1;
  return Math.round(clampValue(760 + clamped * 180, 760, 940));
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

export function getPaddleBoatCalliopeDurationMs(
  progress: number | undefined
): number {
  const normalized =
    typeof progress === 'number' ? ((progress % 1) + 1) % 1 : 0;
  return Math.round(clampValue(980 + normalized * 260, 980, 1240));
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

export function getSteamWhistleDurationMs(
  whistlePhase?: 'arrival' | 'departure'
): number {
  return whistlePhase === 'arrival' ? 1180 : 980;
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

export function getProgressionSoundDurationMs(level?: number): number {
  const normalizedLevel = clampValue(Math.round(level ?? 1), 1, 99);
  return Math.round(clampValue(220 + normalizedLevel * 6, 220, 420));
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
    tileKind === 'door' || family === 'wood'
      ? 212
      : tileKind === 'cave-floor' || family === 'rock'
        ? 134
        : family === 'stone-floor'
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
  if (tileKind === 'door' || family === 'wood') {
    return 'square';
  }
  if (tileKind === 'cave-floor' || family === 'rock') {
    return 'triangle';
  }
  return fallback;
}

function resolveSoundVariationPolicy(kind: SoundEffectKind): {
  frequentWindowMs?: number;
  recognition: 'low' | 'medium' | 'high';
  rareCooldownMs?: number;
  rareEvery?: number;
  rareSlotCount?: number;
} {
  switch (kind) {
    case 'advancement':
    case 'open':
    case 'close':
    case 'train-whistle':
    case 'steam-whistle':
      return {
        frequentWindowMs: 1600,
        recognition: 'high',
      };
    case 'forest-ambience':
    case 'plains-ambience':
    case 'snowfield-ambience':
    case 'mountain-ambience':
    case 'cave-ambience':
    case 'settlement-ambience':
    case 'ruins-ambience':
    case 'ocean':
    case 'river-ambience':
    case 'wind':
    case 'thunder':
      return {
        frequentWindowMs: kind === 'thunder' ? 8000 : 2400,
        recognition: 'low',
        rareCooldownMs: 7_200,
        rareEvery: 5,
        rareSlotCount: 2,
      };
    default:
      return {
        frequentWindowMs: 1200,
        recognition: 'medium',
      };
  }
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
  'snowfield-ambience': 1,
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
  const renderedBufferCache = new Map<string, AudioBuffer>();
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
        renderedBufferCache,
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
  renderedBufferCache: Map<string, AudioBuffer>,
  reverbImpulseCache: Map<string, AudioBuffer>
): ActiveSoundSource[] {
  if (canRenderProceduralSoundToBuffer(effect)) {
    return [
      createActiveSoundSource(
        context,
        effect,
        noiseBufferCache,
        renderedBufferCache,
        reverbImpulseCache
      ),
    ];
  }

  const sources = [
    createActiveSoundSource(
      context,
      effect,
      noiseBufferCache,
      renderedBufferCache,
      reverbImpulseCache
    ),
  ];

  for (const layer of effect.layers ?? []) {
    sources.push(
      createActiveSoundSource(
        context,
        createLayeredSoundEffect(effect, layer),
        noiseBufferCache,
        renderedBufferCache,
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
  renderedBufferCache: Map<string, AudioBuffer>,
  reverbImpulseCache: Map<string, AudioBuffer>
): ActiveSoundSource {
  return {
    source: createScheduledSoundSource(
      context,
      effect,
      noiseBufferCache,
      renderedBufferCache
    ),
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
  noiseBufferCache: Map<string, AudioBuffer>,
  renderedBufferCache: Map<string, AudioBuffer>
): ScheduledSoundSourceNode {
  if (
    canRenderProceduralSoundToBuffer(effect) &&
    typeof context.createBuffer === 'function' &&
    typeof context.createBufferSource === 'function'
  ) {
    const source = context.createBufferSource() as AudioBufferSourceNodeLike;
    source.buffer = getOrCreateRenderedSoundBuffer(
      context,
      effect,
      renderedBufferCache
    );
    return source;
  }

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

function getOrCreateRenderedSoundBuffer(
  context: AudioContext,
  effect: ProceduralSoundEffect,
  renderedBufferCache: Map<string, AudioBuffer>
): AudioBuffer {
  const cacheKey = buildRenderedProceduralSoundBufferKey(
    effect,
    context.sampleRate
  );
  const cached = renderedBufferCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const frameCount = resolveRenderedSoundFrameCount(effect, context.sampleRate);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const channelData = buffer.getChannelData(0);
  const samples = renderProceduralSoundToBufferData(effect, context.sampleRate);
  channelData.set(samples);
  renderedBufferCache.set(cacheKey, buffer);
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
    case 'thunder':
      return 5;
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
    case 'snowfield-ambience':
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
    case 'snowfield-ambience':
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
    case 'thunder':
      return { min: 0.028, max: 0.058 };
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

function createWeatherEventSeed(
  kind: SoundEffectKind,
  nowMs: number,
  tileKind: SurfaceKind | undefined,
  weatherKind: string | undefined,
  intensity: number
): number {
  let seed = SOUND_EFFECT_SEEDS[kind];
  seed = appendHashSeedPart(
    seed,
    SURFACE_AUDIO_FAMILY_SEED_PARTS[getSurfaceAudioFamily(tileKind)]
  );
  seed = appendHashSeedPart(seed, Math.round(nowMs / 1000));
  seed = appendHashSeedPart(seed, Math.round(intensity * 100));
  if (typeof weatherKind === 'string' && weatherKind.length > 0) {
    for (let index = 0; index < weatherKind.length; index += 1) {
      seed = appendHashSeedPart(seed, weatherKind.charCodeAt(index));
    }
  }
  return seed;
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
