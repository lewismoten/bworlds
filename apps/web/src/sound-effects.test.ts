import { describe, expect, it, vi } from 'vitest';
import {
  createSoundEffectController,
  createWebAudioSoundEffectSink,
  getCombatSoundCadenceMs,
  getCombatSoundDurationMs,
  getCombatSoundVolume,
  getForestWindCadenceMs,
  getPaddleBoatCalliopeCadenceMs,
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
        } as unknown as GainNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
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

    expect(played.map((effect) => effect.kind)).toEqual([
      'blocked',
      'blocked',
    ]);
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
    expect(played.every((effect) => effect.kind === 'combat-weapon')).toBe(true);
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
    expect(
      getSoundSpatialMix({ x: 3, y: 0 }, { x: 0, y: 0 })
    ).toEqual({
      gainMultiplier: expect.closeTo(1 / (1 + 3 * 0.85), 6),
      pan: 1,
    });
    expect(
      getSoundSpatialMix({ x: -0.7, y: 0.2 }, { x: 0, y: 0 })
    ).toEqual({
      gainMultiplier: expect.closeTo(
        1 / (1 + Math.hypot(0.7, 0.2) * 0.85),
        6
      ),
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
    expect((played[1]?.frequency ?? 0) > (played[0]?.frequency ?? 0)).toBe(true);
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
});
