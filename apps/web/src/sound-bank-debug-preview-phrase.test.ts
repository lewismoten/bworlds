import { describe, expect, it } from 'vitest';
import {
  createSoundBankDebugSnapshot,
  resolveSoundBankDebugPreviewPhraseRole,
} from './sound-bank-debug.ts';

describe('sound bank debug preview phrase', () => {
  it('builds a short role phrase preview from the current generated song seed', () => {
    const snapshot = createSoundBankDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });

    const notes = resolveSoundBankDebugPreviewPhraseRole(
      snapshot,
      'lead',
      3_000
    );

    expect(notes.length).toBeGreaterThan(1);
    expect(notes.length).toBeLessThanOrEqual(8);
    expect(notes[0]?.startMs).toBe(3_004);
    expect(notes.every((note) => note.role === 'lead')).toBe(true);
  });

  it('can zero the wet send across a phrase preview in dry mode', () => {
    const snapshot = createSoundBankDebugSnapshot({
      tileKind: 'cave',
      contextType: 'cave',
    });

    const notes = resolveSoundBankDebugPreviewPhraseRole(
      snapshot,
      'lead',
      5_000,
      { dry: true }
    );

    expect(notes.length).toBeGreaterThan(1);
    expect(notes.every((note) => (note.space?.wetGain ?? 0) === 0)).toBe(true);
  });
});
