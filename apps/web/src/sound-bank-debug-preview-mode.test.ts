import { describe, expect, it } from 'vitest';
import {
  createSoundBankDebugPercussionRangeAuditionNotes,
  createSoundBankDebugSnapshot,
  resolveSoundBankDebugPreviewPhraseRole,
  resolveSoundBankDebugPreviewNoteRole,
} from './sound-bank-debug.ts';

const CAVE_SNAPSHOT = createSoundBankDebugSnapshot({
  tileKind: 'cave',
  contextType: 'cave',
});

const FOREST_SNAPSHOT = createSoundBankDebugSnapshot({
  tileKind: 'forest',
  contextType: 'overworld',
  clusterX: 4,
  clusterY: -1,
});

describe('sound bank debug preview mode', () => {
  it('can zero the wet send for dry melodic previews without changing the processed note timing', () => {
    const processed = resolveSoundBankDebugPreviewNoteRole(
      CAVE_SNAPSHOT,
      'lead',
      4_000
    );
    const dry = resolveSoundBankDebugPreviewNoteRole(
      CAVE_SNAPSHOT,
      'lead',
      4_000,
      {
        dry: true,
      }
    );

    expect(processed).toBeTruthy();
    expect(dry).toBeTruthy();
    expect(processed?.startMs).toBe(dry?.startMs);
    expect(processed?.durationMs).toBe(dry?.durationMs);
    expect(processed?.space).toEqual(
      expect.objectContaining({
        wetGain: expect.any(Number),
      })
    );
    expect((processed?.space?.wetGain ?? 0) > 0).toBe(true);
    expect(dry?.space?.wetGain).toBe(0);
  });

  it('applies the selected preview mode across percussion audition macros', () => {
    const processed = createSoundBankDebugPercussionRangeAuditionNotes(
      CAVE_SNAPSHOT,
      { familyFilter: 'all' },
      6_000
    );
    const dry = createSoundBankDebugPercussionRangeAuditionNotes(
      CAVE_SNAPSHOT,
      { familyFilter: 'all' },
      6_000,
      { dry: true }
    );

    expect(processed.length).toBeGreaterThan(0);
    expect(dry.length).toBe(processed.length);
    expect(processed.some((note) => (note.space?.wetGain ?? 0) > 0)).toBe(true);
    expect(dry.every((note) => (note.space?.wetGain ?? 0) === 0)).toBe(true);
  });

  it('builds a short role phrase preview from the current generated song seed', () => {
    const notes = resolveSoundBankDebugPreviewPhraseRole(
      FOREST_SNAPSHOT,
      'lead',
      3_000
    );

    expect(notes.length).toBeGreaterThan(1);
    expect(notes.length).toBeLessThanOrEqual(8);
    expect(notes[0]?.startMs).toBe(3_004);
    expect(notes.every((note) => note.role === 'lead')).toBe(true);
  });

  it('can zero the wet send across a phrase preview in dry mode', () => {
    const notes = resolveSoundBankDebugPreviewPhraseRole(
      CAVE_SNAPSHOT,
      'lead',
      5_000,
      { dry: true }
    );

    expect(notes.length).toBeGreaterThan(1);
    expect(notes.every((note) => (note.space?.wetGain ?? 0) === 0)).toBe(true);
  });

  it('applies live envelope overrides across preview notes', () => {
    const note = resolveSoundBankDebugPreviewNoteRole(
      CAVE_SNAPSHOT,
      'lead',
      7_000,
      {
        envelope: {
          attackMs: 30,
          decayMs: 88,
          sustainLevel: 0.64,
          releaseMs: 190,
        },
      }
    );

    expect(note?.attackMs).toBe(30);
    expect(note?.releaseMs).toBe(190);
    expect(note?.timbre.bodySettleMs).toBe(88);
    expect(note?.timbre.bodySustainLevel).toBe(0.64);
  });

  it('applies live timbre overrides across preview notes', () => {
    const note = resolveSoundBankDebugPreviewNoteRole(
      CAVE_SNAPSHOT,
      'lead',
      8_000,
      {
        timbre: {
          detuneCents: 12,
          filterCutoffHz: 4_200,
          filterQ: 1.9,
          noiseMix: 0.22,
        },
      }
    );

    expect(note?.detuneCents).toBe(12);
    expect(note?.timbre.filterCutoffHz).toBe(4_200);
    expect(note?.timbre.filterQ).toBe(1.9);
    expect(note?.timbre.noiseMix).toBe(0.22);
  });

  it('applies live oscillator solo overrides across preview notes', () => {
    const note = resolveSoundBankDebugPreviewNoteRole(
      CAVE_SNAPSHOT,
      'lead',
      9_000,
      {
        oscillators: {
          carrierEnabled: true,
          harmonicEnabled: true,
          soloTarget: 'carrier',
        },
      }
    );

    expect(note?.timbre.fundamentalGainMultiplier ?? 1).toBeGreaterThan(0);
    expect(note?.harmonicGain).toBe(0);
  });
});
