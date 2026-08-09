import { describe, expect, it, vi } from 'vitest';
import {
  createSoundEffectController,
  createWebAudioSoundEffectSink,
  getCombatSoundCadenceMs,
  getCombatSoundDurationMs,
  getCombatSoundVolume,
  getForestWindCadenceMs,
  getAmbientSoundDurationMs,
  getPaddleBoatCalliopeCadenceMs,
  getPaddleBoatCalliopeDurationMs,
  getProgressionSoundDurationMs,
  normalizeSoundEffectVolume,
  resolveAmbienceDuckingGain,
  resolvePriorityDynamicRangeGain,
  resolveSoundEffectVolumeBounds,
  getSurfaceAudioFamily,
  getMovementSoundDurationMs,
  getSurfaceAudioProfile,
  getSoundSpatialMix,
  getSteamWhistleDurationMs,
  getTrainEngineDurationMs,
  getTrainWhistleDurationMs,
  getWindSoundDurationMs,
  isMagicCombatStyle,
  resolveCombatSoundFrequency,
  resolveCombatSoundWaveform,
  resolvePaddleBoatCalliopeFrequency,
  resolveSteamWhistleFrequency,
  getTrainEngineCadenceMs,
  shouldPlayBlockedMovementSound,
  shouldPlayForestWindSound,
  shouldPlaySteamWhistle,
  shouldPlayTrainWhistle,
  type ProceduralSoundEffect,
} from './sound-effects.ts';

