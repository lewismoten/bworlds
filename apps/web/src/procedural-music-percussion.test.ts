import { describe, expect, it } from 'vitest';
import {
  createProceduralPercussionNotes,
  resolvePercussionFamilyFromInstrumentId,
  resolvePercussionVoiceIdFromInstrumentId,
} from './procedural-music-percussion.ts';
import {
  listPercussionVoicesForFamily,
  resolvePercussionVoice,
} from './procedural-music-percussion-voices.ts';

describe('procedural music percussion', () => {
  it('builds a soft repeating forest pulse with multiple percussion families', () => {
    const notes = createProceduralPercussionNotes({
      themeId: 'deep-forest',
      stepIndex: 3,
      phraseStep: 3,
      cadence: 'neutral',
      startMs: 1_000,
      stepDurationMs: 440,
      rootMidiNote: 53,
      baseInstrumentId: 'deep-forest:percussion:3:-2',
      baseVolume: 0.02,
      baseAttackMs: 12,
      baseReleaseMs: 60,
      baseDetuneCents: 4,
      baseHarmonicGain: 0.12,
      basePulseRate: 1,
      brightness: 0.92,
      clusterX: 3,
      clusterY: -2,
    });

    expect(notes.length).toBeGreaterThanOrEqual(3);
    expect(
      notes.every(
        (note, index) => index === 0 || note.startMs > notes[index - 1]!.startMs
      )
    ).toBe(true);
    expect(
      new Set(
        notes.map((note) =>
          resolvePercussionFamilyFromInstrumentId(note.instrumentId)
        )
      ).size
    ).toBeGreaterThan(1);
    expect(
      notes.some(
        (note) =>
          resolvePercussionFamilyFromInstrumentId(note.instrumentId) === 'kick'
      )
    ).toBe(true);
    expect(
      notes.some(
        (note) =>
          resolvePercussionFamilyFromInstrumentId(note.instrumentId) ===
          'shaker'
      )
    ).toBe(true);
    expect(
      notes.some(
        (note) =>
          resolvePercussionFamilyFromInstrumentId(note.instrumentId) ===
          'hand-percussion'
      )
    ).toBe(true);
  });

  it('adds accented answer-cadence hits without falling back to cymbals alone', () => {
    const notes = createProceduralPercussionNotes({
      themeId: 'deep-forest',
      stepIndex: 7,
      phraseStep: 7,
      cadence: 'answer',
      startMs: 1_000,
      stepDurationMs: 440,
      rootMidiNote: 53,
      baseInstrumentId: 'deep-forest:percussion:3:-2',
      baseVolume: 0.02,
      baseAttackMs: 12,
      baseReleaseMs: 60,
      baseDetuneCents: 4,
      baseHarmonicGain: 0.12,
      basePulseRate: 1,
      brightness: 0.92,
      clusterX: 3,
      clusterY: -2,
    });

    expect(notes.length).toBeGreaterThanOrEqual(3);
    expect(
      notes.some(
        (note) =>
          resolvePercussionFamilyFromInstrumentId(note.instrumentId) === 'kick'
      )
    ).toBe(true);
    expect(
      notes.every(
        (note) =>
          resolvePercussionFamilyFromInstrumentId(note.instrumentId) !== null
      )
    ).toBe(true);
    expect(
      notes.filter(
        (note) =>
          resolvePercussionFamilyFromInstrumentId(note.instrumentId) ===
          'cymbals'
      ).length
    ).toBeLessThan(notes.length);
  });

  it('parses note-level percussion family overrides from instrument ids', () => {
    expect(
      resolvePercussionFamilyFromInstrumentId(
        'deep-forest:percussion:3:-2:perc-shaker:1'
      )
    ).toBe('shaker');
    expect(
      resolvePercussionFamilyFromInstrumentId(
        'deep-forest:percussion:3:-2:perc-hand-percussion:2'
      )
    ).toBe('hand-percussion');
    expect(
      resolvePercussionFamilyFromInstrumentId('deep-forest:percussion:3:-2')
    ).toBeNull();
    expect(
      resolvePercussionVoiceIdFromInstrumentId(
        'deep-forest:percussion:3:-2:perc-shaker-69:1'
      )
    ).toBe('shaker-69');
  });

  it('defines separate voice recipes for every used drum note in each percussion family', () => {
    const kickVoices = listPercussionVoicesForFamily('kick');
    const snareVoices = listPercussionVoicesForFamily('snare');
    const cymbalVoices = listPercussionVoicesForFamily('cymbals');
    const shakerVoices = listPercussionVoicesForFamily('shaker');
    const handVoices = listPercussionVoicesForFamily('hand-percussion');

    expect(kickVoices.map((voice) => voice.midiNote)).toEqual([36, 35, 41]);
    expect(snareVoices.map((voice) => voice.midiNote)).toEqual([38, 37, 40, 39]);
    expect(cymbalVoices.map((voice) => voice.midiNote)).toEqual([49, 51, 46, 42]);
    expect(shakerVoices.map((voice) => voice.midiNote)).toEqual([69, 54, 42, 70]);
    expect(handVoices.map((voice) => voice.midiNote)).toEqual([60, 61, 54, 69]);
  });

  it('gives different used drum notes within a family their own synthesis recipe', () => {
    const kickCenter = resolvePercussionVoice({
      family: 'kick',
      noteIndex: 0,
    });
    const kickDeep = resolvePercussionVoice({
      family: 'kick',
      noteIndex: 1,
    });
    const snareMain = resolvePercussionVoice({
      family: 'snare',
      noteIndex: 0,
    });
    const snareRim = resolvePercussionVoice({
      family: 'snare',
      noteIndex: 1,
    });

    expect(kickCenter.midiNote).toBe(36);
    expect(kickDeep.midiNote).toBe(35);
    expect(kickCenter.waveform).not.toBe(kickDeep.waveform);
    expect(kickCenter.releaseMultiplier).not.toBe(kickDeep.releaseMultiplier);
    expect(snareMain.midiNote).toBe(38);
    expect(snareRim.midiNote).toBe(37);
    expect(snareMain.waveform).not.toBe(snareRim.waveform);
    expect(snareMain.timbre.filterCutoffMultiplier).not.toBe(
      snareRim.timbre.filterCutoffMultiplier
    );
  });

  it('keeps town grooves anchored by a consistent mid-beat snare with supporting hits around it', () => {
    const notes = createProceduralPercussionNotes({
      themeId: 'town-square',
      stepIndex: 5,
      phraseStep: 5,
      cadence: 'neutral',
      startMs: 1_000,
      stepDurationMs: 320,
      rootMidiNote: 59,
      baseInstrumentId: 'town-square:percussion:3:-2',
      baseVolume: 0.02,
      baseAttackMs: 12,
      baseReleaseMs: 60,
      baseDetuneCents: 4,
      baseHarmonicGain: 0.12,
      basePulseRate: 1,
      brightness: 0.92,
      clusterX: 3,
      clusterY: -2,
    });
    const families = notes.map((note) =>
      resolvePercussionFamilyFromInstrumentId(note.instrumentId)
    );
    const snare = notes.find(
      (note) =>
        resolvePercussionFamilyFromInstrumentId(note.instrumentId) === 'snare'
    );

    expect(notes.length).toBeGreaterThanOrEqual(2);
    expect(families).toContain('kick');
    expect(families).toContain('snare');
    expect(snare?.startMs).toBe(1_160);
    expect(notes.some((note) => note.startMs < (snare?.startMs ?? 0))).toBe(
      true
    );
    expect(
      notes.length === 2 ||
        notes.some((note) => note.startMs > (snare?.startMs ?? 0))
    ).toBe(true);
  });

  it('repeats the same town and generic groove pattern within a four-step measure window', () => {
    const townStepFour = createProceduralPercussionNotes({
      themeId: 'town-square',
      stepIndex: 4,
      phraseStep: 4,
      cadence: 'neutral',
      startMs: 0,
      stepDurationMs: 320,
      rootMidiNote: 59,
      baseInstrumentId: 'town-square:percussion:3:-2',
      baseVolume: 0.02,
      baseAttackMs: 12,
      baseReleaseMs: 60,
      baseDetuneCents: 4,
      baseHarmonicGain: 0.12,
      basePulseRate: 1,
      brightness: 0.92,
      clusterX: 3,
      clusterY: -2,
    });
    const townStepSeven = createProceduralPercussionNotes({
      themeId: 'town-square',
      stepIndex: 7,
      phraseStep: 7,
      cadence: 'neutral',
      startMs: 0,
      stepDurationMs: 320,
      rootMidiNote: 59,
      baseInstrumentId: 'town-square:percussion:3:-2',
      baseVolume: 0.02,
      baseAttackMs: 12,
      baseReleaseMs: 60,
      baseDetuneCents: 4,
      baseHarmonicGain: 0.12,
      basePulseRate: 1,
      brightness: 0.92,
      clusterX: 3,
      clusterY: -2,
    });
    const genericStepEight = createProceduralPercussionNotes({
      themeId: 'ridge-pass',
      stepIndex: 8,
      phraseStep: 8,
      cadence: 'neutral',
      startMs: 0,
      stepDurationMs: 380,
      rootMidiNote: 53,
      baseInstrumentId: 'ridge-pass:percussion:3:-2',
      baseVolume: 0.02,
      baseAttackMs: 12,
      baseReleaseMs: 60,
      baseDetuneCents: 4,
      baseHarmonicGain: 0.12,
      basePulseRate: 1,
      brightness: 0.92,
      clusterX: 3,
      clusterY: -2,
    });
    const genericStepEleven = createProceduralPercussionNotes({
      themeId: 'ridge-pass',
      stepIndex: 11,
      phraseStep: 11,
      cadence: 'neutral',
      startMs: 0,
      stepDurationMs: 380,
      rootMidiNote: 53,
      baseInstrumentId: 'ridge-pass:percussion:3:-2',
      baseVolume: 0.02,
      baseAttackMs: 12,
      baseReleaseMs: 60,
      baseDetuneCents: 4,
      baseHarmonicGain: 0.12,
      basePulseRate: 1,
      brightness: 0.92,
      clusterX: 3,
      clusterY: -2,
    });

    expect(
      townStepFour.map((note) =>
        resolvePercussionFamilyFromInstrumentId(note.instrumentId)
      )
    ).toEqual(
      townStepSeven.map((note) =>
        resolvePercussionFamilyFromInstrumentId(note.instrumentId)
      )
    );
    expect(
      genericStepEight.map((note) =>
        resolvePercussionFamilyFromInstrumentId(note.instrumentId)
      )
    ).toEqual(
      genericStepEleven.map((note) =>
        resolvePercussionFamilyFromInstrumentId(note.instrumentId)
      )
    );
  });

  it('adds denser town fills only on structural cadence steps', () => {
    const neutral = createProceduralPercussionNotes({
      themeId: 'town-square',
      stepIndex: 5,
      phraseStep: 5,
      cadence: 'neutral',
      startMs: 0,
      stepDurationMs: 320,
      rootMidiNote: 59,
      baseInstrumentId: 'town-square:percussion:3:-2',
      baseVolume: 0.02,
      baseAttackMs: 12,
      baseReleaseMs: 60,
      baseDetuneCents: 4,
      baseHarmonicGain: 0.12,
      basePulseRate: 1,
      brightness: 0.92,
      clusterX: 3,
      clusterY: -2,
    });
    const answer = createProceduralPercussionNotes({
      themeId: 'town-square',
      stepIndex: 7,
      phraseStep: 7,
      cadence: 'answer',
      startMs: 0,
      stepDurationMs: 320,
      rootMidiNote: 59,
      baseInstrumentId: 'town-square:percussion:3:-2',
      baseVolume: 0.02,
      baseAttackMs: 12,
      baseReleaseMs: 60,
      baseDetuneCents: 4,
      baseHarmonicGain: 0.12,
      basePulseRate: 1,
      brightness: 0.92,
      clusterX: 3,
      clusterY: -2,
    });

    expect(answer.length).toBeGreaterThan(neutral.length);
    expect(
      answer.some(
        (note) =>
          resolvePercussionFamilyFromInstrumentId(note.instrumentId) ===
          'cymbals'
      )
    ).toBe(true);
    expect(
      neutral.some(
        (note) =>
          resolvePercussionFamilyFromInstrumentId(note.instrumentId) ===
          'cymbals'
      )
    ).toBe(false);
  });

  it('adds generic fills only when cadence marks a structural turn', () => {
    const neutral = createProceduralPercussionNotes({
      themeId: 'ridge-pass',
      stepIndex: 8,
      phraseStep: 8,
      cadence: 'neutral',
      startMs: 0,
      stepDurationMs: 380,
      rootMidiNote: 53,
      baseInstrumentId: 'ridge-pass:percussion:3:-2',
      baseVolume: 0.02,
      baseAttackMs: 12,
      baseReleaseMs: 60,
      baseDetuneCents: 4,
      baseHarmonicGain: 0.12,
      basePulseRate: 1,
      brightness: 0.92,
      clusterX: 3,
      clusterY: -2,
    });
    const answer = createProceduralPercussionNotes({
      themeId: 'ridge-pass',
      stepIndex: 11,
      phraseStep: 11,
      cadence: 'answer',
      startMs: 0,
      stepDurationMs: 380,
      rootMidiNote: 53,
      baseInstrumentId: 'ridge-pass:percussion:3:-2',
      baseVolume: 0.02,
      baseAttackMs: 12,
      baseReleaseMs: 60,
      baseDetuneCents: 4,
      baseHarmonicGain: 0.12,
      basePulseRate: 1,
      brightness: 0.92,
      clusterX: 3,
      clusterY: -2,
    });

    expect(answer.length).toBeGreaterThan(neutral.length);
    expect(
      answer.some(
        (note) =>
          resolvePercussionFamilyFromInstrumentId(note.instrumentId) ===
          'cymbals'
      )
    ).toBe(true);
    expect(
      neutral.some(
        (note) =>
          resolvePercussionFamilyFromInstrumentId(note.instrumentId) ===
          'cymbals'
      )
    ).toBe(false);
  });

  it('strengthens an existing downbeat kick when the chord changes', () => {
    const stable = createProceduralPercussionNotes({
      themeId: 'town-square',
      stepIndex: 5,
      phraseStep: 5,
      cadence: 'neutral',
      chordChange: false,
      startMs: 0,
      stepDurationMs: 320,
      rootMidiNote: 59,
      baseInstrumentId: 'town-square:percussion:3:-2',
      baseVolume: 0.02,
      baseAttackMs: 12,
      baseReleaseMs: 60,
      baseDetuneCents: 4,
      baseHarmonicGain: 0.12,
      basePulseRate: 1,
      brightness: 0.92,
      clusterX: 3,
      clusterY: -2,
    });
    const changed = createProceduralPercussionNotes({
      themeId: 'town-square',
      stepIndex: 5,
      phraseStep: 5,
      cadence: 'neutral',
      chordChange: true,
      startMs: 0,
      stepDurationMs: 320,
      rootMidiNote: 59,
      baseInstrumentId: 'town-square:percussion:3:-2',
      baseVolume: 0.02,
      baseAttackMs: 12,
      baseReleaseMs: 60,
      baseDetuneCents: 4,
      baseHarmonicGain: 0.12,
      basePulseRate: 1,
      brightness: 0.92,
      clusterX: 3,
      clusterY: -2,
    });
    const stableKick = stable.find(
      (note) =>
        resolvePercussionFamilyFromInstrumentId(note.instrumentId) === 'kick'
    );
    const changedKick = changed.find(
      (note) =>
        resolvePercussionFamilyFromInstrumentId(note.instrumentId) === 'kick'
    );

    expect(stableKick?.startMs).toBe(0);
    expect(changedKick?.startMs).toBe(0);
    expect(changedKick?.volume ?? 0).toBeGreaterThan(stableKick?.volume ?? 0);
  });

  it('adds a downbeat kick when a chord change lands on a groove without one', () => {
    const stable = createProceduralPercussionNotes({
      themeId: 'ridge-pass',
      stepIndex: 11,
      phraseStep: 11,
      cadence: 'neutral',
      chordChange: false,
      startMs: 0,
      stepDurationMs: 380,
      rootMidiNote: 53,
      baseInstrumentId: 'ridge-pass:percussion:3:-2',
      baseVolume: 0.02,
      baseAttackMs: 12,
      baseReleaseMs: 60,
      baseDetuneCents: 4,
      baseHarmonicGain: 0.12,
      basePulseRate: 1,
      brightness: 0.92,
      clusterX: 3,
      clusterY: -2,
    });
    const changed = createProceduralPercussionNotes({
      themeId: 'ridge-pass',
      stepIndex: 11,
      phraseStep: 11,
      cadence: 'neutral',
      chordChange: true,
      startMs: 0,
      stepDurationMs: 380,
      rootMidiNote: 53,
      baseInstrumentId: 'ridge-pass:percussion:3:-2',
      baseVolume: 0.02,
      baseAttackMs: 12,
      baseReleaseMs: 60,
      baseDetuneCents: 4,
      baseHarmonicGain: 0.12,
      basePulseRate: 1,
      brightness: 0.92,
      clusterX: 3,
      clusterY: -2,
    });

    expect(
      stable.some(
        (note) =>
          resolvePercussionFamilyFromInstrumentId(note.instrumentId) ===
            'kick' && note.startMs === 0
      )
    ).toBe(false);
    expect(
      changed.some(
        (note) =>
          resolvePercussionFamilyFromInstrumentId(note.instrumentId) ===
            'kick' && note.startMs === 0
      )
    ).toBe(true);
    expect(changed.length).toBe(stable.length + 1);
  });
});
