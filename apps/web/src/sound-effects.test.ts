import { describe, expect, it, vi } from 'vitest';
import {
  createSoundEffectController,
  createWebAudioSoundEffectSink,
  getCombatSoundCadenceMs,
  getCombatSoundDurationMs,
  getCombatSoundVolume,
  getForestWindCadenceMs,
  getPaddleBoatCalliopeCadenceMs,
  normalizeSoundEffectVolume,
  resolveAmbienceDuckingGain,
  resolvePriorityDynamicRangeGain,
  resolveSoundEffectVolumeBounds,
  getSurfaceAudioFamily,
  getSurfaceAudioProfile,
  getSoundSpatialMix,
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
      }),
      expect.objectContaining({
        kind: 'combat-magic',
        frequency: 322,
        waveform: 'sawtooth',
        emitter: { x: 2, y: 0 },
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
  });

  it('provides cave and bridge audio profiles for later surface-specific effects', () => {
    expect(getSurfaceAudioProfile('cave-floor')).toEqual(
      expect.objectContaining({
        cadenceMs: 330,
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
    expect(getSurfaceAudioFamily('road')).toBe('road');
    expect(getSurfaceAudioFamily('bridge')).toBe('bridge');
    expect(getSurfaceAudioFamily('dock')).toBe('dock');
    expect(getSurfaceAudioFamily('shore')).toBe('shore');
    expect(getSurfaceAudioFamily('town')).toBe('town');
    expect(getSurfaceAudioFamily('floor')).toBe('interior');
    expect(getSurfaceAudioFamily('shop')).toBe('interior');
    expect(getSurfaceAudioFamily('stairsUp')).toBe('interior');
    expect(getSurfaceAudioFamily('cave-mushrooms')).toBe('cave');
  });

  it('varies cadence and pitch across road, bridge, shore, town, and interior surfaces', () => {
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
        cadenceMs: 305,
        footstepFrequency: 132,
      })
    );
    expect(getSurfaceAudioProfile('town')).toEqual(
      expect.objectContaining({
        cadenceMs: 275,
        footstepFrequency: 156,
      })
    );
    expect(getSurfaceAudioProfile('floor')).toEqual(
      expect.objectContaining({
        cadenceMs: 285,
        footstepFrequency: 146,
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
      expect.objectContaining({ kind: 'steam-whistle', frequency: 370 }),
      expect.objectContaining({ kind: 'steam-whistle', frequency: 294 }),
    ]);
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
});
