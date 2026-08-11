import { describe, expect, it } from 'vitest';

import type { MusicDebugSnapshot } from './music-debug.ts';
import { createMusicDebugSnapshotSignature } from './music-debug-snapshot-signature.ts';

const BASE_SNAPSHOT = {
  theme: { id: 'forest-theme' },
  songDna: { identityId: 'forest-song-dna' },
  notes: [
    {
      role: 'lead',
      startMs: 0,
      durationMs: 500,
      frequency: 440,
      velocity: 0.8,
      instrumentId: 'lead-flute',
    },
    {
      role: 'bass',
      startMs: 500,
      durationMs: 750,
      frequency: 220,
      velocity: 0.6,
      instrumentId: 'bass-pluck',
    },
  ],
  sectionLayerComparisons: [
    {
      sectionId: 'a',
      sectionLabel: 'A',
      matchesPlan: true,
      matchedRules: ['lead'],
      mismatchRules: [],
    },
  ],
  sectionMotifMatches: [
    {
      sectionId: 'a',
      sectionLabel: 'A',
      exactMatchCount: 2,
      variedMatchCount: 1,
      matchCount: 3,
    },
  ],
} satisfies Pick<
  MusicDebugSnapshot,
  'theme' | 'songDna' | 'notes' | 'sectionLayerComparisons' | 'sectionMotifMatches'
>;

describe('music debug snapshot signature', () => {
  it('returns the same signature for repeated identical snapshots', () => {
    expect(createMusicDebugSnapshotSignature(BASE_SNAPSHOT)).toBe(
      createMusicDebugSnapshotSignature({
        ...BASE_SNAPSHOT,
        notes: BASE_SNAPSHOT.notes.map((note) => ({ ...note })),
        sectionLayerComparisons: BASE_SNAPSHOT.sectionLayerComparisons.map(
          (comparison) => ({
            ...comparison,
            matchedRules: [...comparison.matchedRules],
            mismatchRules: [...comparison.mismatchRules],
          })
        ),
        sectionMotifMatches: BASE_SNAPSHOT.sectionMotifMatches.map((match) => ({
          ...match,
        })),
      })
    );
  });

  it('changes when snapshot note content changes', () => {
    const altered = {
      ...BASE_SNAPSHOT,
      notes: BASE_SNAPSHOT.notes.map((note, index) =>
        index === 0 ? { ...note, startMs: note.startMs + 1 } : note
      ),
    };

    expect(createMusicDebugSnapshotSignature(BASE_SNAPSHOT)).not.toBe(
      createMusicDebugSnapshotSignature(altered)
    );
  });
});
