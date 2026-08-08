type ViewModeLike = '2d' | '3d' | 'text';
type SurfaceKind = string;
type SoundEffectKind =
  | 'footstep'
  | 'jump'
  | 'landing'
  | 'blocked'
  | 'open'
  | 'close';
type SoundWaveform = OscillatorType;
type SoundPosition = { x: number; y: number };
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
};

export type SoundEffectController = {
  resume(): void;
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
  update(options: {
    nowMs: number;
    walking: boolean;
    isJumping: boolean;
    viewMode: ViewModeLike;
    tileKind?: SurfaceKind;
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

const SURFACE_AUDIO_PROFILES: Record<SurfaceAudioFamily, SurfaceAudioProfile> = {
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
  if (tileKind === 'floor' || tileKind === 'shop' || tileKind === 'stairsUp' || tileKind === 'stairsDown') {
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
  let lastInteractionAtMs = -Infinity;
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
          : kind === 'open'
            ? resolveInteractionFrequency('open', tileKind, profile, variantOffset)
          : kind === 'close'
            ? resolveInteractionFrequency('close', tileKind, profile, variantOffset)
          : kind === 'blocked'
            ? Math.max(58, profile.landingFrequency - 18 + variantOffset)
          : kind === 'landing'
            ? profile.landingFrequency + variantOffset
            : profile.footstepFrequency + variantOffset,
      durationMs:
        kind === 'jump'
          ? 140
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
          : kind === 'open' || kind === 'close'
            ? resolveInteractionWaveform(tileKind, profile.waveform)
            : profile.waveform,
      emitter,
      listener,
    });
  }

  return {
    resume() {
      sink.resume?.();
    },
    triggerInteraction({ nowMs, event, tileKind, emitter, listener }) {
      if (nowMs - lastInteractionAtMs < 90) {
        return;
      }
      lastInteractionAtMs = nowMs;
      play(event, nowMs, tileKind, emitter, listener);
    },
    triggerJump({ nowMs, tileKind, emitter, listener }) {
      if (nowMs - lastJumpAtMs < 120) {
        return;
      }
      lastJumpAtMs = nowMs;
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
      play('blocked', nowMs, tileKind, emitter, listener);
    },
    update({ nowMs, walking, isJumping, viewMode, tileKind, emitter, listener }) {
      if (viewMode !== '3d') {
        previousJumping = isJumping;
        return;
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

type AudioContextCtor = new () => AudioContext;

export function createWebAudioSoundEffectSink(): SoundEffectSink {
  let audioContext: AudioContext | null = null;

  function getAudioContext(): AudioContext | null {
    if (audioContext) {
      return audioContext;
    }
    const globalCtor = globalThis as {
      AudioContext?: AudioContextCtor;
      webkitAudioContext?: AudioContextCtor;
    };
    const ContextCtor = globalCtor.AudioContext ?? globalCtor.webkitAudioContext;
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
      const panner = typeof context.createStereoPanner === 'function'
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
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(
        effect.volume * spatialMix.gainMultiplier,
        startAt + durationSeconds * 0.2
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        startAt + durationSeconds
      );
      oscillator.connect(gain);
      if (panner) {
        panner.pan.setValueAtTime(spatialMix.pan, startAt);
        gain.connect(panner);
        panner.connect(context.destination);
      } else {
        gain.connect(context.destination);
      }
      oscillator.start(startAt);
      oscillator.stop(startAt + durationSeconds);
    },
  };
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
