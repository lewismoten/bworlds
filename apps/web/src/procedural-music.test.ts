import { describe, expect, it, vi } from 'vitest';
import { MAX_ACTIVE_PROCEDURAL_MUSIC_OSCILLATORS } from './audio-budget.ts';
import {
  resolveProceduralChordAtStep,
  resolveProceduralInstrumentSemitones,
} from './procedural-music-harmony.ts';
import { resolveProceduralMeterPosition } from './procedural-music-meter.ts';
import {
  createProceduralInstrumentBank,
  createMusicController,
  resolveProceduralInstrumentRolePatchDistinctness,
  createWebAudioMusicSink,
  getMusicUpdateSignature,
  getMusicRegionSignature,
  getMusicSpatialMix,
  resolvePoiMusicBlendGains,
  resolvePoiMusicMix,
  resolveMusicArrangement,
  resolveMusicMood,
  resolveMusicTheme,
  scheduleProceduralMusicNotes,
  type ProceduralMusicNote,
} from './procedural-music.ts';
import { createProceduralMusicSong } from './procedural-music-song.ts';
import { resolveProceduralMusicLoudness } from './procedural-music-loudness.ts';
import { createProceduralPercussionNotes } from './procedural-music-percussion.ts';
import {
  applyPercussionVoiceToTimbre,
  resolvePercussionVoiceById,
} from './procedural-music-percussion-voices.ts';
import { resolveProceduralThemeMotif } from './procedural-music-theme-motif.ts';
import {
  compareInstrumentPatchToKnownGoodRolePatch,
  compareInstrumentPatches,
  listKnownGoodInstrumentPatches,
  resolveInstrumentPatchRecipe,
  resolveKnownGoodInstrumentPatch,
  resolveProceduralInstrumentTimbre,
  resolveRegisterShapedInstrumentTimbre,
  resolveVelocityShapedInstrumentTimbre,
} from './music-instrument-timbres.ts';
import { resolveProceduralNoteVelocity } from './procedural-music-note-shaping.ts';

