import { describe, expect, it } from 'vitest';
import {
  createSoundBankDebugPercussionRangeAuditionNotes,
  createSoundBankDebugSnapshot,
  resolveSoundBankDebugPreviewNoteRole,
} from './sound-bank-debug.ts';

describe('sound bank debug preview mode', () => {
  it('can zero the wet send for dry melodic previews without changing the processed note timing', () => {
    const snapshot = createSoundBankDebugSnapshot({
      tileKind: 'cave',
      contextType: 'cave',
    });

    const processed = resolveSoundBankDebugPreviewNoteRole(
      snapshot,
      'lead',
      4_000
    );
    const dry = resolveSoundBankDebugPreviewNoteRole(snapshot, 'lead', 4_000, {
      dry: true,
    });

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
    const snapshot = createSoundBankDebugSnapshot({
      tileKind: 'cave',
      contextType: 'cave',
    });

    const processed = createSoundBankDebugPercussionRangeAuditionNotes(
      snapshot,
      { familyFilter: 'all' },
      6_000
    );
    const dry = createSoundBankDebugPercussionRangeAuditionNotes(
      snapshot,
      { familyFilter: 'all' },
      6_000,
      { dry: true }
    );

    expect(processed.length).toBeGreaterThan(0);
    expect(dry.length).toBe(processed.length);
    expect(processed.some((note) => (note.space?.wetGain ?? 0) > 0)).toBe(true);
    expect(dry.every((note) => (note.space?.wetGain ?? 0) === 0)).toBe(true);
  });
});
