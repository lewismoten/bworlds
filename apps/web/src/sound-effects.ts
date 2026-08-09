type ViewModeLike = '2d' | '3d' | 'text';
type SurfaceKind = string;
type SoundEffectKind =
  | 'footstep'
  | 'jump'
  | 'landing'
  | 'blocked'
  | 'open'
  | 'close'
  | 'wind'
  | 'advancement'
  | 'train-engine'
  | 'train-whistle'
  | 'paddle-calliope'
  | 'steam-whistle'
  | 'combat-weapon'
  | 'combat-magic';
type SoundWaveform = OscillatorType;
type SoundPosition = { x: number; y: number };
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

export type ProceduralSoundEffect = {
  kind: SoundEffectKind;
  nowMs: number;
  frequency: number;
  durationMs: number;
  volume: number;
  waveform: SoundWaveform;
  emitter?: SoundPosition;
  listener?: SoundPosition;
};

export type SoundEffectSink = {
  resume?(): void;
  play(effect: ProceduralSoundEffect): void;
  getActiveSourceCount?(): number;
};

export type SoundEffectController = {
  resume(): void;
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
    gainMultiplier: 1 / (1 + distance * 0.85),
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
  let lastTrainEngineAtMs = -Infinity;
  let lastTrainWhistleAtMs = -Infinity;
  let lastPaddleCalliopeAtMs = -Infinity;
  let lastSteamWhistleAtMs = -Infinity;
  let lastSteamWhistleSignature = '';
  let previousJumping = false;
  let footstepVariant = 0;

  function play(
    kind: SoundEffectKind,
    nowMs: number,
    tileKind?: SurfaceKind,
    emitter?: SoundPosition,
    listener?: SoundPosition
  ) {
    const profile = getSurfaceAudioProfile(tileKind);
    const variantOffset = footstepVariant % 2 === 0 ? -8 : 6;
    footstepVariant += 1;
    sink.play({
      kind,
      nowMs,
      frequency:
        kind === 'jump'
          ? profile.footstepFrequency + 72
          : kind === 'wind'
            ? 190 + (tileKind === 'forest' ? 16 : 0) + variantOffset * 0.4
            : kind === 'advancement'
              ? resolveAdvancementFrequency()
              : kind === 'train-engine'
                ? 74 + variantOffset * 0.35
                : kind === 'train-whistle'
                  ? 356 + variantOffset * 0.6
                  : kind === 'paddle-calliope'
                    ? resolvePaddleBoatCalliopeFrequency(undefined)
                    : kind === 'steam-whistle'
                      ? resolveSteamWhistleFrequency()
                      : kind === 'combat-weapon'
                        ? 148 + variantOffset * 0.5
                        : kind === 'combat-magic'
                          ? 244 + variantOffset * 0.5
                          : kind === 'open'
                            ? resolveInteractionFrequency(
                                'open',
                                tileKind,
                                profile,
                                variantOffset
                              )
                            : kind === 'close'
                              ? resolveInteractionFrequency(
                                  'close',
                                  tileKind,
                                  profile,
                                  variantOffset
                                )
                              : kind === 'blocked'
                                ? Math.max(
                                    58,
                                    profile.landingFrequency -
                                      18 +
                                      variantOffset
                                  )
                                : kind === 'landing'
                                  ? profile.landingFrequency + variantOffset
                                  : profile.footstepFrequency + variantOffset,
      durationMs:
        kind === 'jump'
          ? 140
          : kind === 'wind'
            ? 680
            : kind === 'advancement'
              ? 260
              : kind === 'train-engine'
                ? 420
                : kind === 'train-whistle'
                  ? 880
                  : kind === 'paddle-calliope'
                    ? 1180
                    : kind === 'steam-whistle'
                      ? 1050
                      : kind === 'combat-weapon'
                        ? 160
                        : kind === 'combat-magic'
                          ? 320
                          : kind === 'landing'
                            ? 120
                            : kind === 'blocked'
                              ? 105
                              : kind === 'open' || kind === 'close'
                                ? 135
                                : 90,
      volume:
        kind === 'jump'
          ? profile.footstepVolume * 1.2
          : kind === 'wind'
            ? 0.018
            : kind === 'advancement'
              ? 0.052
              : kind === 'train-engine'
                ? 0.03
                : kind === 'train-whistle'
                  ? 0.042
                  : kind === 'paddle-calliope'
                    ? 0.034
                    : kind === 'steam-whistle'
                      ? 0.048
                      : kind === 'combat-weapon'
                        ? 0.056
                        : kind === 'combat-magic'
                          ? 0.05
                          : kind === 'open' || kind === 'close'
                            ? profile.landingVolume * 0.8
                            : kind === 'blocked'
                              ? profile.landingVolume * 0.7
                              : kind === 'landing'
                                ? profile.landingVolume
                                : profile.footstepVolume,
      waveform:
        kind === 'blocked'
          ? 'sawtooth'
          : kind === 'wind'
            ? 'triangle'
            : kind === 'advancement'
              ? 'sine'
              : kind === 'train-engine'
                ? 'sawtooth'
                : kind === 'train-whistle'
                  ? 'square'
                  : kind === 'paddle-calliope'
                    ? 'triangle'
                    : kind === 'steam-whistle'
                      ? 'square'
                      : kind === 'combat-weapon'
                        ? 'sawtooth'
                        : kind === 'combat-magic'
                          ? 'triangle'
                          : kind === 'open' || kind === 'close'
                            ? resolveInteractionWaveform(
                                tileKind,
                                profile.waveform
                              )
                            : profile.waveform,
      emitter,
      listener,
    });
  }

  return {
    resume() {
      sink.resume?.();
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
      tileKind,
      weatherKind,
      weatherIntensity,
      windStrength,
      nearbyTrain,
      nearbyPaddleBoat,
      emitter,
      listener,
    }) {
      if (viewMode !== '3d') {
        previousJumping = isJumping;
        return;
      }

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
          nearbyTrain.listener ?? listener
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
          volume: 0.034,
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

      if (
        shouldPlayForestWindSound(tileKind, weatherKind, windStrength) &&
        nowMs - lastWindAtMs >=
          getForestWindCadenceMs(windStrength ?? weatherIntensity ?? 0)
      ) {
        lastWindAtMs = nowMs;
        play('wind', nowMs, tileKind, emitter, listener);
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

export function createWebAudioSoundEffectSink(): SoundEffectSink {
  let audioContext: AudioContext | null = null;
  let activeSourceCount = 0;

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
      const spatialMix = getSoundSpatialMix(effect.emitter, effect.listener);
      const startAt = context.currentTime;
      const durationSeconds = effect.durationMs / 1000;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const panner =
        typeof context.createStereoPanner === 'function'
          ? context.createStereoPanner()
          : null;
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
        effect.volume * spatialMix.gainMultiplier,
        startAt + durationSeconds * 0.2
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSeconds);
      oscillator.connect(gain);
      if (panner) {
        panner.pan.setValueAtTime(spatialMix.pan, startAt);
        gain.connect(panner);
        panner.connect(context.destination);
      } else {
        gain.connect(context.destination);
      }
      activeSourceCount += 1;
      oscillator.onended = () => {
        activeSourceCount = Math.max(0, activeSourceCount - 1);
      };
      oscillator.start(startAt);
      oscillator.stop(startAt + durationSeconds);
    },
    getActiveSourceCount() {
      return activeSourceCount;
    },
  };
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
