type ViewModeLike = '2d' | '3d' | 'text';
type SurfaceKind = string;
type SoundEffectKind = 'footstep' | 'jump' | 'landing' | 'blocked';
type SoundWaveform = OscillatorType;

export type ProceduralSoundEffect = {
  kind: SoundEffectKind;
  nowMs: number;
  frequency: number;
  durationMs: number;
  volume: number;
  waveform: SoundWaveform;
};

export type SoundEffectSink = {
  resume?(): void;
  play(effect: ProceduralSoundEffect): void;
};

export type SoundEffectController = {
  resume(): void;
  triggerJump(options: { nowMs: number; tileKind?: SurfaceKind }): void;
  triggerBlockedMovement(options: { nowMs: number; tileKind?: SurfaceKind }): void;
  update(options: {
    nowMs: number;
    walking: boolean;
    isJumping: boolean;
    viewMode: ViewModeLike;
    tileKind?: SurfaceKind;
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

const DEFAULT_SURFACE_PROFILE: SurfaceAudioProfile = {
  cadenceMs: 310,
  footstepFrequency: 122,
  landingFrequency: 92,
  footstepVolume: 0.045,
  landingVolume: 0.065,
  waveform: 'triangle',
};

const SURFACE_AUDIO_PROFILES: Record<string, SurfaceAudioProfile> = {
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
  caveFloor: {
    cadenceMs: 330,
    footstepFrequency: 108,
    landingFrequency: 82,
    footstepVolume: 0.048,
    landingVolume: 0.072,
    waveform: 'triangle',
  },
};

export function getSurfaceAudioProfile(
  tileKind: SurfaceKind | undefined
): SurfaceAudioProfile {
  if (!tileKind) {
    return DEFAULT_SURFACE_PROFILE;
  }
  if (tileKind === 'cave-floor' || tileKind === 'cave-mushrooms') {
    return SURFACE_AUDIO_PROFILES.caveFloor;
  }
  return SURFACE_AUDIO_PROFILES[tileKind] ?? DEFAULT_SURFACE_PROFILE;
}

export function createSoundEffectController(
  sink: SoundEffectSink
): SoundEffectController {
  let lastFootstepAtMs = -Infinity;
  let lastJumpAtMs = -Infinity;
  let lastBlockedAtMs = -Infinity;
  let previousJumping = false;
  let footstepVariant = 0;

  function play(kind: SoundEffectKind, nowMs: number, tileKind?: SurfaceKind) {
    const profile = getSurfaceAudioProfile(tileKind);
    const variantOffset = footstepVariant % 2 === 0 ? -8 : 6;
    footstepVariant += 1;
    sink.play({
      kind,
      nowMs,
      frequency:
        kind === 'jump'
          ? profile.footstepFrequency + 72
          : kind === 'blocked'
            ? Math.max(58, profile.landingFrequency - 18 + variantOffset)
          : kind === 'landing'
            ? profile.landingFrequency + variantOffset
            : profile.footstepFrequency + variantOffset,
      durationMs:
        kind === 'jump' ? 140 : kind === 'landing' ? 120 : kind === 'blocked' ? 105 : 90,
      volume:
        kind === 'jump'
          ? profile.footstepVolume * 1.2
          : kind === 'blocked'
            ? profile.landingVolume * 0.7
          : kind === 'landing'
            ? profile.landingVolume
            : profile.footstepVolume,
      waveform: kind === 'blocked' ? 'sawtooth' : profile.waveform,
    });
  }

  return {
    resume() {
      sink.resume?.();
    },
    triggerJump({ nowMs, tileKind }) {
      if (nowMs - lastJumpAtMs < 120) {
        return;
      }
      lastJumpAtMs = nowMs;
      play('jump', nowMs, tileKind);
    },
    triggerBlockedMovement({ nowMs, tileKind }) {
      if (!shouldPlayBlockedMovementSound(tileKind)) {
        return;
      }
      if (nowMs - lastBlockedAtMs < 180) {
        return;
      }
      lastBlockedAtMs = nowMs;
      play('blocked', nowMs, tileKind);
    },
    update({ nowMs, walking, isJumping, viewMode, tileKind }) {
      if (viewMode !== '3d') {
        previousJumping = isJumping;
        return;
      }

      if (!previousJumping && isJumping) {
        previousJumping = true;
        return;
      }

      if (previousJumping && !isJumping) {
        play('landing', nowMs, tileKind);
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
      play('footstep', nowMs, tileKind);
    },
  };
}

export function shouldPlayBlockedMovementSound(
  tileKind: SurfaceKind | undefined
): boolean {
  return tileKind === 'forest';
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
      const startAt = context.currentTime;
      const durationSeconds = effect.durationMs / 1000;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
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
        effect.volume,
        startAt + durationSeconds * 0.2
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        startAt + durationSeconds
      );
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + durationSeconds);
    },
  };
}
