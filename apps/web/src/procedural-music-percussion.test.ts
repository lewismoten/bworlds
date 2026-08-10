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

    expect(notes).toHaveLength(3);
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
          resolvePercussionFamilyFromInstrumentId(note.instrumentId) === 'shaker'
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
          resolvePercussionFamilyFromInstrumentId(note.instrumentId) === 'cymbals'
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
});
