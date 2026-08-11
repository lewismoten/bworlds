import { describe, expect, it } from 'vitest';

import {
  createMusicDebugSnapshot,
  type MusicDebugSnapshot,
} from './music-debug.ts';
import { createMusicDebugSnapshotSignature } from './music-debug-snapshot-signature.ts';

const SOURCE_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'forest',
  contextType: 'overworld',
  clusterX: 4,
  clusterY: -1,
});

const BASE_SNAPSHOT = {
  theme: SOURCE_SNAPSHOT.theme,
  songDna: SOURCE_SNAPSHOT.songDna,
  notes: SOURCE_SNAPSHOT.notes.slice(0, 2),
  sectionLayerComparisons: SOURCE_SNAPSHOT.sectionLayerComparisons.slice(0, 1),
  sectionMotifMatches: SOURCE_SNAPSHOT.sectionMotifMatches.slice(0, 1),
} satisfies Pick<
  MusicDebugSnapshot,
  | 'theme'
  | 'songDna'
  | 'notes'
  | 'sectionLayerComparisons'
  | 'sectionMotifMatches'
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
