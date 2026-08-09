import { describe, expect, it, vi } from 'vitest';
import {
  createProceduralInstrumentBank,
  createMusicController,
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

describe('procedural music', () => {
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
          },
          detune: {
            setValueAtTime: vi.fn(),
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
        attackMs: 20,
        releaseMs: 80,
        detuneCents: 0,
        harmonicGain: 0.4,
        pulseRate: 1,
      });

      expect(sink.getActiveSourceCount?.()).toBe(2);
      createdOscillators[0]?.finish();
      expect(sink.getActiveSourceCount?.()).toBe(1);
      createdOscillators[1]?.finish();
      expect(sink.getActiveSourceCount?.()).toBe(0);
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

  it('selects stable regional themes from the current tile and context', () => {
    expect(resolveMusicTheme('forest', 'overworld').id).toBe('deep-forest');
    expect(resolveMusicTheme('shore', 'overworld').id).toBe('coastal-shore');
    expect(resolveMusicTheme('town', 'town').id).toBe('town-square');
    expect(resolveMusicTheme('floor', 'building').id).toBe('interior-hall');
    expect(resolveMusicTheme('plains', 'cave').id).toBe('cavern-echo');
    expect(resolveMusicTheme('plains', 'overworld').id).toBe('frontier-plains');
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
  });

  it('softens nighttime arrangements by lowering percussion density and extending softer layers', () => {
    const arrangement = resolveMusicArrangement({
      dayProgress: 0.9,
      yearProgress: 0.5,
    });

    expect(arrangement.roleProfiles.percussion).toEqual(
      expect.objectContaining({
        volumeMultiplier: 0.22,
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

  it('lets bass lines favor roots while occasionally using fifths, octaves, and passing tones', () => {
    const theme = resolveMusicTheme('plains', 'overworld');
    const mood = resolveMusicMood({ dayProgress: 0.5 });
    const bassBaseFrequency = theme.rootHz * mood.brightness * 0.5;
    const scheduledNotes: ProceduralMusicNote[] = [];
    let schedulerState:
      ReturnType<typeof scheduleProceduralMusicNotes>['state'] | undefined;

    for (const nowMs of [0, 1600, 3200, 4800, 6400, 8000, 9600, 11200]) {
      const scheduled = scheduleProceduralMusicNotes(
        {
          nowMs,
          tileKind: 'plains',
          contextType: 'overworld',
          dayProgress: 0.5,
          yearProgress: 0.5,
          clusterX: 0,
          clusterY: 0,
        },
        schedulerState
      );
      scheduledNotes.push(...scheduled.notes);
      schedulerState = scheduled.state;
    }

    const bassSemitones = scheduledNotes
      .filter((note) => note.role === 'bass')
      .map((note) =>
        Math.round(12 * Math.log2(note.frequency / bassBaseFrequency))
      );

    expect(
      bassSemitones.filter((semitones) => semitones === 0).length
    ).toBeGreaterThan(bassSemitones.length / 3);
    expect(bassSemitones).toContain(7);
    expect(bassSemitones).toContain(12);
    expect(bassSemitones).toContain(theme.scale[1] ?? theme.scale[2] ?? 2);
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