describe('sound effects', () => {
  it('tracks active web audio sound sources while effects are still playing', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      finish(): void;
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          finish() {
            this.onended?.(new Event('ended'));
          },
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      sink.play({
        kind: 'jump',
        nowMs: 0,
        frequency: 440,
        durationMs: 120,
        volume: 0.05,
        waveform: 'sine',
      });

      expect(sink.getActiveSourceCount?.()).toBe(1);
      createdOscillators[0]?.finish();
      expect(sink.getActiveSourceCount?.()).toBe(0);
      expect(createdOscillators[0]?.disconnect).toHaveBeenCalled();
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('can stop all active web audio sound sources early when audio becomes inactive', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      stop: ReturnType<typeof vi.fn>;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      type: string;
      start: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 2;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          stop: vi.fn(),
          connect: vi.fn(),
          disconnect: vi.fn(),
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          type: 'sine',
          start: vi.fn(),
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      sink.play({
        kind: 'jump',
        nowMs: 0,
        frequency: 440,
        durationMs: 120,
        volume: 0.05,
        waveform: 'sine',
      });

      sink.stopAll?.();

      expect(sink.getActiveSourceCount?.()).toBe(0);
      expect(createdOscillators[0]?.stop).toHaveBeenCalledWith(2);
      expect(createdOscillators[0]?.disconnect).toHaveBeenCalled();
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('renders noise-tagged effects through audio buffers for textured ambience', () => {
    const createdBufferSources: Array<{
      buffer: unknown;
      onended: ((event: Event) => void) | null;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];
    const createdOscillators: Array<unknown> = [];
    const createdBuffers: Array<{
      getChannelData: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      sampleRate = 48_000;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createBuffer(_channels: number, length: number) {
        const channel = new Float32Array(length);
        const buffer = {
          getChannelData: vi.fn(() => channel),
        };
        createdBuffers.push(buffer);
        return buffer as unknown as AudioBuffer;
      }
      createBufferSource() {
        const source = {
          buffer: null,
          onended: null as ((event: Event) => void) | null,
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdBufferSources.push(source);
        return source as unknown as AudioBufferSourceNode;
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      sink.play({
        kind: 'wind',
        nowMs: 0,
        frequency: 180,
        durationMs: 680,
        volume: 0.018,
        waveform: 'triangle',
        noiseColor: 'brown',
        seed: 17,
      });

      expect(createdBufferSources).toHaveLength(1);
      expect(createdBuffers).toHaveLength(1);
      expect(createdBufferSources[0]?.buffer).toBeTruthy();
      expect(createdBufferSources[0]?.start).toHaveBeenCalled();
      expect(createdOscillators).toHaveLength(0);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('renders layered effects through both oscillator and noise sources', () => {
    const createdBufferSources: Array<{
      buffer: unknown;
      onended: ((event: Event) => void) | null;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      sampleRate = 48_000;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createBuffer(_channels: number, length: number) {
        const channel = new Float32Array(length);
        return {
          getChannelData: vi.fn(() => channel),
        } as unknown as AudioBuffer;
      }
      createBufferSource() {
        const source = {
          buffer: null,
          onended: null as ((event: Event) => void) | null,
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdBufferSources.push(source);
        return source as unknown as AudioBufferSourceNode;
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      sink.play({
        kind: 'forest-ambience',
        nowMs: 0,
        frequency: 180,
        durationMs: 1600,
        volume: 0.018,
        waveform: 'triangle',
        pitchEnvelope: {
          attackMs: 20,
          decayMs: 80,
          peakMultiplier: 1.06,
          sustainMultiplier: 0.98,
          releaseMs: 90,
          releaseTargetMultiplier: 0.94,
        },
        layers: [
          {
            id: 'noise-bed',
            startOffsetMs: 80,
            frequency: 140,
            durationMs: 1600,
            volume: 0.009,
            waveform: 'triangle',
            noiseColor: 'pink',
          },
        ],
      });

      expect(createdOscillators).toHaveLength(1);
      expect(createdBufferSources).toHaveLength(1);
      expect(createdOscillators[0]?.start).toHaveBeenCalledWith(0);
      expect(createdBufferSources[0]?.start).toHaveBeenCalledWith(0.08);
      expect(createdBufferSources[0]?.stop).toHaveBeenCalledWith(
        expect.closeTo(1.68, 10)
      );
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('reuses rendered audio buffers for eligible layered procedural sounds', () => {
    const createdBufferSources: Array<{
      buffer: unknown;
      onended: ((event: Event) => void) | null;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];
    const createdBuffers: Array<{
      getChannelData: ReturnType<typeof vi.fn>;
    }> = [];
    const createdOscillators: Array<unknown> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      sampleRate = 48_000;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createBuffer(_channels: number, length: number) {
        const channel = new Float32Array(length);
        const buffer = {
          getChannelData: vi.fn(() => channel),
        };
        createdBuffers.push(buffer);
        return buffer as unknown as AudioBuffer;
      }
      createBufferSource() {
        const source = {
          buffer: null,
          onended: null as ((event: Event) => void) | null,
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdBufferSources.push(source);
        return source as unknown as AudioBufferSourceNode;
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      const effect: ProceduralSoundEffect = {
        kind: 'forest-ambience',
        nowMs: 0,
        frequency: 220,
        durationMs: 180,
        volume: 0.05,
        waveform: 'triangle',
        seed: 17,
        envelope: {
          attackMs: 6,
          decayMs: 30,
          sustainLevel: 0.52,
          releaseMs: 40,
        },
        layers: [
          {
            id: 'noise-bed',
            startOffsetMs: 24,
            frequency: 140,
            durationMs: 160,
            volume: 0.018,
            waveform: 'triangle',
            noiseColor: 'pink',
          },
        ],
      };

      sink.play(effect);
      sink.play(effect);

      expect(createdBuffers).toHaveLength(1);
      expect(createdBufferSources).toHaveLength(2);
      expect(createdBufferSources[0]?.buffer).toBe(
        createdBufferSources[1]?.buffer
      );
      expect(createdOscillators).toHaveLength(0);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('keeps dynamic modulation effects on the live oscillator path', () => {
    const createdBufferSources: Array<unknown> = [];
    const createdBuffers: Array<unknown> = [];
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      sampleRate = 48_000;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createBuffer(_channels: number, length: number) {
        const channel = new Float32Array(length);
        const buffer = {
          getChannelData: vi.fn(() => channel),
        };
        createdBuffers.push(buffer);
        return buffer as unknown as AudioBuffer;
      }
      createBufferSource() {
        const source = {
          buffer: null,
          onended: null as ((event: Event) => void) | null,
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdBufferSources.push(source);
        return source as unknown as AudioBufferSourceNode;
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      sink.play({
        kind: 'wind',
        nowMs: 0,
        frequency: 180,
        durationMs: 680,
        volume: 0.018,
        waveform: 'triangle',
        tremolo: {
          rateHz: 4.2,
          depth: 0.28,
          waveform: 'sine',
        },
      });

      expect(createdOscillators.length).toBeGreaterThan(0);
      expect(createdBufferSources).toHaveLength(0);
      expect(createdBuffers).toHaveLength(0);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('applies declared frequency sweeps to oscillator-backed effects', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      sink.play({
        kind: 'combat-magic',
        nowMs: 0,
        frequency: 244,
        durationMs: 320,
        volume: 0.05,
        waveform: 'triangle',
        sweeps: [
          {
            curve: 'linear',
            targetMultiplier: 1.18,
            atProgress: 0.3,
          },
          {
            curve: 'linear',
            targetMultiplier: 0.86,
            atProgress: 1,
          },
        ],
      });

      const oscillator = createdOscillators[0];
      expect(oscillator?.frequency.setValueAtTime).toHaveBeenCalledWith(244, 0);
      expect(
        oscillator?.frequency.linearRampToValueAtTime
      ).toHaveBeenNthCalledWith(1, 244 * 1.18, 0.096);
      expect(
        oscillator?.frequency.linearRampToValueAtTime
      ).toHaveBeenNthCalledWith(2, 244 * 0.86, 0.32);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('applies configured ADSR envelopes to oscillator-backed effects', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];
    const createdGains: Array<{
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createGain() {
        const gain = {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdGains.push(gain);
        return gain as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      sink.play({
        kind: 'jump',
        nowMs: 0,
        frequency: 220,
        durationMs: 140,
        volume: 0.05,
        waveform: 'triangle',
        envelope: {
          attackMs: 8,
          decayMs: 36,
          sustainLevel: 0.52,
          releaseMs: 28,
        },
      });

      const sourceGain = createdGains[1];
      expect(sourceGain?.gain.setValueAtTime).toHaveBeenNthCalledWith(
        1,
        0.0001,
        0
      );
      expect(
        sourceGain?.gain.exponentialRampToValueAtTime
      ).toHaveBeenNthCalledWith(1, 0.05, 0.008);
      expect(
        sourceGain?.gain.exponentialRampToValueAtTime.mock.calls[1]
      ).toEqual([expect.closeTo(0.026, 10), 0.044]);
      expect(sourceGain?.gain.setValueAtTime.mock.calls[1]).toEqual([
        expect.closeTo(0.026, 10),
        0.11200000000000002,
      ]);
      expect(
        sourceGain?.gain.exponentialRampToValueAtTime
      ).toHaveBeenNthCalledWith(3, 0.0001, 0.14);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('applies configured pitch envelopes independently from gain envelopes', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];
    const createdGains: Array<{
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createGain() {
        const gain = {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdGains.push(gain);
        return gain as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      sink.play({
        kind: 'combat-magic',
        nowMs: 0,
        frequency: 244,
        durationMs: 320,
        volume: 0.05,
        waveform: 'triangle',
        envelope: {
          attackMs: 12,
          decayMs: 54,
          sustainLevel: 0.62,
          releaseMs: 68,
        },
        pitchEnvelope: {
          attackMs: 18,
          decayMs: 44,
          peakMultiplier: 1.05,
          sustainMultiplier: 0.94,
          releaseMs: 62,
          releaseTargetMultiplier: 0.9,
        },
      });

      const oscillator = createdOscillators[0];
      expect(
        oscillator?.frequency.linearRampToValueAtTime.mock.calls
      ).toContainEqual([expect.closeTo(244 * 1.05, 10), 0.018]);
      expect(
        oscillator?.frequency.linearRampToValueAtTime.mock.calls
      ).toContainEqual([expect.closeTo(244 * 0.94, 10), 0.062]);
      expect(
        oscillator?.frequency.linearRampToValueAtTime.mock.calls
      ).toContainEqual([expect.closeTo(244 * 0.9, 10), 0.32]);

      const sourceGain = createdGains[1];
      expect(
        sourceGain?.gain.exponentialRampToValueAtTime
      ).toHaveBeenNthCalledWith(1, 0.05, 0.012);
      expect(
        sourceGain?.gain.exponentialRampToValueAtTime.mock.calls[1]
      ).toEqual([expect.closeTo(0.031, 10), 0.066]);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('routes procedural sound effects through configured biquad filters', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];
    const createdFilters: Array<{
      type: BiquadFilterType;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
      };
      Q: {
        setValueAtTime: ReturnType<typeof vi.fn>;
      };
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];
    const createdGains: Array<{
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createBiquadFilter() {
        const filter = {
          type: 'lowpass' as BiquadFilterType,
          frequency: {
            setValueAtTime: vi.fn(),
          },
          Q: {
            setValueAtTime: vi.fn(),
          },
          gain: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdFilters.push(filter);
        return filter as unknown as BiquadFilterNode;
      }
      createGain() {
        const gain = {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdGains.push(gain);
        return gain as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      sink.play({
        kind: 'combat-magic',
        nowMs: 0,
        frequency: 244,
        durationMs: 320,
        volume: 0.05,
        waveform: 'triangle',
        filters: [
          {
            type: 'highpass',
            frequency: 380,
            q: 0.7,
          },
          {
            type: 'notch',
            frequency: 1420,
            q: 2.2,
            gain: -3,
          },
        ],
      });

      expect(createdFilters).toHaveLength(2);
      expect(createdFilters[0]?.type).toBe('highpass');
      expect(createdFilters[0]?.frequency.setValueAtTime).toHaveBeenCalledWith(
        380,
        0
      );
      expect(createdFilters[0]?.Q.setValueAtTime).toHaveBeenCalledWith(0.7, 0);
      expect(createdFilters[1]?.type).toBe('notch');
      expect(createdFilters[1]?.gain.setValueAtTime).toHaveBeenCalledWith(
        -3,
        0
      );
      expect(createdOscillators[0]?.connect).toHaveBeenCalledWith(
        createdFilters[0]
      );
      expect(createdFilters[0]?.connect).toHaveBeenCalledWith(
        createdFilters[1]
      );

      const sourceGain = createdGains[1];
      expect(createdFilters[1]?.connect).toHaveBeenCalledWith(sourceGain);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('applies filter envelopes independently from oscillator pitch and gain envelopes', () => {
    const createdFilters: Array<{
      type: BiquadFilterType;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      Q: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          onended: null as ((event: Event) => void) | null,
          type: 'triangle',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        } as unknown as OscillatorNode;
      }
      createBiquadFilter() {
        const filter = {
          type: 'bandpass' as BiquadFilterType,
          frequency: {
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          Q: {
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          gain: {
            setValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdFilters.push(filter);
        return filter as unknown as BiquadFilterNode;
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      sink.play({
        kind: 'combat-magic',
        nowMs: 0,
        frequency: 244,
        durationMs: 320,
        volume: 0.05,
        waveform: 'triangle',
        filters: [
          {
            type: 'bandpass',
            frequency: 1420,
            q: 1.1,
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
        ],
      });

      const filter = createdFilters[0];
      expect(
        filter?.frequency.linearRampToValueAtTime.mock.calls
      ).toContainEqual([expect.closeTo(1420 * 1.16, 10), 0.018]);
      expect(
        filter?.frequency.linearRampToValueAtTime.mock.calls
      ).toContainEqual([expect.closeTo(1420 * 0.92, 10), 0.062]);
      expect(
        filter?.frequency.linearRampToValueAtTime.mock.calls
      ).toContainEqual([expect.closeTo(1420 * 0.82, 10), 0.32]);
      expect(filter?.Q.linearRampToValueAtTime.mock.calls).toContainEqual([
        expect.closeTo(1.1 * 1.18, 10),
        0.018,
      ]);
      expect(filter?.Q.linearRampToValueAtTime.mock.calls).toContainEqual([
        expect.closeTo(1.1 * 1.05, 10),
        0.062,
      ]);
      expect(filter?.Q.linearRampToValueAtTime.mock.calls).toContainEqual([
        expect.closeTo(1.1 * 0.9, 10),
        0.32,
      ]);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('routes procedural sound effects through configured distortion stages', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];
    const createdWaveShapers: Array<{
      curve: Float32Array | null;
      oversample?: OverSampleType;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];
    const createdGains: Array<{
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createWaveShaper() {
        const waveShaper = {
          curve: null,
          oversample: 'none' as OverSampleType,
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdWaveShapers.push(waveShaper);
        return waveShaper as unknown as WaveShaperNode;
      }
      createGain() {
        const gain = {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdGains.push(gain);
        return gain as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      sink.play({
        kind: 'combat-weapon',
        nowMs: 0,
        frequency: 210,
        durationMs: 160,
        volume: 0.056,
        waveform: 'sawtooth',
        distortion: {
          mode: 'distortion',
          amount: 0.42,
          outputGain: 0.76,
        },
      });

      expect(createdWaveShapers).toHaveLength(1);
      expect(createdWaveShapers[0]?.curve).toBeInstanceOf(Float32Array);
      expect(createdWaveShapers[0]?.curve?.length).toBe(256);
      expect(createdWaveShapers[0]?.oversample).toBe('2x');
      expect(createdOscillators[0]?.connect).toHaveBeenCalledWith(
        createdGains[1]
      );
      expect(createdGains[1]?.connect).toHaveBeenCalledWith(
        createdWaveShapers[0]
      );
      expect(createdWaveShapers[0]?.connect).toHaveBeenCalledWith(
        createdGains[2]
      );
      expect(createdGains[2]?.gain.setValueAtTime).toHaveBeenCalledWith(
        0.76,
        0
      );
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('routes procedural sound effects through configured delay and echo stages', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];
    const createdDelays: Array<{
      delayTime: {
        setValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];
    const createdGains: Array<{
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createDelay() {
        const delay = {
          delayTime: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdDelays.push(delay);
        return delay as unknown as DelayNode;
      }
      createGain() {
        const gain = {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdGains.push(gain);
        return gain as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      sink.play({
        kind: 'combat-magic',
        nowMs: 0,
        frequency: 244,
        durationMs: 320,
        volume: 0.05,
        waveform: 'triangle',
        delay: {
          timeMs: 118,
          feedback: 0.32,
          mix: 0.24,
        },
      });

      expect(createdDelays).toHaveLength(1);
      expect(createdDelays[0]?.delayTime.setValueAtTime).toHaveBeenCalledWith(
        0.118,
        0
      );
      expect(createdOscillators[0]?.connect).toHaveBeenCalledTimes(2);
      expect(createdOscillators[0]?.connect.mock.calls).toContainEqual([
        createdDelays[0],
      ]);
      expect(
        createdOscillators[0]?.connect.mock.calls.some(
          (call) => call[0] !== createdDelays[0]
        )
      ).toBe(true);
      expect(
        createdGains.some((gain) =>
          gain.connect.mock.calls.some((call) => call[0] === createdDelays[0])
        )
      ).toBe(true);
      const wetGain = createdGains.find((gain) =>
        gain.gain.setValueAtTime.mock.calls.some(
          (call) => call[0] === 0.24 && call[1] === 0
        )
      );
      const feedbackGain = createdGains.find((gain) =>
        gain.gain.setValueAtTime.mock.calls.some(
          (call) => call[0] === 0.32 && call[1] === 0
        )
      );

      expect(wetGain).toBeDefined();
      expect(feedbackGain).toBeDefined();
      expect(createdDelays[0]?.connect.mock.calls).toContainEqual([wetGain]);
      expect(createdDelays[0]?.connect.mock.calls).toContainEqual([
        feedbackGain,
      ]);
      expect(feedbackGain?.connect).toHaveBeenCalledWith(createdDelays[0]);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('routes procedural sound effects through configured reverb stages', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];
    const createdConvolvers: Array<{
      buffer: unknown;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];
    const createdDelays: Array<{
      delayTime: {
        setValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];
    const createdFilters: Array<{
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
      };
      Q: {
        setValueAtTime: ReturnType<typeof vi.fn>;
      };
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];
    const createdGains: Array<{
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];
    const createdBuffers: Array<{
      getChannelData: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      sampleRate = 48_000;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createBuffer(_channels: number, length: number) {
        const channel = new Float32Array(length);
        const buffer = {
          getChannelData: vi.fn(() => channel),
        };
        createdBuffers.push(buffer);
        return buffer as unknown as AudioBuffer;
      }
      createConvolver() {
        const convolver = {
          buffer: null,
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdConvolvers.push(convolver);
        return convolver as unknown as ConvolverNode;
      }
      createDelay() {
        const delay = {
          delayTime: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdDelays.push(delay);
        return delay as unknown as DelayNode;
      }
      createBiquadFilter() {
        const filter = {
          type: 'lowpass',
          frequency: {
            setValueAtTime: vi.fn(),
          },
          Q: {
            setValueAtTime: vi.fn(),
          },
          gain: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdFilters.push(filter);
        return filter as unknown as BiquadFilterNode;
      }
      createGain() {
        const gain = {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdGains.push(gain);
        return gain as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      sink.play({
        kind: 'cave-ambience',
        nowMs: 0,
        frequency: 118,
        durationMs: 1680,
        volume: 0.022,
        waveform: 'sine',
        seed: 13,
        reverb: {
          profileId: 'cavern-chamber',
          decayMs: 1480,
          mix: 0.34,
          preDelayMs: 24,
          toneHz: 3200,
        },
      });

      expect(createdConvolvers).toHaveLength(1);
      expect(createdBuffers).toHaveLength(1);
      expect(createdConvolvers[0]?.buffer).toBeTruthy();
      expect(createdDelays).toHaveLength(1);
      expect(createdDelays[0]?.delayTime.setValueAtTime).toHaveBeenCalledWith(
        0.024,
        0
      );
      expect(createdFilters).toHaveLength(1);
      expect(createdFilters[0]?.type).toBe('lowpass');
      expect(createdFilters[0]?.frequency.setValueAtTime).toHaveBeenCalledWith(
        3200,
        0
      );
      expect(createdFilters[0]?.Q.setValueAtTime).toHaveBeenCalledWith(0.7, 0);
      const wetGain = createdGains.find((gain) =>
        gain.gain.setValueAtTime.mock.calls.some(
          (call) => call[0] === 0.34 && call[1] === 0
        )
      );
      expect(wetGain).toBeDefined();
      expect(createdOscillators[0]?.connect).toHaveBeenCalledTimes(2);
      expect(createdOscillators[0]?.connect.mock.calls).toContainEqual([
        createdDelays[0],
      ]);
      expect(
        createdOscillators[0]?.connect.mock.calls.some(
          (call) => call[0] !== createdDelays[0]
        )
      ).toBe(true);
      expect(createdDelays[0]?.connect).toHaveBeenCalledWith(
        createdConvolvers[0]
      );
      expect(createdConvolvers[0]?.connect).toHaveBeenCalledWith(
        createdFilters[0]
      );
      expect(createdFilters[0]?.connect).toHaveBeenCalledWith(wetGain);
      expect(wetGain?.connect).toHaveBeenCalled();
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('routes procedural sound effects through tremolo amplitude modulation', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];
    const createdGains: Array<{
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createGain() {
        const gain = {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdGains.push(gain);
        return gain as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      sink.play({
        kind: 'wind',
        nowMs: 0,
        frequency: 180,
        durationMs: 680,
        volume: 0.018,
        waveform: 'triangle',
        tremolo: {
          rateHz: 4.2,
          depth: 0.28,
          waveform: 'sine',
        },
      });

      expect(createdOscillators).toHaveLength(2);
      const sourceOscillator = createdOscillators[0];
      const tremoloOscillator = createdOscillators[1];
      expect(tremoloOscillator?.type).toBe('sine');
      expect(tremoloOscillator?.frequency.setValueAtTime).toHaveBeenCalledWith(
        4.2,
        0
      );
      expect(tremoloOscillator?.start).toHaveBeenCalledWith(0);
      expect(tremoloOscillator?.stop).toHaveBeenCalledWith(0.68);
      const depthGain = createdGains.find((gain) =>
        gain.gain.setValueAtTime.mock.calls.some(
          (call) => call[0] === 0.14 && call[1] === 0
        )
      );
      const tremoloOutput = createdGains.find((gain) =>
        gain.gain.setValueAtTime.mock.calls.some(
          (call) => call[0] === 0.86 && call[1] === 0
        )
      );

      expect(depthGain).toBeDefined();
      expect(tremoloOutput).toBeDefined();
      expect(tremoloOscillator?.connect).toHaveBeenCalledWith(depthGain);
      expect(depthGain?.connect).toHaveBeenCalledWith(tremoloOutput?.gain);
      expect(sourceOscillator?.connect).toHaveBeenCalledWith(tremoloOutput);
      expect(tremoloOutput?.connect).toHaveBeenCalled();
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('routes procedural sound effects through vibrato frequency modulation', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];
    const createdGains: Array<{
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createGain() {
        const gain = {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdGains.push(gain);
        return gain as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      sink.play({
        kind: 'steam-whistle',
        nowMs: 0,
        frequency: 370,
        durationMs: 1050,
        volume: 0.048,
        waveform: 'square',
        vibrato: {
          rateHz: 5.6,
          depthHz: 18,
          waveform: 'sine',
        },
      });

      expect(createdOscillators).toHaveLength(2);
      const sourceOscillator = createdOscillators[0];
      const vibratoOscillator = createdOscillators[1];
      expect(vibratoOscillator?.type).toBe('sine');
      expect(vibratoOscillator?.frequency.setValueAtTime).toHaveBeenCalledWith(
        5.6,
        0
      );
      expect(vibratoOscillator?.start).toHaveBeenCalledWith(0);
      expect(vibratoOscillator?.stop).toHaveBeenCalledWith(1.05);
      const depthGain = createdGains.find((gain) =>
        gain.gain.setValueAtTime.mock.calls.some(
          (call) => call[0] === 18 && call[1] === 0
        )
      );

      expect(depthGain).toBeDefined();
      expect(vibratoOscillator?.connect).toHaveBeenCalledWith(depthGain);
      expect(depthGain?.connect).toHaveBeenCalledWith(
        sourceOscillator?.frequency
      );
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('routes procedural sound effects through audio-rate frequency modulation', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];
    const createdGains: Array<{
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createGain() {
        const gain = {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdGains.push(gain);
        return gain as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      sink.play({
        kind: 'combat-magic',
        nowMs: 0,
        frequency: 244,
        durationMs: 320,
        volume: 0.05,
        waveform: 'triangle',
        frequencyModulation: {
          modulatorFrequencyHz: 168,
          depthHz: 42,
          waveform: 'triangle',
        },
      });

      expect(createdOscillators).toHaveLength(2);
      const sourceOscillator = createdOscillators[0];
      const modulatorOscillator = createdOscillators[1];
      expect(modulatorOscillator?.type).toBe('triangle');
      expect(
        modulatorOscillator?.frequency.setValueAtTime
      ).toHaveBeenCalledWith(168, 0);
      expect(modulatorOscillator?.start).toHaveBeenCalledWith(0);
      expect(modulatorOscillator?.stop).toHaveBeenCalledWith(0.32);
      const depthGain = createdGains.find((gain) =>
        gain.gain.setValueAtTime.mock.calls.some(
          (call) => call[0] === 42 && call[1] === 0
        )
      );

      expect(depthGain).toBeDefined();
      expect(modulatorOscillator?.connect).toHaveBeenCalledWith(depthGain);
      expect(depthGain?.connect).toHaveBeenCalledWith(
        sourceOscillator?.frequency
      );
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('routes procedural sound effects through ring modulation stages', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];
    const createdGains: Array<{
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createGain() {
        const gain = {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdGains.push(gain);
        return gain as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      sink.play({
        kind: 'combat-magic',
        nowMs: 0,
        frequency: 244,
        durationMs: 320,
        volume: 0.05,
        waveform: 'triangle',
        ringModulation: {
          modulatorFrequencyHz: 92,
          depth: 0.68,
          waveform: 'square',
        },
      });

      expect(createdOscillators).toHaveLength(2);
      const sourceOscillator = createdOscillators[0];
      const ringOscillator = createdOscillators[1];
      expect(ringOscillator?.type).toBe('square');
      expect(ringOscillator?.frequency.setValueAtTime).toHaveBeenCalledWith(
        92,
        0
      );
      expect(ringOscillator?.start).toHaveBeenCalledWith(0);
      expect(ringOscillator?.stop).toHaveBeenCalledWith(0.32);
      const depthGain = createdGains.find((gain) =>
        gain.gain.setValueAtTime.mock.calls.some(
          (call) => call[0] === 0.68 && call[1] === 0
        )
      );
      const carrierGain = createdGains.find((gain) =>
        gain.gain.setValueAtTime.mock.calls.some(
          (call) => call[0] === 0 && call[1] === 0
        )
      );

      expect(depthGain).toBeDefined();
      expect(carrierGain).toBeDefined();
      expect(ringOscillator?.connect).toHaveBeenCalledWith(depthGain);
      expect(depthGain?.connect).toHaveBeenCalledWith(carrierGain?.gain);
      expect(sourceOscillator?.connect).toHaveBeenCalledWith(carrierGain);
      expect(carrierGain?.connect).toHaveBeenCalled();
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('limits identical low-priority ambient voices in the web audio sink', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      finish(): void;
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          finish() {
            this.onended?.(new Event('ended'));
          },
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      sink.play({
        kind: 'forest-ambience',
        nowMs: 0,
        frequency: 180,
        durationMs: 1600,
        volume: 0.018,
        waveform: 'triangle',
      });
      sink.play({
        kind: 'forest-ambience',
        nowMs: 10,
        frequency: 182,
        durationMs: 1600,
        volume: 0.019,
        waveform: 'triangle',
      });

      expect(createdOscillators).toHaveLength(2);
      expect(createdOscillators[0]!.stop).toHaveBeenCalled();
      expect(sink.getActiveSourceCount?.()).toBe(1);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('replaces weaker ambient voices with higher-priority gameplay sounds in the sink', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      finish(): void;
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          finish() {
            this.onended?.(new Event('ended'));
          },
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      for (let index = 0; index < 10; index += 1) {
        sink.play({
          kind: index % 2 === 0 ? 'forest-ambience' : 'plains-ambience',
          nowMs: index * 10,
          frequency: 180 + index,
          durationMs: 1600,
          volume: 0.016,
          waveform: 'triangle',
          emitter: { x: 20 + index, y: 0 },
          listener: { x: 0, y: 0 },
        });
      }

      expect(sink.getActiveSourceCount?.()).toBe(2);

      sink.play({
        kind: 'combat-weapon',
        nowMs: 200,
        frequency: 220,
        durationMs: 160,
        volume: 0.056,
        waveform: 'sawtooth',
        emitter: { x: 0, y: 0 },
        listener: { x: 0, y: 0 },
      });

      expect(sink.getActiveSourceCount?.()).toBe(3);
      expect(
        createdOscillators.some(
          (oscillator) => oscillator.stop.mock.calls.length > 0
        )
      ).toBe(true);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('drops the quieter low-priority voice first when the sink is crowded', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      finish(): void;
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
        linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          finish() {
            this.onended?.(new Event('ended'));
          },
        };
        createdOscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      const fillerKinds: ProceduralSoundEffect['kind'][] = [
        'ocean',
        'river-ambience',
        'forest-ambience',
        'plains-ambience',
        'mountain-ambience',
        'cave-ambience',
        'settlement-ambience',
        'ruins-ambience',
        'train-engine',
        'wind',
      ];

      fillerKinds.forEach((kind, index) => {
        sink.play({
          kind,
          nowMs: index * 10,
          frequency: 140 + index,
          durationMs: 1600,
          volume: 0.018,
          waveform: kind === 'train-engine' ? 'sawtooth' : 'triangle',
          emitter:
            kind === 'ocean' ? { x: 40, y: 0 } : { x: 1 + index * 0.1, y: 0 },
          listener: { x: 0, y: 0 },
        });
      });

      sink.play({
        kind: 'footstep',
        nowMs: 200,
        frequency: 160,
        durationMs: 90,
        volume: 0.04,
        waveform: 'triangle',
        emitter: { x: 0, y: 0 },
        listener: { x: 0, y: 0 },
      });

      expect(sink.getActiveSourceCount?.()).toBe(10);
      expect(createdOscillators[0]!.stop).toHaveBeenCalled();
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('reduces the shared output gain when many sounds overlap', () => {
    const createdGains: Array<{
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        } as unknown as OscillatorNode;
      }
      createGain() {
        const gain = {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdGains.push(gain);
        return gain as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink();
      sink.play({
        kind: 'combat-weapon',
        nowMs: 0,
        frequency: 220,
        durationMs: 160,
        volume: 0.056,
        waveform: 'sawtooth',
      });
      sink.play({
        kind: 'combat-magic',
        nowMs: 10,
        frequency: 262,
        durationMs: 320,
        volume: 0.052,
        waveform: 'triangle',
      });
      sink.play({
        kind: 'train-whistle',
        nowMs: 20,
        frequency: 356,
        durationMs: 880,
        volume: 0.042,
        waveform: 'square',
      });

      const outputGain = createdGains[0];
      expect(outputGain).toBeDefined();
      const outputGainCalls =
        outputGain?.gain.setValueAtTime.mock.calls.map((call) => call[0]) ?? [];
      expect(outputGainCalls[0]).toBe(1);
      expect(outputGainCalls.some((value) => value < 1)).toBe(true);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('applies category volume to environment sounds before playback', () => {
    const createdGains: Array<{
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
            linearRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        } as unknown as OscillatorNode;
      }
      createGain() {
        const gain = {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdGains.push(gain);
        return gain as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioSoundEffectSink({
        getCategoryVolume(category) {
          return category === 'environment' ? 0.4 : 1;
        },
      });
      sink.play({
        kind: 'footstep',
        nowMs: 0,
        frequency: 160,
        durationMs: 90,
        volume: 0.04,
        waveform: 'triangle',
      });

      const envelopeCalls =
        createdGains[1]?.gain.exponentialRampToValueAtTime.mock.calls ?? [];
      expect(envelopeCalls[0]?.[0]).toBeCloseTo(0.016, 6);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('schedules footsteps on a cadence while walking in 3d', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.update({
      nowMs: 0,
      walking: true,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'road',
    });
    controller.update({
      nowMs: 100,
      walking: true,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'road',
    });
    controller.update({
      nowMs: 280,
      walking: true,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'road',
    });

    expect(played.map((effect) => effect.kind)).toEqual([
      'footstep',
      'footstep',
    ]);
    expect(played[0]?.waveform).toBe('square');
    expect(played[0]?.recipeId).toBe('footstep:road');
    expect(played[1]?.recipeId).toBe('footstep:road');
    expect(played[0]?.frequency).not.toBe(played[1]?.frequency);
  });

  it('plays jump and landing sounds once around a jump arc', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.triggerJump({ nowMs: 10, tileKind: 'cave-floor' });
    controller.update({
      nowMs: 15,
      walking: false,
      isJumping: true,
      viewMode: '3d',
      tileKind: 'cave-floor',
    });
    controller.update({
      nowMs: 240,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'cave-floor',
    });

    expect(played.map((effect) => effect.kind)).toEqual(['jump', 'landing']);
    expect(played[0]?.frequency).toBeGreaterThan(played[1]?.frequency ?? 0);
  });

  it('does not emit movement sounds outside 3d mode', () => {
    const play = vi.fn();
    const controller = createSoundEffectController({ play });

    controller.update({
      nowMs: 0,
      walking: true,
      isJumping: false,
      viewMode: '2d',
      tileKind: 'bridge',
    });

    expect(play).not.toHaveBeenCalled();
  });

  it('plays a debounced forest wind rustle when windy weather moves through trees', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.update({
      nowMs: 0,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'forest',
      weatherKind: 'wind',
      windStrength: 0.85,
    });
    controller.update({
      nowMs: 800,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'forest',
      weatherKind: 'wind',
      windStrength: 0.85,
    });
    controller.update({
      nowMs: getForestWindCadenceMs(0.85) + 20,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'forest',
      weatherKind: 'wind',
      windStrength: 0.85,
    });

    expect(played.map((effect) => effect.kind)).toEqual(['wind', 'wind']);
    expect(played[0]?.waveform).toBe('triangle');
    expect(played[0]?.recipeId).toBe('wind:forest:stormfront');
  });

  it('plays a debounced blocked-movement cue when walking into forest trees', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.triggerBlockedMovement({ nowMs: 100, tileKind: 'forest' });
    controller.triggerBlockedMovement({ nowMs: 180, tileKind: 'forest' });
    controller.triggerBlockedMovement({ nowMs: 320, tileKind: 'forest' });

    expect(played.map((effect) => effect.kind)).toEqual(['blocked', 'blocked']);
    expect(played[0]?.waveform).toBe('sawtooth');
  });

  it('plays distinct combat sounds for weapon strikes and magic casts', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.triggerCombat({
      nowMs: 100,
      style: 'slash',
      emitter: { x: 1, y: 0 },
      listener: { x: 0, y: 0 },
    });
    controller.triggerCombat({
      nowMs: 240,
      style: 'fire',
      emitter: { x: 2, y: 0 },
      listener: { x: 0, y: 0 },
    });

    expect(played).toEqual([
      expect.objectContaining({
        kind: 'combat-weapon',
        frequency: 210,
        waveform: 'sawtooth',
        emitter: { x: 1, y: 0 },
        recipeId: 'combat-weapon:slash',
      }),
      expect.objectContaining({
        kind: 'combat-magic',
        frequency: 322,
        waveform: 'sawtooth',
        emitter: { x: 2, y: 0 },
        recipeId: 'combat-magic:fire',
      }),
    ]);
  });

  it('debounces repeated combat sounds by style and emitter position', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.triggerCombat({
      nowMs: 100,
      style: 'pierce',
      emitter: { x: 0, y: 0 },
    });
    controller.triggerCombat({
      nowMs: 150,
      style: 'pierce',
      emitter: { x: 0.2, y: 0.2 },
    });
    controller.triggerCombat({
      nowMs: 210,
      style: 'pierce',
      emitter: { x: 0, y: 0 },
    });

    expect(played).toHaveLength(2);
    expect(played.every((effect) => effect.kind === 'combat-weapon')).toBe(
      true
    );
  });

  it('tracks a fading recent combat intensity signal for music reactions', () => {
    const controller = createSoundEffectController({
      play() {},
    });

    expect(controller.getRecentCombatIntensity(100)).toBe(0);

    controller.triggerCombat({
      nowMs: 100,
      style: 'slash',
      emitter: { x: 0, y: 0 },
    });

    expect(controller.getRecentCombatIntensity(100)).toBe(1);
    expect(controller.getRecentCombatIntensity(2100)).toBeCloseTo(0.5, 2);
    expect(controller.getRecentCombatIntensity(5000)).toBe(0);
  });

  it('tracks a fading recent priority sound intensity signal for music ducking', () => {
    const controller = createSoundEffectController({
      play() {},
    });

    expect(controller.getRecentPrioritySoundIntensity(100)).toBe(0);

    controller.triggerProgression({
      nowMs: 100,
      emitter: { x: 0, y: 0 },
    });

    expect(controller.getRecentPrioritySoundIntensity(100)).toBe(0.9);
    expect(controller.getRecentPrioritySoundIntensity(1200)).toBeLessThan(0.5);
    expect(controller.getRecentPrioritySoundIntensity(3000)).toBe(0);
  });

  it('normalizes sound volumes into stable family-specific ranges', () => {
    expect(resolveSoundEffectVolumeBounds('forest-ambience')).toEqual({
      min: 0.012,
      max: 0.032,
    });
    expect(normalizeSoundEffectVolume('forest-ambience', 0.002)).toBe(0.012);
    expect(normalizeSoundEffectVolume('forest-ambience', 0.05)).toBe(0.032);
    expect(normalizeSoundEffectVolume('forest-ambience', 0.02)).toBe(0.02);

    expect(resolveSoundEffectVolumeBounds('footstep')).toEqual({
      min: 0.022,
      max: 0.06,
    });
    expect(normalizeSoundEffectVolume('footstep', 0.01)).toBe(0.022);

    expect(resolveSoundEffectVolumeBounds('combat-weapon')).toEqual({
      min: 0.038,
      max: 0.058,
    });
    expect(normalizeSoundEffectVolume('combat-weapon', 0.08)).toBe(0.058);
  });

  it('reserves more dynamic range for major events than for ordinary overlapping sounds', () => {
    expect(resolvePriorityDynamicRangeGain(6, 6)).toBe(1);
    expect(resolvePriorityDynamicRangeGain(5, 6)).toBeCloseTo(0.88, 6);
    expect(resolvePriorityDynamicRangeGain(1, 6)).toBeCloseTo(0.52, 6);
    expect(resolvePriorityDynamicRangeGain(3, 4)).toBe(1);
    expect(resolvePriorityDynamicRangeGain(2, 5)).toBeCloseTo(0.76, 6);
  });

  it('reduces low-priority ambience while recent important sounds are active', () => {
    const baseline: ProceduralSoundEffect[] = [];
    const ducked: ProceduralSoundEffect[] = [];
    const baselineController = createSoundEffectController({
      play(effect) {
        baseline.push(effect);
      },
    });
    const duckedController = createSoundEffectController({
      play(effect) {
        ducked.push(effect);
      },
    });

    baselineController.update({
      nowMs: 0,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'forest',
      weatherKind: 'wind',
      windStrength: 0.9,
      nearbyAmbient: {
        kind: 'forest',
        intensity: 0.7,
        emitter: { x: 2, y: 0 },
      },
      nearbyTrain: {
        progress: 0.3,
        emitter: { x: 4, y: 0 },
      },
      nearbyPaddleBoat: {
        progress: 0.5,
        emitter: { x: 5, y: 0 },
      },
    });

    duckedController.triggerProgression({
      nowMs: 0,
      emitter: { x: 0, y: 0 },
    });
    duckedController.update({
      nowMs: 0,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'forest',
      weatherKind: 'wind',
      windStrength: 0.9,
      nearbyAmbient: {
        kind: 'forest',
        intensity: 0.7,
        emitter: { x: 2, y: 0 },
      },
      nearbyTrain: {
        progress: 0.3,
        emitter: { x: 4, y: 0 },
      },
      nearbyPaddleBoat: {
        progress: 0.5,
        emitter: { x: 5, y: 0 },
      },
    });

    expect(duckedController.getRecentPrioritySoundIntensity(0)).toBe(0.9);
    expect(resolveAmbienceDuckingGain(0.9)).toBeLessThan(1);
    expect(baseline.map((effect) => effect.kind)).toEqual([
      'train-engine',
      'paddle-calliope',
      'forest-ambience',
      'wind',
    ]);
    expect(ducked.map((effect) => effect.kind)).toEqual([
      'advancement',
      'train-engine',
      'paddle-calliope',
      'forest-ambience',
      'wind',
    ]);
    expect(ducked[1]!.volume).toBeLessThan(baseline[0]!.volume);
    expect(ducked[2]!.volume).toBeLessThan(baseline[1]!.volume);
    expect(ducked[3]!.volume).toBeLessThan(baseline[2]!.volume);
    expect(ducked[4]!.volume).toBeLessThan(baseline[3]!.volume);
  });

  it('plays reusable open and close interaction sounds for doors and exits', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.triggerInteraction({
      nowMs: 100,
      event: 'open',
      tileKind: 'door',
    });
    controller.triggerInteraction({
      nowMs: 140,
      event: 'close',
      tileKind: 'stairsUp',
    });
    controller.triggerInteraction({
      nowMs: 240,
      event: 'close',
      tileKind: 'stairsUp',
    });

    expect(played.map((effect) => effect.kind)).toEqual(['open', 'close']);
    expect(played[0]?.waveform).toBe('square');
    expect(played[0]?.recipeId).toBe('open:door');
    expect(played[1]?.recipeId).toBe('close:stairsup');
    expect((played[0]?.frequency ?? 0) > (played[1]?.frequency ?? 0)).toBe(
      true
    );
  });

  it('plays a debounced advancement chime when the player levels up', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.triggerProgression({ nowMs: 100, level: 2 });
    controller.triggerProgression({ nowMs: 220, level: 3 });
    controller.triggerProgression({ nowMs: 320, level: 6 });

    expect(played.map((effect) => effect.kind)).toEqual([
      'advancement',
      'advancement',
    ]);
    expect(played[0]?.waveform).toBe('sine');
    expect((played[1]?.frequency ?? 0) > (played[0]?.frequency ?? 0)).toBe(
      true
    );
    expect(played[1]?.durationMs).toBeGreaterThan(played[0]?.durationMs ?? 0);
  });

  it('provides cave and bridge audio profiles for later surface-specific effects', () => {
    expect(getSurfaceAudioProfile('cave-floor')).toEqual(
      expect.objectContaining({
        cadenceMs: 282,
        waveform: 'triangle',
      })
    );
    expect(getSurfaceAudioProfile('bridge')).toEqual(
      expect.objectContaining({
        cadenceMs: 290,
        waveform: 'square',
      })
    );
  });

  it('computes quieter and panned mixes for distant off-center emitters', () => {
    expect(getSoundSpatialMix({ x: 0, y: 0 }, { x: 0, y: 0 })).toEqual({
      gainMultiplier: 0.82,
      pan: 0,
    });
    expect(getSoundSpatialMix({ x: 3, y: 0 }, { x: 0, y: 0 })).toEqual({
      gainMultiplier: expect.closeTo(1 / (1 + 3 * 0.85), 6),
      pan: 1,
    });
    expect(getSoundSpatialMix({ x: -0.7, y: 0.2 }, { x: 0, y: 0 })).toEqual({
      gainMultiplier: expect.closeTo(1 / (1 + Math.hypot(0.7, 0.2) * 0.85), 6),
      pan: expect.closeTo(-0.25, 6),
    });
  });

  it('maps walkable tiles into distinct surface families for footsteps', () => {
    expect(getSurfaceAudioFamily('plains')).toBe('grass');
    expect(getSurfaceAudioFamily('forest')).toBe('vegetation');
    expect(getSurfaceAudioFamily('mud')).toBe('mud');
    expect(getSurfaceAudioFamily('shore')).toBe('sand');
    expect(getSurfaceAudioFamily('road')).toBe('gravel');
    expect(getSurfaceAudioFamily('mountain')).toBe('rock');
    expect(getSurfaceAudioFamily('bridge')).toBe('wood');
    expect(getSurfaceAudioFamily('rail')).toBe('metal');
    expect(getSurfaceAudioFamily('floor')).toBe('stone-floor');
    expect(getSurfaceAudioFamily('town')).toBe('stone-floor');
    expect(getSurfaceAudioFamily('snow')).toBe('snow');
    expect(getSurfaceAudioFamily('river')).toBe('shallow-water');
    expect(getSurfaceAudioFamily('cave-mushrooms')).toBe('vegetation');
  });

  it('varies cadence and pitch across terrain material footstep surfaces', () => {
    expect(getSurfaceAudioProfile('plains')).toEqual(
      expect.objectContaining({
        cadenceMs: 315,
        footstepFrequency: 128,
      })
    );
    expect(getSurfaceAudioProfile('mud')).toEqual(
      expect.objectContaining({
        cadenceMs: 342,
        footstepFrequency: 98,
      })
    );
    expect(getSurfaceAudioProfile('road')).toEqual(
      expect.objectContaining({
        cadenceMs: 265,
        footstepFrequency: 168,
      })
    );
    expect(getSurfaceAudioProfile('bridge')).toEqual(
      expect.objectContaining({
        cadenceMs: 290,
        footstepFrequency: 188,
      })
    );
    expect(getSurfaceAudioProfile('shore')).toEqual(
      expect.objectContaining({
        cadenceMs: 322,
        footstepFrequency: 118,
      })
    );
    expect(getSurfaceAudioProfile('mountain')).toEqual(
      expect.objectContaining({
        cadenceMs: 286,
        footstepFrequency: 176,
      })
    );
    expect(getSurfaceAudioProfile('rail')).toEqual(
      expect.objectContaining({
        cadenceMs: 274,
        footstepFrequency: 214,
      })
    );
    expect(getSurfaceAudioProfile('floor')).toEqual(
      expect.objectContaining({
        cadenceMs: 282,
        footstepFrequency: 146,
      })
    );
    expect(getSurfaceAudioProfile('snow')).toEqual(
      expect.objectContaining({
        cadenceMs: 336,
        footstepFrequency: 106,
      })
    );
    expect(getSurfaceAudioProfile('river')).toEqual(
      expect.objectContaining({
        cadenceMs: 330,
        footstepFrequency: 114,
      })
    );
  });

  it('limits blocked-movement tree impacts to forest collisions for now', () => {
    expect(shouldPlayBlockedMovementSound('forest')).toBe(true);
    expect(shouldPlayBlockedMovementSound('road')).toBe(false);
    expect(shouldPlayBlockedMovementSound(undefined)).toBe(false);
  });

  it('only schedules forest wind ambience for windy forest tiles', () => {
    expect(shouldPlayForestWindSound('forest', 'wind', 0.2)).toBe(true);
    expect(shouldPlayForestWindSound('forest', 'clouds', 0.45)).toBe(true);
    expect(shouldPlayForestWindSound('forest', 'clouds', 0.1)).toBe(false);
    expect(shouldPlayForestWindSound('road', 'wind', 0.9)).toBe(false);
  });

  it('plays a debounced ocean ambience cue when nearby ambient water is audible', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.update({
      nowMs: 0,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'shore',
      nearbyAmbient: {
        kind: 'ocean',
        intensity: 0.75,
        emitter: { x: 4, y: 0 },
        listener: { x: 0, y: 0 },
      },
      listener: { x: 0, y: 0 },
    });
    controller.update({
      nowMs: 800,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'shore',
      nearbyAmbient: {
        kind: 'ocean',
        intensity: 0.75,
        emitter: { x: 4, y: 0 },
        listener: { x: 0, y: 0 },
      },
      listener: { x: 0, y: 0 },
    });
    controller.update({
      nowMs: 2300,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'shore',
      nearbyAmbient: {
        kind: 'ocean',
        intensity: 0.75,
        emitter: { x: 4, y: 0 },
        listener: { x: 0, y: 0 },
      },
      listener: { x: 0, y: 0 },
    });

    expect(played.map((effect) => effect.kind)).toEqual(['ocean', 'ocean']);
    expect(played[0]?.waveform).toBe('sine');
    expect(played[0]?.recipeId).toMatch(/^ocean:ocean:/);
  });

  it('blends nearby forest and coastal ambience instead of replacing one outright', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.update({
      nowMs: 900,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'shore',
      nearbyAmbient: {
        kind: 'forest',
        intensity: 0.82,
        emitter: { x: 0, y: 0 },
        blendedLayers: [
          {
            kind: 'ocean',
            intensity: 0.68,
            emitter: { x: 1, y: 0 },
          },
        ],
      },
      listener: { x: 0, y: 0 },
    });

    expect(played.map((effect) => effect.kind)).toEqual([
      'forest-ambience',
      'ocean',
    ]);
    expect(played[0]?.recipeId).toMatch(/^forest-ambience:forest:/);
    expect(played[1]?.recipeId).toMatch(/^ocean:ocean:/);
    expect((played[1]?.volume ?? 0) < (played[0]?.volume ?? 0)).toBe(true);
  });

  it('plays train engine pulses and whistles for nearby active rail traffic', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.update({
      nowMs: 0,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'plains',
      nearbyTrain: {
        progress: 0.04,
        emitter: { x: 3, y: 0 },
        listener: { x: 0, y: 0 },
      },
      listener: { x: 0, y: 0 },
    });
    controller.update({
      nowMs: getTrainEngineCadenceMs() + 10,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'plains',
      nearbyTrain: {
        progress: 0.5,
        emitter: { x: 3, y: 0 },
        listener: { x: 0, y: 0 },
      },
      listener: { x: 0, y: 0 },
    });

    expect(played.map((effect) => effect.kind)).toEqual([
      'train-engine',
      'train-whistle',
      'train-engine',
    ]);
    expect(played[0]?.waveform).toBe('sawtooth');
    expect(played[1]?.waveform).toBe('square');
    expect((played[1]?.frequency ?? 0) > (played[0]?.frequency ?? 0)).toBe(
      true
    );
    expect(played[0]?.durationMs).toBeGreaterThanOrEqual(
      getTrainEngineDurationMs(0.04) * 0.95
    );
    expect(played[0]?.durationMs).toBeLessThanOrEqual(
      getTrainEngineDurationMs(0.04) * 1.05
    );
    expect(played[1]?.durationMs).toBeGreaterThanOrEqual(
      getTrainWhistleDurationMs(0.04) * 0.95
    );
    expect(played[1]?.durationMs).toBeLessThanOrEqual(
      getTrainWhistleDurationMs(0.04) * 1.05
    );
  });

  it('keeps recurring contextual recipe ids stable across nearby vehicle and ambient signatures', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.update({
      nowMs: 0,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'shore',
      nearbyAmbient: {
        kind: 'river',
        intensity: 0.6,
        emitter: { x: 2, y: 0 },
      },
      nearbyPaddleBoat: {
        progress: 0.18,
        whistlePhase: 'departure',
        emitter: { x: 1, y: 0 },
      },
    });

    expect(played.map((effect) => effect.recipeId)).toContain(
      'paddle-calliope:paddle-boat'
    );
    expect(played.map((effect) => effect.recipeId)).toContain(
      'steam-whistle:paddle-boat:departure'
    );
    expect(
      played
        .map((effect) => effect.recipeId)
        .some(
          (recipeId) =>
            recipeId === 'river-ambience:river:current' ||
            recipeId === 'river-ambience:river' ||
            recipeId === 'river-ambience:river:water-splashes'
        )
    ).toBe(true);
  });

  it('only whistles when trains are near station approach progress', () => {
    expect(shouldPlayTrainWhistle(0.02)).toBe(true);
    expect(shouldPlayTrainWhistle(0.5)).toBe(false);
    expect(shouldPlayTrainWhistle(0.98)).toBe(true);
    expect(shouldPlayTrainWhistle(undefined)).toBe(false);
  });

  it('plays a debounced made-up calliope motif for nearby paddle boats', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.update({
      nowMs: 0,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'shore',
      nearbyPaddleBoat: {
        progress: 0.18,
        emitter: { x: 2, y: 0 },
        listener: { x: 0, y: 0 },
      },
      listener: { x: 0, y: 0 },
    });
    controller.update({
      nowMs: 900,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'shore',
      nearbyPaddleBoat: {
        progress: 0.42,
        emitter: { x: 2, y: 0 },
        listener: { x: 0, y: 0 },
      },
      listener: { x: 0, y: 0 },
    });
    controller.update({
      nowMs: getPaddleBoatCalliopeCadenceMs() + 10,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'shore',
      nearbyPaddleBoat: {
        progress: 0.42,
        emitter: { x: 2, y: 0 },
        listener: { x: 0, y: 0 },
      },
      listener: { x: 0, y: 0 },
    });

    expect(played.map((effect) => effect.kind)).toEqual([
      'paddle-calliope',
      'paddle-calliope',
    ]);
    expect(played[0]?.waveform).toBe('triangle');
    expect((played[1]?.frequency ?? 0) > (played[0]?.frequency ?? 0)).toBe(
      true
    );
    expect(played[0]?.durationMs).toBe(getPaddleBoatCalliopeDurationMs(0.18));
    expect(played[1]?.durationMs).toBe(getPaddleBoatCalliopeDurationMs(0.42));
  });

  it('maps paddle-boat progress into a stable calliope melody step', () => {
    expect(resolvePaddleBoatCalliopeFrequency(0)).toBeCloseTo(392, 2);
    expect(resolvePaddleBoatCalliopeFrequency(0.26)).toBeCloseTo(523.25, 2);
    expect(resolvePaddleBoatCalliopeFrequency(0.63)).toBeCloseTo(587.33, 2);
    expect(resolvePaddleBoatCalliopeFrequency(undefined)).toBeCloseTo(392, 2);
  });

  it('plays one steam whistle per arrival or departure event window', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.update({
      nowMs: 0,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'dock',
      nearbyPaddleBoat: {
        progress: 0.04,
        whistlePhase: 'departure',
        emitter: { x: 1, y: 0 },
        listener: { x: 0, y: 0 },
      },
      listener: { x: 0, y: 0 },
    });
    controller.update({
      nowMs: 400,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'dock',
      nearbyPaddleBoat: {
        progress: 0.05,
        whistlePhase: 'departure',
        emitter: { x: 1, y: 0 },
        listener: { x: 0, y: 0 },
      },
      listener: { x: 0, y: 0 },
    });
    controller.update({
      nowMs: 1800,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'dock',
      nearbyPaddleBoat: {
        progress: 0.96,
        whistlePhase: 'arrival',
        emitter: { x: 1, y: 0 },
        listener: { x: 0, y: 0 },
      },
      listener: { x: 0, y: 0 },
    });

    expect(played.filter((effect) => effect.kind === 'steam-whistle')).toEqual([
      expect.objectContaining({
        kind: 'steam-whistle',
        frequency: 370,
        durationMs: getSteamWhistleDurationMs('departure'),
      }),
      expect.objectContaining({
        kind: 'steam-whistle',
        frequency: 294,
        durationMs: getSteamWhistleDurationMs('arrival'),
      }),
    ]);
  });

  it('varies procedural movement and ambience durations from event context', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.update({
      nowMs: 300,
      walking: true,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'road',
    });
    controller.update({
      nowMs: 700,
      walking: true,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'cave-floor',
    });
    controller.update({
      nowMs: 1000,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'forest',
      nearbyAmbient: {
        kind: 'forest',
        intensity: 0.2,
        emitter: { x: 1, y: 0 },
      },
      weatherKind: 'wind',
      windStrength: 0.25,
    });
    controller.update({
      nowMs: 3600,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'forest',
      nearbyAmbient: {
        kind: 'forest',
        intensity: 0.9,
        emitter: { x: 2, y: 0 },
      },
      weatherKind: 'wind',
      windStrength: 0.95,
    });

    const roadProfile = getSurfaceAudioProfile('road');
    const caveProfile = getSurfaceAudioProfile('cave-floor');
    const footsteps = played.filter((effect) => effect.kind === 'footstep');
    const roadStep = footsteps[0];
    const caveStep = footsteps[1];
    const forestAmbient = played.filter(
      (effect) => effect.kind === 'forest-ambience'
    );
    const winds = played.filter((effect) => effect.kind === 'wind');

    expect(roadStep?.durationMs).toBeGreaterThanOrEqual(
      getMovementSoundDurationMs('footstep', roadProfile) * 0.92
    );
    expect(roadStep?.durationMs).toBeLessThanOrEqual(
      getMovementSoundDurationMs('footstep', roadProfile) * 1.08
    );
    expect(caveStep?.durationMs).toBeGreaterThanOrEqual(
      getMovementSoundDurationMs('footstep', caveProfile) * 0.92
    );
    expect(caveStep?.durationMs).toBeLessThanOrEqual(
      getMovementSoundDurationMs('footstep', caveProfile) * 1.1
    );
    expect((caveStep?.durationMs ?? 0) > (roadStep?.durationMs ?? 0)).toBe(
      true
    );
    expect(forestAmbient[0]?.durationMs).toBeGreaterThanOrEqual(
      getAmbientSoundDurationMs('forest', 0.2)
    );
    expect(forestAmbient[1]?.durationMs).toBeGreaterThanOrEqual(
      getAmbientSoundDurationMs('forest', 0.9)
    );
    expect(
      (forestAmbient[1]?.durationMs ?? 0) > (forestAmbient[0]?.durationMs ?? 0)
    ).toBe(true);
    expect(winds[0]?.durationMs).toBeGreaterThanOrEqual(
      getWindSoundDurationMs(0.25) * 0.86
    );
    expect(winds[0]?.durationMs).toBeLessThanOrEqual(
      getWindSoundDurationMs(0.25) * 1.14
    );
    expect(winds[1]?.durationMs).toBeGreaterThanOrEqual(
      getWindSoundDurationMs(0.95) * 0.86
    );
    expect(winds[1]?.durationMs).toBeLessThanOrEqual(
      getWindSoundDurationMs(0.95) * 1.14
    );
    expect((winds[1]?.durationMs ?? 0) > (winds[0]?.durationMs ?? 0)).toBe(
      true
    );
  });

  it('only whistles for explicit arrival or departure phases', () => {
    expect(shouldPlaySteamWhistle('arrival')).toBe(true);
    expect(shouldPlaySteamWhistle('departure')).toBe(true);
    expect(shouldPlaySteamWhistle(undefined)).toBe(false);
    expect(resolveSteamWhistleFrequency('arrival')).toBe(294);
    expect(resolveSteamWhistleFrequency('departure')).toBe(370);
  });

  it('maps combat styles to stable timing, volume, and waveform profiles', () => {
    expect(isMagicCombatStyle('slash')).toBe(false);
    expect(isMagicCombatStyle('arcane')).toBe(true);
    expect(getCombatSoundCadenceMs('slash')).toBe(90);
    expect(getCombatSoundCadenceMs('arcane')).toBe(140);
    expect(getCombatSoundDurationMs('blunt')).toBe(180);
    expect(getCombatSoundDurationMs('healing')).toBe(320);
    expect(getProgressionSoundDurationMs(12)).toBeGreaterThan(
      getProgressionSoundDurationMs(2)
    );
    expect(getCombatSoundVolume('bow')).toBeCloseTo(0.048, 6);
    expect(resolveCombatSoundFrequency('frost')).toBe(196);
    expect(resolveCombatSoundWaveform('healing')).toBe('sine');
  });

  it('attaches listener and emitter positions to scheduled movement sounds', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.triggerBlockedMovement({
      nowMs: 10,
      tileKind: 'forest',
      emitter: { x: 1, y: 0 },
      listener: { x: 0, y: 0 },
    });
    controller.update({
      nowMs: 300,
      walking: true,
      isJumping: false,
      viewMode: '3d',
      tileKind: 'road',
      emitter: { x: 0, y: 0 },
      listener: { x: 0, y: 0 },
    });

    expect(played[0]).toEqual(
      expect.objectContaining({
        kind: 'blocked',
        emitter: { x: 1, y: 0 },
        listener: { x: 0, y: 0 },
      })
    );
    expect(played[1]).toEqual(
      expect.objectContaining({
        kind: 'footstep',
        emitter: { x: 0, y: 0 },
        listener: { x: 0, y: 0 },
      })
    );
  });

  it('suppresses ambient cues while ambiance is disabled without muting footsteps', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.update({
      nowMs: 0,
      walking: true,
      isJumping: false,
      viewMode: '3d',
      ambianceEnabled: false,
      tileKind: 'shore',
      weatherKind: 'wind',
      windStrength: 0.9,
      nearbyAmbient: {
        kind: 'settlement',
        intensity: 0.8,
        emitter: { x: 3, y: 0 },
      },
      nearbyTrain: {
        progress: 0.04,
        emitter: { x: 2, y: 0 },
      },
      emitter: { x: 0, y: 0 },
      listener: { x: 0, y: 0 },
    });

    expect(played.map((effect) => effect.kind)).toEqual(['footstep']);
  });

  it('maps different ambient source kinds into distinct emitted ambience effects', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.update({
      nowMs: 0,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      nearbyAmbient: {
        kind: 'cave',
        intensity: 0.6,
        emitter: { x: 1, y: 0 },
      },
    });
    controller.update({
      nowMs: 1000,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      nearbyAmbient: {
        kind: 'settlement',
        intensity: 0.6,
        emitter: { x: 1, y: 0 },
      },
    });
    controller.update({
      nowMs: 2000,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      nearbyAmbient: {
        kind: 'river',
        intensity: 0.6,
        emitter: { x: 2, y: 0 },
      },
    });
    controller.update({
      nowMs: 3000,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      nearbyAmbient: {
        kind: 'plains',
        intensity: 0.6,
        emitter: { x: 3, y: 0 },
      },
    });
    controller.update({
      nowMs: 4000,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      nearbyAmbient: {
        kind: 'mountain',
        intensity: 0.6,
        emitter: { x: 4, y: 0 },
      },
    });
    controller.update({
      nowMs: 5000,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      nearbyAmbient: {
        kind: 'ruins',
        intensity: 0.6,
        emitter: { x: 1, y: 0 },
      },
    });

    expect(played.map((effect) => effect.kind)).toEqual([
      'cave-ambience',
      'settlement-ambience',
      'river-ambience',
      'plains-ambience',
      'mountain-ambience',
      'ruins-ambience',
    ]);
  });

  it('changes forest ambient recipe ids across dawn, summer, and night cycles', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.update({
      nowMs: 0,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      dayProgress: 0.24,
      yearProgress: 0.5,
      nearbyAmbient: {
        kind: 'forest',
        intensity: 0.7,
        emitter: { x: 4, y: 0 },
      },
    });
    controller.update({
      nowMs: 3000,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      dayProgress: 0.5,
      yearProgress: 0.5,
      nearbyAmbient: {
        kind: 'forest',
        intensity: 0.7,
        emitter: { x: 5, y: 0 },
      },
    });
    controller.update({
      nowMs: 6000,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      dayProgress: 0.92,
      yearProgress: 0.5,
      nearbyAmbient: {
        kind: 'forest',
        intensity: 0.7,
        emitter: { x: 4, y: 0 },
      },
    });

    const forestRecipes = played
      .filter((effect) => effect.kind === 'forest-ambience')
      .map((effect) => effect.recipeId);

    expect(
      forestRecipes.some((recipeId) =>
        [
          'forest-ambience:forest:dawn-birds',
          'forest-ambience:forest:nearby-birds',
          'forest-ambience:forest:distant-birds',
        ].includes(recipeId ?? '')
      )
    ).toBe(true);
    expect(
      forestRecipes.some((recipeId) =>
        [
          'forest-ambience:forest:summer-insects',
          'forest-ambience:forest:nearby-birds',
          'forest-ambience:forest:distant-birds',
          'forest-ambience:forest:branch-creak',
        ].includes(recipeId ?? '')
      )
    ).toBe(true);
    expect(
      forestRecipes.includes('forest-ambience:forest:night-crickets') ||
        forestRecipes.includes('forest-ambience:forest:owl') ||
        forestRecipes.includes('forest-ambience:forest:animal-calls')
    ).toBe(true);
  });

  it('changes settlement ambience across workday, tavern hours, and quiet night', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.update({
      nowMs: 0,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      dayProgress: 0.24,
      nearbyAmbient: {
        kind: 'settlement',
        intensity: 0.8,
        emitter: { x: 2, y: 0 },
      },
    });
    controller.update({
      nowMs: 3000,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      dayProgress: 0.5,
      nearbyAmbient: {
        kind: 'settlement',
        intensity: 0.8,
        emitter: { x: 3, y: 0 },
      },
    });
    controller.update({
      nowMs: 6000,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      dayProgress: 0.8,
      nearbyAmbient: {
        kind: 'settlement',
        intensity: 0.8,
        emitter: { x: 2, y: 0 },
      },
    });
    controller.update({
      nowMs: 9000,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      dayProgress: 0.92,
      nearbyAmbient: {
        kind: 'settlement',
        intensity: 0.8,
        emitter: { x: 2, y: 0 },
      },
    });

    expect(
      played
        .filter((effect) => effect.kind === 'settlement-ambience')
        .map((effect) => effect.recipeId)
    ).toEqual([
      'settlement-ambience:settlement:rooster-bells',
      'settlement-ambience:settlement:market',
      'settlement-ambience:settlement:tavern',
      'settlement-ambience:settlement:quiet-lanterns',
    ]);
  });

  it('emits living ambient event recipe ids for migration, splashes, and mystery hints', () => {
    const played: ProceduralSoundEffect[] = [];
    const controller = createSoundEffectController({
      play(effect) {
        played.push(effect);
      },
    });

    controller.update({
      nowMs: 2_200,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      dayProgress: 0.24,
      yearProgress: 0.7,
      nearbyAmbient: {
        kind: 'forest',
        intensity: 0.7,
        emitter: { x: 7, y: 0 },
      },
    });
    controller.update({
      nowMs: 4_400,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      nearbyAmbient: {
        kind: 'river',
        intensity: 0.7,
        emitter: { x: 8, y: 0 },
      },
    });
    controller.update({
      nowMs: 8_800,
      walking: false,
      isJumping: false,
      viewMode: '3d',
      dayProgress: 0.92,
      yearProgress: 0.7,
      nearbyAmbient: {
        kind: 'ruins',
        intensity: 0.7,
        emitter: { x: 9, y: 0 },
      },
    });

    const recipeIds = played.map((effect) => effect.recipeId);

    expect(
      recipeIds.some(
        (recipeId) =>
          recipeId === 'forest-ambience:forest:dawn-birds' ||
          recipeId === 'forest-ambience:forest:migrating-birds' ||
          recipeId === 'forest-ambience:forest:vegetation-rustle'
      )
    ).toBe(true);
    expect(
      recipeIds.includes('river-ambience:river') ||
        recipeIds.includes('river-ambience:river:current') ||
        recipeIds.includes('river-ambience:river:water-splashes')
    ).toBe(true);
    expect(
      recipeIds.some(
        (recipeId) =>
          recipeId === 'ruins-ambience:ruins:mystery-hint' ||
          recipeId === 'ruins-ambience:ruins:landmark-hint' ||
          recipeId === 'ruins-ambience:ruins:migrating-birds'
      )
    ).toBe(true);
  });
});