describe('procedural music', () => {
  it('changes note timbre across low, middle, and high registers', () => {
    const baseTimbre = resolveProceduralInstrumentTimbre({
      family: 'flute',
      brightness: 1.02,
      harmonicSignal: 0.45,
      filterSignal: 0.5,
    });

    const lowTimbre = resolveRegisterShapedInstrumentTimbre({
      timbre: baseTimbre,
      frequencyHz: 196,
    });
    const middleTimbre = resolveRegisterShapedInstrumentTimbre({
      timbre: baseTimbre,
      frequencyHz: 440,
    });
    const highTimbre = resolveRegisterShapedInstrumentTimbre({
      timbre: baseTimbre,
      frequencyHz: 1_176,
    });

    expect(lowTimbre.filterCutoffHz).toBeLessThan(middleTimbre.filterCutoffHz);
    expect(highTimbre.filterCutoffHz).toBeGreaterThan(
      middleTimbre.filterCutoffHz
    );
    expect(lowTimbre.harmonicRatio).toBeLessThan(middleTimbre.harmonicRatio);
    expect(highTimbre.harmonicRatio).toBeGreaterThan(
      middleTimbre.harmonicRatio
    );
    expect(lowTimbre.noiseMix).toBeLessThan(middleTimbre.noiseMix ?? Infinity);
    expect(highTimbre.noiseMix).toBeGreaterThan(middleTimbre.noiseMix ?? 0);
  });

  it('changes note timbre based on note velocity', () => {
    const baseTimbre = resolveProceduralInstrumentTimbre({
      family: 'piano',
      brightness: 1,
      harmonicSignal: 0.5,
      filterSignal: 0.5,
    });
    const softVelocity = resolveProceduralNoteVelocity({
      volume: 0.03,
      role: 'lead',
    });
    const loudVelocity = resolveProceduralNoteVelocity({
      volume: 0.08,
      role: 'lead',
    });
    const softTimbre = resolveVelocityShapedInstrumentTimbre({
      timbre: baseTimbre,
      velocity: softVelocity,
    });
    const loudTimbre = resolveVelocityShapedInstrumentTimbre({
      timbre: baseTimbre,
      velocity: loudVelocity,
    });

    expect(loudVelocity).toBeGreaterThan(softVelocity);
    expect(loudTimbre.filterCutoffHz).toBeGreaterThan(
      softTimbre.filterCutoffHz
    );
    expect(loudTimbre.harmonicRatio).toBeGreaterThan(softTimbre.harmonicRatio);
    expect(loudTimbre.transientMix).toBeGreaterThan(
      softTimbre.transientMix ?? 0
    );
  });

  it('defines one known-good patch for each core song role', () => {
    const patches = listKnownGoodInstrumentPatches();

    expect(patches.map((patch) => patch.role)).toEqual([
      'lead',
      'harmony',
      'bass',
      'percussion',
    ]);
    expect(resolveKnownGoodInstrumentPatch('lead').label).toContain('lead');
    expect(resolveKnownGoodInstrumentPatch('bass').family).toBe('upright-bass');
    expect(resolveKnownGoodInstrumentPatch('percussion').family).toBe('kick');
  });

  it('keeps known-good patches inside their family recipe ranges', () => {
    for (const patch of listKnownGoodInstrumentPatches()) {
      const recipe = resolveInstrumentPatchRecipe(patch.family);

      expect(recipe.waveformOptions).toContain(patch.waveform);
      expect(patch.attackMs).toBeGreaterThanOrEqual(recipe.attackMsRange.min);
      expect(patch.attackMs).toBeLessThanOrEqual(recipe.attackMsRange.max);
      expect(patch.releaseMs).toBeGreaterThanOrEqual(recipe.releaseMsRange.min);
      expect(patch.releaseMs).toBeLessThanOrEqual(recipe.releaseMsRange.max);
      expect(patch.detuneCents).toBeGreaterThanOrEqual(
        recipe.detuneCentsRange.min
      );
      expect(patch.detuneCents).toBeLessThanOrEqual(
        recipe.detuneCentsRange.max
      );
      expect(patch.harmonicGain).toBeGreaterThanOrEqual(
        recipe.harmonicGainRange.min
      );
      expect(patch.harmonicGain).toBeLessThanOrEqual(
        recipe.harmonicGainRange.max
      );
      expect(patch.pulseRate).toBeGreaterThanOrEqual(recipe.pulseRateRange.min);
      expect(patch.pulseRate).toBeLessThanOrEqual(recipe.pulseRateRange.max);
      expect(patch.brightness).toBeGreaterThanOrEqual(
        recipe.brightnessRange.min
      );
      expect(patch.brightness).toBeLessThanOrEqual(recipe.brightnessRange.max);
    }
  });

  it('keeps known-good role patches clearly distinct from each other', () => {
    const lead = resolveKnownGoodInstrumentPatch('lead');
    const harmony = resolveKnownGoodInstrumentPatch('harmony');
    const bass = resolveKnownGoodInstrumentPatch('bass');
    const percussion = resolveKnownGoodInstrumentPatch('percussion');

    expect(lead.family).not.toBe(harmony.family);
    expect(harmony.family).not.toBe(bass.family);
    expect(bass.family).not.toBe(percussion.family);
    expect(lead.timbre.noiseMix).toBeGreaterThan(0.1);
    expect(harmony.timbre.bodySustainLevel).toBeGreaterThan(0.85);
    expect(bass.timbre.filterCutoffHz).toBeLessThan(lead.timbre.filterCutoffHz);
    expect(percussion.releaseMs).toBeLessThan(harmony.releaseMs / 3);
  });

  it('compares an exact reference patch to itself with perfect similarity', () => {
    const leadReference = resolveKnownGoodInstrumentPatch('lead');
    const comparison = compareInstrumentPatchToKnownGoodRolePatch({
      role: 'lead',
      patch: leadReference,
    });

    expect(comparison.similarityScore).toBe(1);
    expect(comparison.familyMatches).toBe(true);
    expect(comparison.waveformMatches).toBe(true);
    expect(
      comparison.prominentDifferences.every(
        (difference) => difference.similarity === 1
      )
    ).toBe(true);
  });

  it('marks identical pitched role patches as invalidly similar', () => {
    const leadReference = resolveKnownGoodInstrumentPatch('lead');
    const bankDistinctness = resolveProceduralInstrumentRolePatchDistinctness({
      lead: {
        id: 'lead',
        supportedRoles: ['lead'],
        recommendedMidiRange: { minMidiNote: 60, maxMidiNote: 84 },
        preferredMidiRange: { minMidiNote: 64, maxMidiNote: 79 },
        defaultVelocity: 108,
        defaultNoteDurationMs: 240,
        knownGoodPatchComparison: compareInstrumentPatchToKnownGoodRolePatch({
          role: 'lead',
          patch: leadReference,
        }),
        ...leadReference,
      },
      harmony: {
        id: 'harmony',
        supportedRoles: ['harmony'],
        recommendedMidiRange: { minMidiNote: 48, maxMidiNote: 72 },
        preferredMidiRange: { minMidiNote: 52, maxMidiNote: 67 },
        defaultVelocity: 96,
        defaultNoteDurationMs: 300,
        knownGoodPatchComparison: compareInstrumentPatchToKnownGoodRolePatch({
          role: 'harmony',
          patch: leadReference,
        }),
        ...leadReference,
        role: 'harmony',
      },
      bass: {
        id: 'bass',
        supportedRoles: ['bass'],
        recommendedMidiRange: { minMidiNote: 36, maxMidiNote: 60 },
        preferredMidiRange: { minMidiNote: 40, maxMidiNote: 55 },
        defaultVelocity: 96,
        defaultNoteDurationMs: 360,
        knownGoodPatchComparison: compareInstrumentPatchToKnownGoodRolePatch({
          role: 'bass',
          patch: leadReference,
        }),
        ...leadReference,
        role: 'bass',
      },
      percussion: {
        id: 'percussion',
        supportedRoles: ['percussion'],
        recommendedMidiRange: { minMidiNote: 36, maxMidiNote: 60 },
        preferredMidiRange: { minMidiNote: 36, maxMidiNote: 48 },
        defaultVelocity: 112,
        defaultNoteDurationMs: 120,
        knownGoodPatchComparison: compareInstrumentPatchToKnownGoodRolePatch({
          role: 'percussion',
          patch: resolveKnownGoodInstrumentPatch('percussion'),
        }),
        ...resolveKnownGoodInstrumentPatch('percussion'),
      },
    });

    expect(bankDistinctness.isValid).toBe(false);
    expect(bankDistinctness.rejectedComparisons[0]?.similarityScore).toBe(1);
    expect(bankDistinctness.rejectedComparisons[0]).toEqual(
      expect.objectContaining({
        leftRole: 'lead',
        rightRole: 'harmony',
      })
    );
  });

  it('adds shared sound bank registry metadata to generated instruments', () => {
    const bank = createProceduralInstrumentBank(
      resolveMusicTheme('forest', 'overworld', undefined, 2, -3),
      2,
      -3,
      {
        tileKind: 'forest',
        contextType: 'overworld',
        dayProgress: 0.35,
        yearProgress: 0.2,
      }
    );

    expect(bank.themeId).toBe('deep-forest');
    expect(bank.instruments.lead.id).toBe('deep-forest:lead:2:-3');
    expect(bank.instruments.lead.supportedRoles).toEqual(['lead']);
    expect(bank.instruments.harmony.supportedRoles).toEqual(['harmony']);
    expect(bank.instruments.bass.supportedRoles).toEqual(['bass']);
    expect(bank.instruments.percussion.supportedRoles).toEqual(['percussion']);
    expect(bank.instruments.lead.recommendedMidiRange).toEqual({
      minMidiNote: 60,
      maxMidiNote: 84,
    });
    expect(bank.instruments.lead.generalMidiProgramNumber).toBe(80);
    expect(bank.instruments.lead.generalMidiInstrumentName).toBe(
      'Lead 1 (square)'
    );
    expect(bank.instruments.lead.generalMidiFamilyName).toBe('Synth Lead');
    expect(bank.instruments.bass.generalMidiProgramNumber).toBe(33);
    expect(bank.instruments.bass.generalMidiFamilyName).toBe('Bass');
    expect(bank.instruments.percussion.generalMidiProgramNumber).toBeNull();
    expect(bank.instruments.percussion.generalMidiInstrumentName).toBe(
      'Standard Drum Kit'
    );
    expect(bank.instruments.percussion.generalMidiFamilyName).toBe(
      'Percussion Kit'
    );
    expect(bank.instruments.lead.preferredMidiRange).toEqual({
      minMidiNote: 64,
      maxMidiNote: 79,
    });
    expect(bank.instruments.lead.defaultVelocity).toBe(108);
    expect(bank.instruments.bass.defaultVelocity).toBe(96);
    expect(bank.instruments.harmony.defaultNoteDurationMs).toBeGreaterThan(0);
    expect(
      bank.instruments.harmony.defaultNoteDurationMs
    ).toBeGreaterThanOrEqual(bank.instruments.lead.defaultNoteDurationMs);
    expect(bank.instruments.lead.knownGoodPatchComparison.role).toBe('lead');
    expect(bank.instruments.harmony.knownGoodPatchComparison.role).toBe(
      'harmony'
    );
    expect(bank.rolePatchDistinctness.isValid).toBe(true);
  });

  it('keeps the music sink idle until a user-triggered resume creates audio', () => {
    const contextInstances: Array<{
      state: AudioContextState;
      sampleRate: number;
      outputLatency: number;
      destination: object;
      createGain: ReturnType<typeof vi.fn>;
      gainNode: {
        gain: {
          setValueAtTime: ReturnType<typeof vi.fn>;
        };
        connect: ReturnType<typeof vi.fn>;
      };
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'suspended';
      currentTime = 0;
      destination = {};
      sampleRate = 48_000;
      outputLatency = 0.021;
      gainNode = {
        gain: {
          setValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
      createGain = vi.fn(() => this.gainNode as unknown as GainNode);
      constructor() {
        contextInstances.push(this);
      }
      resume() {
        this.state = 'running';
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioMusicSink();

      expect(sink.getAudioState?.()).toBe('idle');
      expect(sink.getAudioSampleRate?.()).toBeNull();
      expect(sink.getOutputLatencySeconds?.()).toBeNull();
      expect(sink.getMasterGain?.()).toBe(1);
      expect(sink.isMuted?.()).toBe(false);
      expect(contextInstances).toHaveLength(0);

      expect(sink.setMasterGain?.(0.35)).toBe(0.35);
      expect(sink.setMuted?.(true)).toBe(true);

      sink.resume?.();

      expect(contextInstances).toHaveLength(1);
      expect(sink.getAudioState?.()).toBe('running');
      expect(sink.getAudioSampleRate?.()).toBe(48_000);
      expect(sink.getOutputLatencySeconds?.()).toBe(0.021);
      expect(sink.getMasterGain?.()).toBe(0.35);
      expect(sink.isMuted?.()).toBe(true);
      expect(sink.setMuted?.(false)).toBe(false);
      expect(sink.isMuted?.()).toBe(false);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('reports when web audio is unavailable for the music sink', () => {
    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', undefined);

    try {
      const sink = createWebAudioMusicSink();

      expect(sink.getAudioState?.()).toBe('unavailable');
      expect(sink.getAudioSampleRate?.()).toBeNull();
      expect(sink.getOutputLatencySeconds?.()).toBeNull();
      expect(sink.getMasterGain?.()).toBe(1);
      expect(sink.isMuted?.()).toBe(false);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('tracks active web audio music sources while notes are still playing', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      finish(): void;
      type: string;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      detune: {
        setValueAtTime: ReturnType<typeof vi.fn>;
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
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];
    const createdPanners: Array<{
      pan: {
        setValueAtTime: ReturnType<typeof vi.fn>;
      };
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
          },
          detune: {
            setValueAtTime: vi.fn(),
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
      createBiquadFilter() {
        const filter = {
          type: 'lowpass' as BiquadFilterType,
          frequency: {
            setValueAtTime: vi.fn(),
          },
          Q: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdFilters.push(filter);
        return filter as unknown as BiquadFilterNode;
      }
      createStereoPanner() {
        const panner = {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        createdPanners.push(panner);
        return panner as unknown as StereoPannerNode;
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
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioMusicSink();
      sink.play({
        themeId: 'frontier-plains',
        instrumentId: 'lead',
        role: 'lead',
        startMs: 0,
        durationMs: 240,
        frequency: 440,
        volume: 0.05,
        waveform: 'sine',
        timbre: {
          harmonicWaveform: 'triangle',
          harmonicRatio: 2.6,
          filterType: 'bandpass',
          filterCutoffHz: 1800,
          filterQ: 1.7,
        },
        attackMs: 20,
        releaseMs: 80,
        detuneCents: 0,
        harmonicGain: 0.4,
        pulseRate: 1,
      });

      expect(sink.getActiveSourceCount?.()).toBe(2);
      expect(createdFilters).toHaveLength(3);
      expect(createdOscillators[1]?.type).toBe('triangle');
      expect(
        createdOscillators[1]?.frequency.setValueAtTime
      ).toHaveBeenCalledWith(440 * 2.6, 0);
      expect(createdFilters[0]?.type).toBe('bandpass');
      expect(createdFilters[1]?.type).toBe('highpass');
      expect(createdFilters[2]?.type).toBe('lowpass');
      expect(createdPanners).toHaveLength(1);
      expect(createdDelays).toHaveLength(0);
      expect(createdPanners[0]?.pan.setValueAtTime.mock.calls[0]?.[0]).not.toBe(
        0
      );
      expect(createdGains[0]?.connect).toHaveBeenCalledWith(
        expect.objectContaining({})
      );
      createdOscillators[0]?.finish();
      expect(sink.getActiveSourceCount?.()).toBe(1);
      createdOscillators[1]?.finish();
      expect(sink.getActiveSourceCount?.()).toBe(0);
      expect(createdOscillators[0]?.disconnect).toHaveBeenCalled();
      expect(createdOscillators[1]?.disconnect).toHaveBeenCalled();
      expect(createdFilters[0]?.disconnect).toHaveBeenCalled();
      expect(createdPanners[0]?.disconnect).toHaveBeenCalled();
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('can stop all active web audio music sources early for debug playback', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      stop: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 3;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          detune: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
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
        } as unknown as GainNode;
      }
      createBiquadFilter() {
        return {
          type: 'lowpass' as BiquadFilterType,
          frequency: {
            setValueAtTime: vi.fn(),
          },
          Q: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        } as unknown as BiquadFilterNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      createDelay() {
        return {
          delayTime: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        } as unknown as DelayNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioMusicSink();
      sink.play({
        themeId: 'frontier-plains',
        instrumentId: 'lead',
        role: 'lead',
        startMs: 0,
        durationMs: 240,
        frequency: 440,
        volume: 0.05,
        waveform: 'sine',
        timbre: {
          harmonicWaveform: 'triangle',
          harmonicRatio: 2,
          filterType: 'lowpass',
          filterCutoffHz: 1200,
          filterQ: 0.8,
        },
        attackMs: 20,
        releaseMs: 80,
        detuneCents: 0,
        harmonicGain: 0.4,
        pulseRate: 1,
      });

      sink.stopAll?.();

      expect(sink.getActiveSourceCount?.()).toBe(0);
      expect(createdOscillators).toHaveLength(2);
      expect(createdOscillators[0]?.stop).toHaveBeenCalledWith(3);
      expect(createdOscillators[1]?.stop).toHaveBeenCalledWith(3);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('disposes the web audio music sink and closes its audio context', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      stop: ReturnType<typeof vi.fn>;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      detune: {
        setValueAtTime: ReturnType<typeof vi.fn>;
      };
      type: string;
      start: ReturnType<typeof vi.fn>;
    }> = [];
    const createdGains: Array<{
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
    }> = [];
    const close = vi.fn(() => Promise.resolve());

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 5;
      destination = {};
      close = close;
      createOscillator() {
        const oscillator = {
          onended: null as ((event: Event) => void) | null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          detune: {
            setValueAtTime: vi.fn(),
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
      createBiquadFilter() {
        return {
          type: 'lowpass' as BiquadFilterType,
          frequency: {
            setValueAtTime: vi.fn(),
          },
          Q: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as BiquadFilterNode;
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
      createDelay() {
        return {
          delayTime: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as DelayNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioMusicSink();
      sink.play({
        themeId: 'frontier-plains',
        instrumentId: 'lead',
        role: 'lead',
        startMs: 0,
        durationMs: 240,
        frequency: 440,
        volume: 0.05,
        waveform: 'sine',
        timbre: {
          harmonicWaveform: 'triangle',
          harmonicRatio: 2,
          filterType: 'lowpass',
          filterCutoffHz: 1200,
          filterQ: 0.8,
        },
        attackMs: 20,
        releaseMs: 80,
        detuneCents: 0,
        harmonicGain: 0.4,
        pulseRate: 1,
      });

      sink.dispose?.();

      expect(createdOscillators[0]?.stop).toHaveBeenCalledWith(5);
      expect(createdOscillators[1]?.stop).toHaveBeenCalledWith(5);
      expect(createdGains[0]?.disconnect).toHaveBeenCalled();
      expect(close).toHaveBeenCalledTimes(1);
      expect(sink.getActiveSourceCount?.()).toBe(0);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('applies the music category volume before scheduling gain envelopes', () => {
    const createdGains: Array<{
      gain: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          onended: null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          detune: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
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
        };
        createdGains.push(gain);
        return gain as unknown as GainNode;
      }
      createBiquadFilter() {
        return {
          type: 'lowpass' as BiquadFilterType,
          frequency: {
            setValueAtTime: vi.fn(),
          },
          Q: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        } as unknown as BiquadFilterNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      createDelay() {
        return {
          delayTime: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        } as unknown as DelayNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioMusicSink({
        getCategoryVolume() {
          return 0.5;
        },
      });
      sink.play({
        themeId: 'frontier-plains',
        instrumentId: 'lead',
        role: 'lead',
        startMs: 0,
        durationMs: 240,
        frequency: 440,
        volume: 0.05,
        waveform: 'sine',
        timbre: {
          harmonicWaveform: 'triangle',
          harmonicRatio: 2,
          filterType: 'lowpass',
          filterCutoffHz: 1200,
          filterQ: 0.8,
        },
        attackMs: 20,
        releaseMs: 80,
        detuneCents: 0,
        harmonicGain: 0.4,
        pulseRate: 1,
      });

      const envelopeCalls =
        createdGains[0]?.gain.exponentialRampToValueAtTime.mock.calls ?? [];
      expect(envelopeCalls[0]?.[0]).toBeCloseTo(0.025, 6);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('caps active procedural music oscillators and evicts weaker older voices', () => {
    const createdOscillators: Array<{
      onended: ((event: Event) => void) | null;
      stop: ReturnType<typeof vi.fn>;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      detune: {
        setValueAtTime: ReturnType<typeof vi.fn>;
      };
      type: string;
      start: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
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
          },
          detune: {
            setValueAtTime: vi.fn(),
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
      createBiquadFilter() {
        return {
          type: 'lowpass' as BiquadFilterType,
          frequency: {
            setValueAtTime: vi.fn(),
          },
          Q: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as BiquadFilterNode;
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
      createDelay() {
        return {
          delayTime: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as DelayNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioMusicSink();
      const noteCount = MAX_ACTIVE_PROCEDURAL_MUSIC_OSCILLATORS / 2;
      for (let index = 0; index < noteCount; index += 1) {
        sink.play({
          themeId: 'frontier-plains',
          instrumentId: `lead-${index}`,
          role: 'lead',
          startMs: 0,
          durationMs: 240,
          frequency: 440 + index,
          volume: 0.02,
          waveform: 'sine',
          timbre: {
            harmonicWaveform: 'triangle',
            harmonicRatio: 2,
            filterType: 'lowpass',
            filterCutoffHz: 1200,
            filterQ: 0.8,
          },
          attackMs: 20,
          releaseMs: 80,
          detuneCents: 0,
          harmonicGain: 0.4,
          pulseRate: 1,
        });
      }

      expect(sink.getActiveSourceCount?.()).toBe(
        MAX_ACTIVE_PROCEDURAL_MUSIC_OSCILLATORS
      );

      sink.play({
        themeId: 'frontier-plains',
        instrumentId: 'lead-priority',
        role: 'lead',
        startMs: 0,
        durationMs: 240,
        frequency: 660,
        volume: 0.08,
        waveform: 'sine',
        timbre: {
          harmonicWaveform: 'triangle',
          harmonicRatio: 2,
          filterType: 'lowpass',
          filterCutoffHz: 1200,
          filterQ: 0.8,
        },
        attackMs: 20,
        releaseMs: 80,
        detuneCents: 0,
        harmonicGain: 0.4,
        pulseRate: 1,
      });

      expect(sink.getActiveSourceCount?.()).toBe(
        MAX_ACTIVE_PROCEDURAL_MUSIC_OSCILLATORS
      );
      expect(createdOscillators[0]?.stop).toHaveBeenCalled();
      expect(createdOscillators[1]?.stop).toHaveBeenCalled();
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('shares one reverb bus per environment profile and lengthens cave ambience', () => {
    const createdDelays: Array<{
      delayTime: {
        setValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          onended: null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          detune: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        } as unknown as OscillatorNode;
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
      createBiquadFilter() {
        return {
          type: 'lowpass' as BiquadFilterType,
          frequency: {
            setValueAtTime: vi.fn(),
          },
          Q: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        } as unknown as BiquadFilterNode;
      }
      createStereoPanner() {
        return {
          pan: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        } as unknown as StereoPannerNode;
      }
      createDelay() {
        const delay = {
          delayTime: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        };
        createdDelays.push(delay);
        return delay as unknown as DelayNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioMusicSink();
      sink.play({
        themeId: 'town-square',
        instrumentId: 'town-square:lead:3:-2',
        role: 'lead',
        startMs: 0,
        durationMs: 240,
        frequency: 440,
        volume: 0.05,
        waveform: 'sine',
        timbre: {
          harmonicWaveform: 'triangle',
          harmonicRatio: 2.6,
          filterType: 'bandpass',
          filterCutoffHz: 1800,
          filterQ: 1.7,
        },
        attackMs: 20,
        releaseMs: 80,
        detuneCents: 0,
        harmonicGain: 0.4,
        pulseRate: 1,
        space: {
          id: 'settlement-hall',
          label: 'settlement hall',
          wetGain: 0.22,
          delayMs: 92,
          toneHz: 2100,
        },
      });
      sink.play({
        themeId: 'town-square',
        instrumentId: 'town-square:harmony:3:-2',
        role: 'harmony',
        startMs: 0,
        durationMs: 240,
        frequency: 330,
        volume: 0.04,
        waveform: 'triangle',
        timbre: {
          harmonicWaveform: 'sine',
          harmonicRatio: 1.8,
          filterType: 'lowpass',
          filterCutoffHz: 1400,
          filterQ: 0.8,
        },
        attackMs: 28,
        releaseMs: 110,
        detuneCents: 0,
        harmonicGain: 0.3,
        pulseRate: 0.9,
        space: {
          id: 'settlement-hall',
          label: 'settlement hall',
          wetGain: 0.22,
          delayMs: 92,
          toneHz: 2100,
        },
      });
      sink.play({
        themeId: 'cavern-echo',
        instrumentId: 'cavern-echo:lead:3:-2',
        role: 'lead',
        startMs: 0,
        durationMs: 240,
        frequency: 220,
        volume: 0.05,
        waveform: 'sine',
        timbre: {
          harmonicWaveform: 'triangle',
          harmonicRatio: 2,
          filterType: 'bandpass',
          filterCutoffHz: 1200,
          filterQ: 1,
        },
        attackMs: 20,
        releaseMs: 100,
        detuneCents: 0,
        harmonicGain: 0.35,
        pulseRate: 1,
        space: {
          id: 'cavern-echo',
          label: 'cavern echo',
          wetGain: 0.34,
          delayMs: 148,
          toneHz: 1650,
        },
      });

      expect(createdDelays).toHaveLength(2);
      expect(
        createdDelays[0]?.delayTime.setValueAtTime.mock.calls[0]?.[0]
      ).toBeCloseTo(0.092, 6);
      expect(
        createdDelays[1]?.delayTime.setValueAtTime.mock.calls[0]?.[0]
      ).toBeCloseTo(0.148, 6);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('selects stable regional themes from the current tile and context', () => {
    expect(resolveMusicTheme('forest', 'overworld').id).toBe('deep-forest');
    expect(resolveMusicTheme('shore', 'overworld').id).toBe('coastal-shore');
    expect(resolveMusicTheme('town', 'town').id).toBe('town-square');
    expect(resolveMusicTheme('floor', 'building').id).toBe('interior-hall');
    expect(resolveMusicTheme('plains', 'cave').id).toBe('cavern-echo');
    expect(resolveMusicTheme('plains', 'overworld').id).toBe('frontier-plains');
  });

  it('attaches explicit vocabularies that can shift across larger regions', () => {
    const nearbyForest = resolveMusicTheme(
      'forest',
      'overworld',
      undefined,
      4,
      8
    );
    const distantForest = resolveMusicTheme(
      'forest',
      'overworld',
      undefined,
      260,
      -160
    );

    expect(nearbyForest.vocabulary.biomeLabel).toBe('forest');
    expect(nearbyForest.vocabulary.modeLabel).not.toHaveLength(0);
    expect(nearbyForest.vocabulary.regionLabel).not.toBe(
      distantForest.vocabulary.regionLabel
    );
    expect(nearbyForest.vocabulary.preferredIntervals).not.toEqual(
      distantForest.vocabulary.preferredIntervals
    );
  });

  it('shares a regional four-note motif while adapting it for local context', () => {
    const plainsTheme = resolveMusicTheme(
      'plains',
      'overworld',
      undefined,
      96,
      0
    );
    const townMotif = resolveProceduralThemeMotif({
      themeId: 'frontier-plains',
      contextType: 'town',
      tileKind: 'town',
      clusterX: 96,
      clusterY: 0,
    });
    const ruinsMotif = resolveProceduralThemeMotif({
      themeId: 'frontier-plains',
      tileKind: 'ruins',
      clusterX: 96,
      clusterY: 0,
    });

    expect(plainsTheme.motif.sharedDegreeOffsets).toEqual([0, 2, 4, 2]);
    expect(townMotif.sharedDegreeOffsets).toEqual(
      plainsTheme.motif.sharedDegreeOffsets
    );
    expect(townMotif.adaptedDegreeOffsets).not.toEqual(
      plainsTheme.motif.adaptedDegreeOffsets
    );
    expect(ruinsMotif.adaptedDegreeOffsets).not.toEqual(
      plainsTheme.motif.adaptedDegreeOffsets
    );
  });

  it('changes tempo and brightness with time of day and weather', () => {
    expect(resolveMusicMood({ dayProgress: 0.5 })).toEqual(
      expect.objectContaining({
        tempoMultiplier: 1.04,
        brightness: 1.08,
      })
    );
    expect(resolveMusicMood({ dayProgress: 0.9 })).toEqual(
      expect.objectContaining({
        tempoMultiplier: 0.82,
        brightness: 0.78,
        volumeMultiplier: 0.88,
      })
    );
    expect(
      resolveMusicMood({
        dayProgress: 0.52,
        weatherKind: 'heavy-rain',
        weatherIntensity: 0.9,
      })
    ).toEqual(
      expect.objectContaining({
        volumeMultiplier: 0.82,
      })
    );

    expect(
      resolveMusicMood({
        dayProgress: 0.52,
        combatIntensity: 1,
      }).tempoMultiplier
    ).toBeGreaterThan(resolveMusicMood({ dayProgress: 0.52 }).tempoMultiplier);
  });

  it('intensifies arrangements during combat with stronger percussion and lower bass', () => {
    const arrangement = resolveMusicArrangement({
      dayProgress: 0.5,
      yearProgress: 0.5,
      combatIntensity: 0.8,
    });

    expect(
      arrangement.roleProfiles.percussion.volumeMultiplier
    ).toBeGreaterThan(1);
    expect(arrangement.roleProfiles.bass.octaveShiftSemitones).toBe(-12);
    expect(arrangement.roleProfiles.lead.durationMultiplier).toBeLessThan(1);
  });

  it('softens nighttime arrangements by lowering percussion density and extending softer layers', () => {
    const arrangement = resolveMusicArrangement({
      dayProgress: 0.9,
      yearProgress: 0.5,
    });

    expect(arrangement.roleProfiles.percussion).toEqual(
      expect.objectContaining({
        volumeMultiplier: 0.2,
        skipEvery: 2,
      })
    );
    expect(arrangement.roleProfiles.harmony.releaseMultiplier).toBeGreaterThan(
      1
    );
    expect(arrangement.roleProfiles.harmony.volumeMultiplier).toBeLessThan(1);
    expect(arrangement.roleProfiles.lead.durationMultiplier).toBeGreaterThan(1);
  });

  it('gives winter arrangements a higher, sparser, bell-like profile', () => {
    const arrangement = resolveMusicArrangement({
      dayProgress: 0.5,
      yearProgress: 0,
    });

    expect(arrangement.roleProfiles.lead).toEqual(
      expect.objectContaining({
        octaveShiftSemitones: 12,
        waveformOverride: 'triangle',
      })
    );
    expect(arrangement.roleProfiles.harmony.skipEvery).toBe(2);
    expect(arrangement.roleProfiles.percussion).toEqual(
      expect.objectContaining({
        skipEvery: 4,
        waveformOverride: 'triangle',
      })
    );
  });

  it('builds stable region signatures for cluster-level theme variation', () => {
    expect(
      getMusicRegionSignature({
        tileKind: 'forest',
        contextType: 'overworld',
        clusterX: 3,
        clusterY: -2,
      })
    ).toBe('deep-forest:overworld:3:-2');
  });

  it('schedules a short deterministic lookahead of notes for a region', () => {
    const scheduled = scheduleProceduralMusicNotes({
      nowMs: 1000,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.5,
      clusterX: 1,
      clusterY: 2,
    });

    expect(scheduled.notes.length).toBeGreaterThan(1);
    expect(scheduled.notes[0]).toEqual(
      expect.objectContaining({
        themeId: 'deep-forest',
        instrumentId: expect.stringContaining('deep-forest'),
        role: 'bass',
      })
    );
    expect(scheduled.state.regionSignature).toBe(
      'ambient:deep-forest:overworld:1:2'
    );
    expect(scheduled.state.nextNoteAtMs).toBeGreaterThan(1000);
  });

  it('uses recurring rhythmic motifs instead of uniform note spacing', () => {
    const scheduled = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.5,
      yearProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
    });
    const deltas = scheduled.notes
      .slice(1)
      .map((note, index) => note.startMs - scheduled.notes[index]!.startMs);

    expect(
      new Set(deltas.map((delta) => delta.toFixed(3))).size
    ).toBeGreaterThan(1);

    const repeated = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.5,
      yearProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
    });
    expect(repeated.notes.map((note) => note.startMs)).toEqual(
      scheduled.notes.map((note) => note.startMs)
    );
  });

  it('accents strong 4/4 beats with stronger generated notes', () => {
    const scheduled = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.5,
      yearProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
    });

    const strongNotes = scheduled.notes.filter(
      (note, index) => resolveProceduralMeterPosition(index).isStrongBeat
    );
    const weakNotes = scheduled.notes.filter(
      (note, index) => !resolveProceduralMeterPosition(index).isStrongBeat
    );
    const average = (values: number[]) =>
      values.reduce((total, value) => total + value, 0) / values.length;

    expect(strongNotes.length).toBeGreaterThan(0);
    expect(weakNotes.length).toBeGreaterThan(0);
    expect(average(strongNotes.map((note) => note.volume))).toBeGreaterThan(
      average(weakNotes.map((note) => note.volume))
    );
  });

  it('resets scheduling cleanly when the player moves into a new region cluster', () => {
    const first = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
    });
    const second = scheduleProceduralMusicNotes(
      {
        nowMs: 400,
        tileKind: 'forest',
        contextType: 'overworld',
        dayProgress: 0.5,
        clusterX: 2,
        clusterY: 1,
      },
      first.state
    );

    expect(second.notes[0]?.themeId).toBe('deep-forest');
    expect(second.state.regionSignature).toBe(
      'ambient:deep-forest:overworld:2:1'
    );
    expect(second.state.stepIndex).toBeGreaterThan(0);
  });

  it('thins percussion and softens harmony in nighttime note scheduling', () => {
    const dayScheduled = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.5,
      yearProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
    });
    const nightScheduled = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.9,
      yearProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
    });

    const dayPercussion = dayScheduled.notes.filter(
      (note) => note.role === 'percussion'
    );
    const nightPercussion = nightScheduled.notes.filter(
      (note) => note.role === 'percussion'
    );
    const dayHarmony = dayScheduled.notes.find(
      (note) => note.role === 'harmony'
    );
    const nightHarmony = nightScheduled.notes.find(
      (note) => note.role === 'harmony'
    );

    expect(dayPercussion.length).toBeGreaterThan(nightPercussion.length);
    expect(nightHarmony).toEqual(expect.objectContaining({ role: 'harmony' }));
    expect(dayHarmony).toEqual(expect.objectContaining({ role: 'harmony' }));
    expect(
      (nightHarmony?.volume ?? 0) / (dayHarmony?.volume ?? 1)
    ).toBeLessThan(0.75);
    expect(
      (nightHarmony?.releaseMs ?? 0) / (dayHarmony?.releaseMs ?? 1)
    ).toBeGreaterThan(1.5);
  });

  it('keeps ambient forest percussion quieter than the pitched roles', () => {
    const introScheduled = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.5,
      yearProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
    });
    const scheduled = scheduleProceduralMusicNotes(
      {
        nowMs: introScheduled.state.nextNoteAtMs,
        tileKind: 'forest',
        contextType: 'overworld',
        dayProgress: 0.5,
        yearProgress: 0.5,
        clusterX: 0,
        clusterY: 0,
      },
      introScheduled.state
    );

    const percussionNotes = scheduled.notes.filter(
      (note) => note.role === 'percussion'
    );
    const pitchedNotes = scheduled.notes.filter(
      (note) => note.role !== 'percussion'
    );
    const average = (values: readonly number[]) =>
      values.reduce((total, value) => total + value, 0) / values.length;
    const percussionAverageVolume = average(
      percussionNotes.map((note) => note.volume)
    );
    const pitchedAverageVolume = average(
      pitchedNotes.map((note) => note.volume)
    );

    expect(percussionNotes.length).toBeGreaterThan(0);
    expect(pitchedNotes.length).toBeGreaterThan(0);
    expect(percussionAverageVolume).toBeLessThan(pitchedAverageVolume * 0.7);
  });

  it('keeps pitched note semitone mapping stable across mood brightness changes', () => {
    const dayScheduled = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.5,
      yearProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
    });
    const nightScheduled = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.9,
      yearProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
    });
    const theme = resolveMusicTheme('town', 'town');
    const toRelativeSemitones = (frequency: number) =>
      Math.round(Math.log2(frequency / theme.rootHz) * 12);
    const firstSemitoneByRole = (
      notes: typeof dayScheduled.notes
    ): Record<'lead' | 'harmony' | 'bass', number> => ({
      lead: toRelativeSemitones(
        notes.find((note) => note.role === 'lead')?.frequency ?? theme.rootHz
      ),
      harmony: toRelativeSemitones(
        notes.find((note) => note.role === 'harmony')?.frequency ?? theme.rootHz
      ),
      bass: toRelativeSemitones(
        notes.find((note) => note.role === 'bass')?.frequency ?? theme.rootHz
      ),
    });

    expect(firstSemitoneByRole(dayScheduled.notes)).toEqual(
      firstSemitoneByRole(nightScheduled.notes)
    );
  });

  it('pushes winter lead lines into a brighter higher register during scheduling', () => {
    const summerScheduled = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.5,
      yearProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
    });
    const winterScheduled = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.5,
      yearProgress: 0,
      clusterX: 0,
      clusterY: 0,
    });

    const summerLead = summerScheduled.notes.find(
      (note) => note.role === 'lead'
    );
    const winterLead = winterScheduled.notes.find(
      (note) => note.role === 'lead'
    );

    expect(summerLead).toEqual(expect.objectContaining({ role: 'lead' }));
    expect(winterLead).toEqual(expect.objectContaining({ role: 'lead' }));
    expect(winterLead?.waveform).toBe('triangle');
    expect(
      (winterLead?.frequency ?? 0) / (summerLead?.frequency ?? 1)
    ).toBeGreaterThan(1.9);
  });

  it('applies register-shaped timbre to scheduled notes from the same instrument patch', () => {
    const scheduled = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.5,
      yearProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
    });

    const lead = scheduled.notes.find((note) => note.role === 'lead');
    const bass = scheduled.notes.find((note) => note.role === 'bass');

    expect(lead).toEqual(expect.objectContaining({ role: 'lead' }));
    expect(bass).toEqual(expect.objectContaining({ role: 'bass' }));
    expect(lead?.timbre.filterCutoffHz).toBeDefined();
    expect(bass?.timbre.filterCutoffHz).toBeDefined();
    expect(
      (lead?.frequency ?? 0) / (bass?.frequency ?? Infinity)
    ).toBeGreaterThan(2);
    expect(lead?.timbre.filterCutoffHz ?? 0).toBeGreaterThan(
      bass?.timbre.filterCutoffHz ?? 0
    );
    expect(lead?.timbre.harmonicRatio ?? 0).toBeGreaterThan(
      bass?.timbre.harmonicRatio ?? 0
    );
  });

  it('applies velocity-shaped timbre to stronger percussion hits', () => {
    const quietNotes = createProceduralPercussionNotes({
      themeId: 'town-square',
      stepIndex: 0,
      phraseStep: 0,
      cadence: 'question',
      chordChange: false,
      startMs: 0,
      stepDurationMs: 240,
      rootMidiNote: 60,
      baseInstrumentId: 'town-square:percussion:0:0',
      baseVolume: 0.035,
      baseAttackMs: 8,
      baseReleaseMs: 40,
      baseDetuneCents: 0,
      baseHarmonicGain: 0.14,
      basePulseRate: 2.8,
      brightness: 1,
      clusterX: 0,
      clusterY: 0,
    });
    const loudNotes = createProceduralPercussionNotes({
      themeId: 'town-square',
      stepIndex: 0,
      phraseStep: 0,
      cadence: 'question',
      chordChange: false,
      startMs: 0,
      stepDurationMs: 240,
      rootMidiNote: 60,
      baseInstrumentId: 'town-square:percussion:0:0',
      baseVolume: 0.08,
      baseAttackMs: 8,
      baseReleaseMs: 40,
      baseDetuneCents: 0,
      baseHarmonicGain: 0.14,
      basePulseRate: 2.8,
      brightness: 1,
      clusterX: 0,
      clusterY: 0,
    });

    const quietKick = quietNotes.find((note) =>
      note.instrumentId.includes(':perc-kick-')
    );
    const loudKick = loudNotes.find((note) =>
      note.instrumentId.includes(':perc-kick-')
    );

    expect(quietKick).toEqual(expect.objectContaining({ role: 'percussion' }));
    expect(loudKick).toEqual(expect.objectContaining({ role: 'percussion' }));
    expect(loudKick?.velocity ?? 0).toBeGreaterThan(quietKick?.velocity ?? 0);
    expect(loudKick?.timbre.filterCutoffHz ?? 0).toBeGreaterThan(
      quietKick?.timbre.filterCutoffHz ?? 0
    );
    expect(loudKick?.timbre.harmonicRatio ?? 0).toBeGreaterThan(
      quietKick?.timbre.harmonicRatio ?? 0
    );
  });

  it('introduces deterministic rests without dropping the phrase anchors', () => {
    const first = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.5,
      yearProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
    });
    const second = scheduleProceduralMusicNotes(
      {
        nowMs: 1000,
        tileKind: 'plains',
        contextType: 'overworld',
        dayProgress: 0.5,
        yearProgress: 0.5,
        clusterX: 0,
        clusterY: 0,
      },
      first.state
    );
    const third = scheduleProceduralMusicNotes(
      {
        nowMs: 2000,
        tileKind: 'plains',
        contextType: 'overworld',
        dayProgress: 0.5,
        yearProgress: 0.5,
        clusterX: 0,
        clusterY: 0,
      },
      second.state
    );
    const scheduledNotes = [...first.notes, ...second.notes, ...third.notes];
    const theme = resolveMusicTheme('plains', 'overworld');
    const stepMs =
      theme.noteDurationMs /
      resolveMusicMood({ dayProgress: 0.5 }).tempoMultiplier;

    expect(scheduledNotes.some((note) => note.role === 'bass')).toBe(true);
    expect(
      scheduledNotes.some(
        (note, index, notes) =>
          index > 0 && note.startMs - notes[index - 1]!.startMs > stepMs * 1.5
      )
    ).toBe(true);

    const repeated = scheduleProceduralMusicNotes(
      {
        nowMs: 2000,
        tileKind: 'plains',
        contextType: 'overworld',
        dayProgress: 0.5,
        yearProgress: 0.5,
        clusterX: 0,
        clusterY: 0,
      },
      second.state
    );
    expect(repeated.notes.map((note) => [note.role, note.startMs])).toEqual(
      third.notes.map((note) => [note.role, note.startMs])
    );
  });

  it('keeps bass lines on allowed chord-tone classes while anchoring often to the root', () => {
    const theme = resolveMusicTheme('plains', 'overworld');
    const bassSemitones = Array.from({ length: 24 }, (_, stepIndex) => ({
      stepIndex,
      semitones: resolveProceduralInstrumentSemitones({
        theme,
        role: 'bass',
        stepIndex,
        clusterX: 0,
        clusterY: 0,
      }),
      chord: resolveProceduralChordAtStep(theme, stepIndex, 0, 0),
    }));

    expect(
      bassSemitones.filter(
        (entry) =>
          ((entry.semitones % 12) + 12) % 12 ===
          ((entry.chord.rootSemitones % 12) + 12) % 12
      ).length
    ).toBeGreaterThanOrEqual(bassSemitones.length / 3);
    for (const entry of bassSemitones) {
      expect([
        entry.chord.rootSemitones % 12,
        entry.chord.fifthSemitones % 12,
        entry.chord.passingSemitones % 12,
      ]).toContain(((entry.semitones % 12) + 12) % 12);
    }
  });

  it('emits simultaneous harmony chord tones for voiced triads', () => {
    const scheduled = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.5,
      yearProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
    });
    const harmonyStarts = scheduled.notes
      .filter((note) => note.role === 'harmony')
      .reduce<Map<number, number>>((counts, note) => {
        counts.set(note.startMs, (counts.get(note.startMs) ?? 0) + 1);
        return counts;
      }, new Map());

    expect([...harmonyStarts.values()].some((count) => count >= 3)).toBe(true);
  });

  it('sustains harmony notes across most of each chord window instead of short stabs', () => {
    const song = createProceduralMusicSong({
      nowMs: 0,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.5,
      yearProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
    });
    const harmonyNotes = song.notes.filter((note) => note.role === 'harmony');
    const harmonyStarts = [
      ...new Set(harmonyNotes.map((note) => note.startMs)),
    ].sort((left, right) => left - right);
    const harmonyStartDeltas = harmonyStarts
      .slice(1)
      .map((startMs, index) => startMs - harmonyStarts[index]!);
    const averageDurationMs =
      harmonyNotes.reduce((total, note) => total + note.durationMs, 0) /
      Math.max(1, harmonyNotes.length);
    const averageHarmonySpanMs =
      harmonyStartDeltas.reduce((total, delta) => total + delta, 0) /
      Math.max(1, harmonyStartDeltas.length);

    expect(harmonyNotes.length).toBeGreaterThan(0);
    expect(averageHarmonySpanMs).toBeGreaterThan(0);
    expect(averageDurationMs).toBeGreaterThan(averageHarmonySpanMs * 0.7);
  });

  it('applies softer panning and falloff for nearby ambient music emitters', () => {
    expect(getMusicSpatialMix({ x: 6, y: 0 }, { x: 0, y: 0 })).toEqual({
      gainMultiplier: expect.closeTo(1 / (1 + 6 * 0.45), 6),
      pan: expect.closeTo(6 / 7, 6),
    });
  });

  it('computes poi music mix and equal-power crossfade gains from distance', () => {
    expect(resolvePoiMusicMix(0.5)).toBe(1);
    expect(resolvePoiMusicMix(8)).toBe(0);
    expect(resolvePoiMusicMix(4.25)).toBeCloseTo(0.5, 6);
    expect(resolvePoiMusicBlendGains(0.5)).toEqual({
      ambientGain: expect.closeTo(Math.cos(Math.PI / 4), 6),
      poiGain: expect.closeTo(Math.sin(Math.PI / 4), 6),
    });
  });

  it('builds deterministic instrument banks with melody, harmony, bass, and percussion voices per cluster', () => {
    const theme = resolveMusicTheme('forest', 'overworld');
    const bank = createProceduralInstrumentBank(theme, 2, -1);

    expect(bank.themeId).toBe('deep-forest');
    expect(bank.instruments.lead).toEqual(
      expect.objectContaining({
        id: 'deep-forest:lead:2:-1',
        role: 'lead',
        family: expect.stringMatching(
          /^(vocals|lead-guitar|violin|flute|trumpet|synth-lead)$/
        ),
      })
    );
    expect(bank.instruments.harmony).toEqual(
      expect.objectContaining({
        id: 'deep-forest:harmony:2:-1',
        role: 'harmony',
        family: expect.stringMatching(
          /^(piano|guitar|organ|strings|synth-pad)$/
        ),
      })
    );
    expect(bank.instruments.bass).toEqual(
      expect.objectContaining({
        id: 'deep-forest:bass:2:-1',
        role: 'bass',
        family: expect.stringMatching(
          /^(bass-guitar|upright-bass|bass-synth|tuba)$/
        ),
      })
    );
    expect(bank.instruments.percussion).toEqual(
      expect.objectContaining({
        id: 'deep-forest:percussion:2:-1',
        role: 'percussion',
        family: expect.stringMatching(
          /^(kick|snare|cymbals|shaker|hand-percussion)$/
        ),
        timbre: expect.objectContaining({
          harmonicWaveform: expect.any(String),
          harmonicRatio: expect.any(Number),
          filterType: expect.any(String),
          filterCutoffHz: expect.any(Number),
          filterQ: expect.any(Number),
        }),
      })
    );
  });

  it('keeps each procedural role inside its representative instrument family pool', () => {
    const frontier = createProceduralInstrumentBank(
      resolveMusicTheme('plains', 'overworld'),
      0,
      0
    );
    const town = createProceduralInstrumentBank(
      resolveMusicTheme('town', 'town'),
      5,
      -3
    );

    for (const bank of [frontier, town]) {
      expect([
        'vocals',
        'lead-guitar',
        'violin',
        'flute',
        'trumpet',
        'synth-lead',
      ]).toContain(bank.instruments.lead.family);
      expect(['piano', 'guitar', 'organ', 'strings', 'synth-pad']).toContain(
        bank.instruments.harmony.family
      );
      expect(['bass-guitar', 'upright-bass', 'bass-synth', 'tuba']).toContain(
        bank.instruments.bass.family
      );
      expect([
        'kick',
        'snare',
        'cymbals',
        'shaker',
        'hand-percussion',
      ]).toContain(bank.instruments.percussion.family);
    }
  });

  it('can swap representative instrument families when time, weather, or location changes', () => {
    const theme = resolveMusicTheme('plains', 'overworld');
    const daytime = createProceduralInstrumentBank(theme, 3, 4, {
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.5,
      yearProgress: 0.5,
    });
    const nighttime = createProceduralInstrumentBank(theme, 3, 4, {
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.9,
      yearProgress: 0.5,
    });
    const stormy = createProceduralInstrumentBank(theme, 3, 4, {
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.5,
      yearProgress: 0.5,
      weatherKind: 'heavy-rain',
      weatherIntensity: 0.95,
    });
    const town = createProceduralInstrumentBank(
      resolveMusicTheme('town', 'town'),
      3,
      4,
      {
        tileKind: 'town',
        contextType: 'town',
        dayProgress: 0.5,
        yearProgress: 0.5,
      }
    );

    expect(nighttime.instruments.lead.family).not.toBe(
      daytime.instruments.lead.family
    );
    expect(stormy.instruments.percussion.family).not.toBe(
      daytime.instruments.percussion.family
    );
    expect(town.instruments.harmony.family).not.toBe(
      daytime.instruments.harmony.family
    );
  });

  it('assigns distinct timbre profiles to representative instrument families', () => {
    const town = createProceduralInstrumentBank(
      resolveMusicTheme('town', 'town'),
      5,
      -3,
      {
        tileKind: 'town',
        contextType: 'town',
        dayProgress: 0.5,
        yearProgress: 0.5,
      }
    );

    const timbres = town.instruments;
    expect(timbres.lead.timbre.filterCutoffHz).not.toBe(
      timbres.harmony.timbre.filterCutoffHz
    );
    expect(timbres.lead.timbre.harmonicRatio).not.toBe(
      timbres.harmony.timbre.harmonicRatio
    );
    expect(timbres.bass.timbre.filterCutoffHz).toBeLessThan(
      timbres.lead.timbre.filterCutoffHz
    );
    expect(timbres.percussion.timbre.harmonicRatio).toBeGreaterThan(1.5);
    expect(timbres.percussion.timbre.filterType).not.toBe(
      timbres.bass.timbre.filterType
    );
    expect(town.rolePatchDistinctness.isValid).toBe(true);
    expect(
      town.rolePatchDistinctness.comparisons.every(
        (comparison) => comparison.similarityScore < 0.94
      )
    ).toBe(true);
  });

  it('gives flute timbres a filtered breath-noise layer', () => {
    const flute = resolveProceduralInstrumentTimbre({
      family: 'flute',
      brightness: 1.08,
      harmonicSignal: 0.6,
      filterSignal: 0.4,
    });

    expect(flute.noiseMix).toBeGreaterThan(0.1);
    expect(flute.noiseFilterType).toBe('highpass');
    expect(flute.noiseFilterCutoffHz).toBeGreaterThan(2_000);
  });

  it('gives string timbres a bowed attack and sustained body envelope', () => {
    const strings = resolveProceduralInstrumentTimbre({
      family: 'strings',
      brightness: 0.96,
      harmonicSignal: 0.55,
      filterSignal: 0.4,
    });

    expect(strings.attackPeakGainMultiplier).toBeGreaterThan(1.05);
    expect(strings.bodySustainLevel).toBeGreaterThan(0.88);
    expect(strings.bodySustainLevel).toBeGreaterThan(
      resolveProceduralInstrumentTimbre({
        family: 'flute',
        brightness: 1.05,
        harmonicSignal: 0.55,
        filterSignal: 0.4,
      }).bodySustainLevel ?? 0.74
    );
  });

  it('gives bass timbres a stronger fundamental and shorter upper harmonics', () => {
    const bass = resolveProceduralInstrumentTimbre({
      family: 'upright-bass',
      brightness: 0.8,
      harmonicSignal: 0.5,
      filterSignal: 0.35,
    });

    expect(bass.fundamentalGainMultiplier).toBeGreaterThan(1.1);
    expect(bass.harmonicBodyLevel).toBeLessThan(0.45);
    expect(bass.harmonicReleaseLeadMs).toBeGreaterThanOrEqual(60);
  });

  it('gives struck timbres a separate short transient layer', () => {
    const piano = resolveProceduralInstrumentTimbre({
      family: 'piano',
      brightness: 0.98,
      harmonicSignal: 0.45,
      filterSignal: 0.4,
    });

    expect(piano.transientMix).toBeGreaterThan(0.15);
    expect(piano.transientDurationMs).toBeLessThanOrEqual(40);
    expect(piano.transientFilterType).toBe('highpass');
  });

  it('gives snare timbres a body tone plus a filtered noise burst', () => {
    const snare = resolveProceduralInstrumentTimbre({
      family: 'snare',
      brightness: 1,
      harmonicSignal: 0.5,
      filterSignal: 0.5,
    });

    expect(snare.fundamentalGainMultiplier ?? 0).toBeGreaterThan(1);
    expect(snare.filterType).toBe('bandpass');
    expect(snare.filterCutoffHz).toBeLessThan(1_200);
    expect(snare.transientMix ?? 0).toBeGreaterThan(0.2);
    expect(snare.transientDurationMs ?? 0).toBeLessThanOrEqual(32);
    expect(snare.transientFilterType).toBe('bandpass');
    expect(snare.transientFilterCutoffHz ?? 0).toBeGreaterThan(1_500);
  });

  it('gives hi-hat voices short metallic noise envelopes', () => {
    const cymbals = resolveProceduralInstrumentTimbre({
      family: 'cymbals',
      brightness: 1.08,
      harmonicSignal: 0.55,
      filterSignal: 0.6,
    });
    const closedHat = resolvePercussionVoiceById('cymbals-42');
    const openHat = resolvePercussionVoiceById('cymbals-46');
    const closedHatTimbre = applyPercussionVoiceToTimbre({
      voice: closedHat,
      timbre: cymbals,
    });
    const openHatTimbre = applyPercussionVoiceToTimbre({
      voice: openHat,
      timbre: cymbals,
    });

    expect(cymbals.noiseMix ?? 0).toBeGreaterThan(0.2);
    expect(cymbals.transientMix ?? 0).toBeGreaterThan(0.1);
    expect(cymbals.noiseFilterType).toBe('highpass');
    expect(closedHat.releaseMultiplier).toBeLessThan(openHat.releaseMultiplier);
    expect(closedHatTimbre.noiseMix ?? 0).toBeGreaterThan(
      openHatTimbre.noiseMix ?? 0
    );
    expect(closedHatTimbre.transientMix ?? 0).toBeGreaterThan(
      openHatTimbre.transientMix ?? 0
    );
  });

  it('gives crash and ride cymbals longer metallic noise envelopes than hi-hats', () => {
    const cymbals = resolveProceduralInstrumentTimbre({
      family: 'cymbals',
      brightness: 1.08,
      harmonicSignal: 0.55,
      filterSignal: 0.6,
    });
    const closedHat = resolvePercussionVoiceById('cymbals-42');
    const crash = resolvePercussionVoiceById('cymbals-49');
    const ride = resolvePercussionVoiceById('cymbals-51');
    const closedHatTimbre = applyPercussionVoiceToTimbre({
      voice: closedHat,
      timbre: cymbals,
    });
    const crashTimbre = applyPercussionVoiceToTimbre({
      voice: crash,
      timbre: cymbals,
    });
    const rideTimbre = applyPercussionVoiceToTimbre({
      voice: ride,
      timbre: cymbals,
    });

    expect(crash.releaseMultiplier).toBeGreaterThan(
      closedHat.releaseMultiplier
    );
    expect(ride.releaseMultiplier).toBeGreaterThan(crash.releaseMultiplier);
    expect(crashTimbre.noiseMix ?? 0).toBeGreaterThan(
      closedHatTimbre.noiseMix ?? 0
    );
    expect(rideTimbre.noiseMix ?? 0).toBeGreaterThan(crashTimbre.noiseMix ?? 0);
    expect(crashTimbre.transientMix ?? 0).toBeLessThan(
      closedHatTimbre.transientMix ?? Infinity
    );
    expect(rideTimbre.transientMix ?? 0).toBeLessThan(
      crashTimbre.transientMix ?? Infinity
    );
  });

  it('gives tambourine voices both jingle noise and small metallic transients', () => {
    const shaker = resolveProceduralInstrumentTimbre({
      family: 'shaker',
      brightness: 1.04,
      harmonicSignal: 0.52,
      filterSignal: 0.58,
    });
    const handPercussion = resolveProceduralInstrumentTimbre({
      family: 'hand-percussion',
      brightness: 0.96,
      harmonicSignal: 0.48,
      filterSignal: 0.54,
    });
    const cabasa = resolvePercussionVoiceById('shaker-69');
    const tambourineJingle = resolvePercussionVoiceById('shaker-54');
    const bongo = resolvePercussionVoiceById('hand-percussion-60');
    const tambourineHit = resolvePercussionVoiceById('hand-percussion-54');
    const cabasaTimbre = applyPercussionVoiceToTimbre({
      voice: cabasa,
      timbre: shaker,
    });
    const tambourineJingleTimbre = applyPercussionVoiceToTimbre({
      voice: tambourineJingle,
      timbre: shaker,
    });
    const bongoTimbre = applyPercussionVoiceToTimbre({
      voice: bongo,
      timbre: handPercussion,
    });
    const tambourineHitTimbre = applyPercussionVoiceToTimbre({
      voice: tambourineHit,
      timbre: handPercussion,
    });

    expect(tambourineJingleTimbre.noiseMix ?? 0).toBeGreaterThan(
      cabasaTimbre.noiseMix ?? 0
    );
    expect(tambourineJingleTimbre.transientMix ?? 0).toBeGreaterThan(0.1);
    expect(tambourineHitTimbre.noiseMix ?? 0).toBeGreaterThan(0.1);
    expect(tambourineHitTimbre.transientMix ?? 0).toBeGreaterThan(0.15);
    expect(tambourineHitTimbre.transientMix ?? 0).toBeGreaterThan(
      bongoTimbre.transientMix ?? 0
    );
  });

  it('keeps generated instrument patches inside their family recipe ranges', () => {
    const bank = createProceduralInstrumentBank(
      resolveMusicTheme('forest', 'overworld'),
      3,
      -2,
      {
        tileKind: 'forest',
        contextType: 'overworld',
        dayProgress: 0.45,
        yearProgress: 0.25,
      }
    );

    for (const instrument of Object.values(bank.instruments)) {
      const recipe = resolveInstrumentPatchRecipe(instrument.family);
      expect(recipe.waveformOptions).toContain(instrument.waveform);
      expect(instrument.attackMs).toBeGreaterThanOrEqual(
        recipe.attackMsRange.min
      );
      expect(instrument.attackMs).toBeLessThanOrEqual(recipe.attackMsRange.max);
      expect(instrument.releaseMs).toBeGreaterThanOrEqual(
        recipe.releaseMsRange.min
      );
      expect(instrument.releaseMs).toBeLessThanOrEqual(
        recipe.releaseMsRange.max
      );
      expect(instrument.brightness).toBeGreaterThanOrEqual(
        recipe.brightnessRange.min
      );
      expect(instrument.brightness).toBeLessThanOrEqual(
        recipe.brightnessRange.max
      );
    }
  });

  it('derives waveform and envelope shape from the chosen family recipe', () => {
    const town = createProceduralInstrumentBank(
      resolveMusicTheme('town', 'town'),
      5,
      -3,
      {
        tileKind: 'town',
        contextType: 'town',
        dayProgress: 0.5,
        yearProgress: 0.5,
      }
    );
    const leadRecipe = resolveInstrumentPatchRecipe(
      town.instruments.lead.family
    );
    const bassRecipe = resolveInstrumentPatchRecipe(
      town.instruments.bass.family
    );

    expect(leadRecipe.waveformOptions).not.toEqual(bassRecipe.waveformOptions);
    expect(leadRecipe.attackMsRange).not.toEqual(bassRecipe.attackMsRange);
    expect(leadRecipe.releaseMsRange).not.toEqual(bassRecipe.releaseMsRange);
  });

  it('compares generated patches against their known-good role references', () => {
    const town = createProceduralInstrumentBank(
      resolveMusicTheme('town', 'town'),
      5,
      -3,
      {
        tileKind: 'town',
        contextType: 'town',
        dayProgress: 0.5,
        yearProgress: 0.5,
      }
    );

    expect(
      town.instruments.lead.knownGoodPatchComparison.similarityScore
    ).toBeGreaterThan(0.55);
    expect(
      town.instruments.harmony.knownGoodPatchComparison.similarityScore
    ).toBeGreaterThan(0.55);
    expect(
      town.instruments.bass.knownGoodPatchComparison.similarityScore
    ).toBeGreaterThan(0.6);
    expect(
      town.instruments.percussion.knownGoodPatchComparison.similarityScore
    ).toBeGreaterThan(0.55);

    const leadVsBassReference = compareInstrumentPatchToKnownGoodRolePatch({
      role: 'bass',
      patch: town.instruments.lead,
    });
    expect(
      town.instruments.lead.knownGoodPatchComparison.similarityScore
    ).toBeGreaterThan(leadVsBassReference.similarityScore);
    expect(
      compareInstrumentPatches({
        left: town.instruments.lead,
        right: town.instruments.harmony,
      }).similarityScore
    ).toBeLessThan(0.94);
  });

  it('plays optional timbre noise layers through the web audio sink', () => {
    const createdNoiseSources: Array<{
      buffer: AudioBuffer | null;
      loop: boolean;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      sampleRate = 48_000;
      createOscillator() {
        return {
          onended: null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          detune: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        } as unknown as OscillatorNode;
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
      createBiquadFilter() {
        return {
          type: 'lowpass' as BiquadFilterType,
          frequency: {
            setValueAtTime: vi.fn(),
          },
          Q: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as BiquadFilterNode;
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
      createBuffer(channels: number, length: number) {
        const data = Array.from(
          { length: channels },
          () => new Float32Array(length)
        );
        return {
          getChannelData(index: number) {
            return data[index]!;
          },
        } as unknown as AudioBuffer;
      }
      createBufferSource() {
        const source = {
          buffer: null as AudioBuffer | null,
          loop: false,
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdNoiseSources.push(source);
        return source as unknown as AudioBufferSourceNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioMusicSink();
      sink.play({
        themeId: 'town-square',
        instrumentId: 'flute-test',
        role: 'lead',
        startMs: 0,
        durationMs: 240,
        frequency: 660,
        volume: 0.05,
        waveform: 'sine',
        timbre: {
          harmonicWaveform: 'sine',
          harmonicRatio: 2,
          filterType: 'highpass',
          filterCutoffHz: 1_100,
          filterQ: 0.8,
          noiseMix: 0.2,
          noiseFilterType: 'highpass',
          noiseFilterCutoffHz: 3_000,
          noiseFilterQ: 0.7,
        },
        attackMs: 24,
        releaseMs: 90,
        detuneCents: 0,
        harmonicGain: 0.2,
        pulseRate: 0.8,
      });

      expect(createdNoiseSources).toHaveLength(1);
      expect(createdNoiseSources[0]?.loop).toBe(true);
      expect(createdNoiseSources[0]?.start).toHaveBeenCalled();
      expect(createdNoiseSources[0]?.stop).toHaveBeenCalled();
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('schedules repeated short noise bursts for shaker-style timbres', () => {
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
      sampleRate = 48_000;
      createOscillator() {
        return {
          onended: null,
          type: 'triangle',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          detune: {
            setValueAtTime: vi.fn(),
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
      createBiquadFilter() {
        return {
          type: 'highpass' as BiquadFilterType,
          frequency: {
            setValueAtTime: vi.fn(),
          },
          Q: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as BiquadFilterNode;
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
      createBuffer(channels: number, length: number) {
        const data = Array.from(
          { length: channels },
          () => new Float32Array(length)
        );
        return {
          getChannelData(index: number) {
            return data[index]!;
          },
        } as unknown as AudioBuffer;
      }
      createBufferSource() {
        return {
          buffer: null as AudioBuffer | null,
          loop: false,
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        } as unknown as AudioBufferSourceNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioMusicSink();
      sink.play({
        themeId: 'town-square',
        instrumentId: 'shaker-burst-test',
        role: 'percussion',
        startMs: 0,
        durationMs: 180,
        frequency: 2_400,
        volume: 0.04,
        waveform: 'triangle',
        timbre: {
          harmonicWaveform: 'triangle',
          harmonicRatio: 4,
          filterType: 'highpass',
          filterCutoffHz: 3_800,
          filterQ: 1.2,
          noiseMix: 0.24,
          noiseBurstRate: 22,
          noiseBurstDepth: 0.78,
          noiseFilterType: 'highpass',
          noiseFilterCutoffHz: 4_200,
          noiseFilterQ: 1,
        },
        attackMs: 6,
        releaseMs: 40,
        detuneCents: 0,
        harmonicGain: 0.12,
        pulseRate: 0.9,
      });

      const noiseGainRamps =
        createdGains[2]?.gain.exponentialRampToValueAtTime.mock.calls ?? [];

      expect(noiseGainRamps.length).toBeGreaterThan(8);
      expect(noiseGainRamps[0]?.[1]).toBeLessThan(0.02);
      expect(noiseGainRamps.at(-1)?.[0]).toBeCloseTo(0.0001, 4);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('keeps bowed string voices near their sustain body before release', () => {
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
          onended: null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          detune: {
            setValueAtTime: vi.fn(),
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
      createBiquadFilter() {
        return {
          type: 'bandpass' as BiquadFilterType,
          frequency: {
            setValueAtTime: vi.fn(),
          },
          Q: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as BiquadFilterNode;
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
      const sink = createWebAudioMusicSink();
      sink.play({
        themeId: 'town-square',
        instrumentId: 'strings-body',
        role: 'harmony',
        startMs: 0,
        durationMs: 600,
        frequency: 440,
        volume: 0.05,
        waveform: 'triangle',
        timbre: {
          harmonicWaveform: 'sawtooth',
          harmonicRatio: 2,
          filterType: 'bandpass',
          filterCutoffHz: 1_500,
          filterQ: 1.2,
          attackPeakGainMultiplier: 1.1,
          bodySustainLevel: 0.92,
        },
        attackMs: 60,
        releaseMs: 140,
        detuneCents: 0,
        harmonicGain: 0.18,
        pulseRate: 0.7,
      });

      const gainRamps =
        createdGains[0]?.gain.exponentialRampToValueAtTime.mock.calls ?? [];
      expect(gainRamps[0]?.[0]).toBeCloseTo(0.055, 4);
      expect(gainRamps[1]?.[0]).toBeCloseTo(0.046, 4);
      expect(gainRamps[2]?.[0]).toBeCloseTo(0.046, 4);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('lets bass harmonic gain release earlier than the carrier body', () => {
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
          onended: null,
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          detune: {
            setValueAtTime: vi.fn(),
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
      createBiquadFilter() {
        return {
          type: 'lowpass' as BiquadFilterType,
          frequency: {
            setValueAtTime: vi.fn(),
          },
          Q: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as BiquadFilterNode;
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
      const sink = createWebAudioMusicSink();
      sink.play({
        themeId: 'town-square',
        instrumentId: 'bass-release',
        role: 'bass',
        startMs: 0,
        durationMs: 700,
        frequency: 110,
        volume: 0.05,
        waveform: 'sine',
        timbre: {
          harmonicWaveform: 'triangle',
          harmonicRatio: 2,
          filterType: 'lowpass',
          filterCutoffHz: 320,
          filterQ: 0.8,
          fundamentalGainMultiplier: 1.16,
          harmonicBodyLevel: 0.36,
          harmonicReleaseLeadMs: 80,
        },
        attackMs: 40,
        releaseMs: 140,
        detuneCents: 0,
        harmonicGain: 0.14,
        pulseRate: 0.6,
      });

      const carrierRamps =
        createdGains[0]?.gain.exponentialRampToValueAtTime.mock.calls ?? [];
      const harmonicRamps =
        createdGains[1]?.gain.exponentialRampToValueAtTime.mock.calls ?? [];

      expect(carrierRamps[0]?.[0]).toBeCloseTo(0.058, 4);
      expect(harmonicRamps[1]?.[0]).toBeCloseTo(0.00252, 5);
      expect(harmonicRamps[2]?.[1]).toBeLessThan(
        carrierRamps[2]?.[1] ?? Infinity
      );
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('plays a separate transient source for struck instrument patches', () => {
    const createdTransientSources: Array<{
      buffer: AudioBuffer | null;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      sampleRate = 48_000;
      createOscillator() {
        return {
          onended: null,
          type: 'triangle',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          detune: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        } as unknown as OscillatorNode;
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
      createBiquadFilter() {
        return {
          type: 'highpass' as BiquadFilterType,
          frequency: {
            setValueAtTime: vi.fn(),
          },
          Q: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as BiquadFilterNode;
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
      createBuffer(channels: number, length: number) {
        const data = Array.from(
          { length: channels },
          () => new Float32Array(length)
        );
        return {
          getChannelData(index: number) {
            return data[index]!;
          },
        } as unknown as AudioBuffer;
      }
      createBufferSource() {
        const source = {
          buffer: null as AudioBuffer | null,
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        createdTransientSources.push(source);
        return source as unknown as AudioBufferSourceNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioMusicSink();
      sink.play({
        themeId: 'town-square',
        instrumentId: 'piano-transient',
        role: 'harmony',
        startMs: 0,
        durationMs: 420,
        frequency: 440,
        volume: 0.05,
        waveform: 'triangle',
        timbre: {
          harmonicWaveform: 'triangle',
          harmonicRatio: 2,
          filterType: 'lowpass',
          filterCutoffHz: 1_800,
          filterQ: 0.8,
          transientMix: 0.2,
          transientDurationMs: 32,
          transientFilterType: 'highpass',
          transientFilterCutoffHz: 2_600,
          transientFilterQ: 0.9,
        },
        attackMs: 14,
        releaseMs: 100,
        detuneCents: 0,
        harmonicGain: 0.18,
        pulseRate: 0.7,
      });

      expect(createdTransientSources).toHaveLength(1);
      expect(createdTransientSources[0]?.start).toHaveBeenCalled();
      expect(createdTransientSources[0]?.stop).toHaveBeenCalled();
      expect(createdTransientSources[0]?.stop.mock.calls[0]?.[0]).toBeCloseTo(
        0.032,
        3
      );
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('schedules a downward pitch sweep for kick-style percussion patches', () => {
    const createdOscillators: Array<{
      frequency: {
        setValueAtTime: ReturnType<typeof vi.fn>;
        exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
      };
      detune: {
        setValueAtTime: ReturnType<typeof vi.fn>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
      type: OscillatorType;
      onended: (() => void) | null;
    }> = [];

    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator() {
        const oscillator = {
          onended: null as (() => void) | null,
          type: 'sine' as OscillatorType,
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          detune: {
            setValueAtTime: vi.fn(),
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
      createBiquadFilter() {
        return {
          type: 'highpass' as BiquadFilterType,
          frequency: {
            setValueAtTime: vi.fn(),
          },
          Q: {
            setValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          disconnect: vi.fn(),
        } as unknown as BiquadFilterNode;
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
      createBuffer(channels: number, length: number) {
        const data = Array.from(
          { length: channels },
          () => new Float32Array(length)
        );
        return {
          getChannelData(index: number) {
            return data[index]!;
          },
        } as unknown as AudioBuffer;
      }
      createBufferSource() {
        return {
          buffer: null as AudioBuffer | null,
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        } as unknown as AudioBufferSourceNode;
      }
      resume() {
        return Promise.resolve();
      }
    }

    const originalAudioContext = globalThis.AudioContext;
    vi.stubGlobal('AudioContext', FakeAudioContext);

    try {
      const sink = createWebAudioMusicSink();
      sink.play({
        themeId: 'town-square',
        instrumentId: 'town-square:perc-kick-0',
        role: 'percussion',
        startMs: 0,
        durationMs: 180,
        frequency: 64,
        volume: 0.055,
        waveform: 'sine',
        timbre: {
          harmonicWaveform: 'triangle',
          harmonicRatio: 1.3,
          filterType: 'lowpass',
          filterCutoffHz: 240,
          filterQ: 0.9,
          pitchSweepSemitones: 14,
          pitchSweepDurationMs: 44,
          transientMix: 0.18,
          transientDurationMs: 18,
          transientFilterType: 'highpass',
          transientFilterCutoffHz: 2_400,
          transientFilterQ: 1,
        },
        attackMs: 8,
        releaseMs: 90,
        detuneCents: 0,
        harmonicGain: 0.14,
        pulseRate: 0.2,
      });

      expect(createdOscillators).toHaveLength(2);

      const carrierOscillator = createdOscillators[0]!;
      const harmonicOscillator = createdOscillators[1]!;
      const expectedSweepMultiplier = Math.pow(2, 14 / 12);

      expect(
        carrierOscillator.frequency.setValueAtTime.mock.calls[0]?.[0]
      ).toBeCloseTo(64 * expectedSweepMultiplier, 4);
      expect(
        harmonicOscillator.frequency.setValueAtTime.mock.calls[0]?.[0]
      ).toBeCloseTo(64 * expectedSweepMultiplier * 1.3, 4);
      expect(
        carrierOscillator.frequency.exponentialRampToValueAtTime.mock
          .calls[0]?.[0]
      ).toBeCloseTo(64, 4);
      expect(
        carrierOscillator.frequency.exponentialRampToValueAtTime.mock
          .calls[0]?.[1]
      ).toBeCloseTo(0.044, 4);
      expect(
        harmonicOscillator.frequency.exponentialRampToValueAtTime.mock
          .calls[0]?.[0]
      ).toBeCloseTo(64 * 1.3, 4);
    } finally {
      if (originalAudioContext) {
        vi.stubGlobal('AudioContext', originalAudioContext);
      } else {
        vi.unstubAllGlobals();
      }
    }
  });

  it('emits scheduled notes through the controller sink', () => {
    const played: ProceduralMusicNote[] = [];
    const controller = createMusicController({
      play(note) {
        played.push(note);
      },
    });

    controller.update({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      clusterX: 0,
      clusterY: 0,
    });

    expect(played.length).toBeGreaterThan(1);
    expect(played[0]?.themeId).toBe('town-square');
    expect(played.some((note) => note.role === 'bass')).toBe(true);
    expect(played.some((note) => note.role === 'harmony')).toBe(true);
    expect(
      new Set(played.map((note) => note.role)).size
    ).toBeGreaterThanOrEqual(2);
  });

  it('ducks scheduled music when recent important sound effects are active', () => {
    const unducked: ProceduralMusicNote[] = [];
    const ducked: ProceduralMusicNote[] = [];
    const controller = createMusicController({
      play(note) {
        unducked.push(note);
      },
    });

    controller.update({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      prioritySoundIntensity: 0,
      clusterX: 0,
      clusterY: 0,
    });

    const duckedController = createMusicController({
      play(note) {
        ducked.push(note);
      },
    });

    duckedController.update({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      prioritySoundIntensity: 1,
      clusterX: 0,
      clusterY: 0,
    });

    expect(ducked.length).toBe(unducked.length);
    expect(ducked.length).toBeGreaterThan(0);
    expect(ducked[0]!.volume).toBeLessThan(unducked[0]!.volume);
  });

  it('ducks scheduled music slightly when dialogue is active', () => {
    const baseline: ProceduralMusicNote[] = [];
    const dialogueDucked: ProceduralMusicNote[] = [];
    const priorityDucked: ProceduralMusicNote[] = [];

    createMusicController({
      play(note) {
        baseline.push(note);
      },
    }).update({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      dialogueIntensity: 0,
      prioritySoundIntensity: 0,
      clusterX: 0,
      clusterY: 0,
    });

    createMusicController({
      play(note) {
        dialogueDucked.push(note);
      },
    }).update({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      dialogueIntensity: 1,
      prioritySoundIntensity: 0,
      clusterX: 0,
      clusterY: 0,
    });

    createMusicController({
      play(note) {
        priorityDucked.push(note);
      },
    }).update({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      dialogueIntensity: 0,
      prioritySoundIntensity: 1,
      clusterX: 0,
      clusterY: 0,
    });

    expect(dialogueDucked.length).toBe(baseline.length);
    expect(priorityDucked.length).toBe(baseline.length);
    expect(dialogueDucked[0]!.volume).toBeLessThan(baseline[0]!.volume);
    expect(dialogueDucked[0]!.volume).toBeGreaterThan(
      priorityDucked[0]!.volume
    );
  });

  it('keeps scheduled songs within a consistent loudness band across themes', () => {
    const loudnesses = [
      scheduleProceduralMusicNotes({
        nowMs: 0,
        tileKind: 'plains',
        contextType: 'overworld',
        dayProgress: 0.45,
        clusterX: 0,
        clusterY: 0,
      }).notes,
      scheduleProceduralMusicNotes({
        nowMs: 0,
        tileKind: 'forest',
        contextType: 'overworld',
        dayProgress: 0.45,
        clusterX: 2,
        clusterY: -1,
      }).notes,
      scheduleProceduralMusicNotes({
        nowMs: 0,
        tileKind: 'town',
        contextType: 'town',
        dayProgress: 0.45,
        clusterX: -3,
        clusterY: 4,
      }).notes,
      scheduleProceduralMusicNotes({
        nowMs: 0,
        tileKind: 'cave-floor',
        contextType: 'cave',
        dayProgress: 0.45,
        clusterX: 5,
        clusterY: 3,
      }).notes,
    ].map((notes) => resolveProceduralMusicLoudness(notes));

    expect(Math.max(...loudnesses) - Math.min(...loudnesses)).toBeLessThan(
      0.0035
    );
  });

  it('keeps generated note dynamics expressive after gentle compression', () => {
    const scheduled = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      clusterX: 0,
      clusterY: 0,
    });
    const volumes = scheduled.notes.map((note) => note.volume);
    const spread = Math.max(...volumes) - Math.min(...volumes);

    expect(spread).toBeGreaterThan(0.006);
    expect(spread).toBeLessThan(0.041);
  });

  it('lets percussion react to the shared composition structure instead of staying flat', () => {
    const first = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      clusterX: 0,
      clusterY: 0,
    });
    const second = scheduleProceduralMusicNotes(
      {
        nowMs: first.state.nextNoteAtMs,
        tileKind: 'town',
        contextType: 'town',
        dayProgress: 0.45,
        clusterX: 0,
        clusterY: 0,
      },
      first.state
    );

    const percussion = [...first.notes, ...second.notes].filter(
      (note) => note.role === 'percussion'
    );
    expect(percussion.length).toBeGreaterThan(1);
    expect(
      new Set(percussion.map((note) => note.volume.toFixed(5))).size
    ).toBeGreaterThan(1);
    expect(
      new Set(percussion.map((note) => Math.round(note.durationMs))).size
    ).toBeGreaterThan(1);
  });

  it('layers poi notes over ambient music when a nearby poi mix is present', () => {
    const played: ProceduralMusicNote[] = [];
    const controller = createMusicController({
      play(note) {
        played.push(note);
      },
    });

    controller.update({
      nowMs: 0,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
      nearbyPoi: {
        tileKind: 'town',
        poiType: 'town',
        contextType: 'town',
        mix: 0.75,
        clusterX: 0,
        clusterY: 0,
      },
    });

    expect(played.some((note) => note.themeId === 'frontier-plains')).toBe(
      true
    );
    expect(played.some((note) => note.themeId === 'town-square')).toBe(true);
  });

  it('builds stable update signatures for throttled music scheduling', () => {
    const base = {
      nowMs: 0,
      tileKind: 'plains' as const,
      contextType: 'overworld' as const,
      dayProgress: 0.5,
      yearProgress: 0.25,
      weatherKind: 'fog' as const,
      weatherIntensity: 0.35,
      clusterX: 1,
      clusterY: -2,
      nearbyPoi: {
        tileKind: 'town' as const,
        poiType: 'town',
        contextType: 'town' as const,
        mix: 0.75,
        clusterX: 0,
        clusterY: 0,
      },
    };

    expect(getMusicUpdateSignature(base)).toEqual(
      getMusicUpdateSignature({ ...base })
    );
    expect(
      getMusicUpdateSignature({
        ...base,
        clusterX: base.clusterX + 1,
      })
    ).not.toEqual(getMusicUpdateSignature(base));
    expect(
      getMusicUpdateSignature({
        ...base,
        yearProgress: 0.75,
      })
    ).not.toEqual(getMusicUpdateSignature(base));
  });

  it('skips redundant per-frame scheduling updates until the next note horizon approaches', () => {
    const played: ProceduralMusicNote[] = [];
    const controller = createMusicController({
      play(note) {
        played.push(note);
      },
    });

    controller.update({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      clusterX: 0,
      clusterY: 0,
    });
    const initialCount = played.length;
    const initialSchedule = scheduleProceduralMusicNotes({
      nowMs: 0,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      clusterX: 0,
      clusterY: 0,
    });

    controller.update({
      nowMs: 16,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      clusterX: 0,
      clusterY: 0,
    });

    expect(played.length).toBe(initialCount);

    controller.update({
      nowMs: initialSchedule.state.nextNoteAtMs - 239,
      tileKind: 'town',
      contextType: 'town',
      dayProgress: 0.45,
      clusterX: 0,
      clusterY: 0,
    });

    expect(played.length).toBeGreaterThan(initialCount);
  });

  it('reschedules immediately when the music state changes before the next horizon', () => {
    const played: ProceduralMusicNote[] = [];
    const controller = createMusicController({
      play(note) {
        played.push(note);
      },
    });

    controller.update({
      nowMs: 0,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.5,
      clusterX: 0,
      clusterY: 0,
    });
    const initialCount = played.length;

    controller.update({
      nowMs: 16,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.5,
      clusterX: 2,
      clusterY: 1,
    });

    expect(played.length).toBeGreaterThan(initialCount);
    expect(played.some((note) => note.themeId === 'deep-forest')).toBe(true);
  });
});
