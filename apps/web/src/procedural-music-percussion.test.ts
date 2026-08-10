import { describe, expect, it } from 'vitest';
import {
  createProceduralPercussionNotes,
  resolvePercussionFamilyFromInstrumentId,
} from './procedural-music-percussion.ts';

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
});
