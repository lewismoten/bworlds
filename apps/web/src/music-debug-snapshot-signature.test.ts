import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import { createMusicDebugSnapshotSignature } from './music-debug-snapshot-signature.ts';

describe('music debug snapshot signature', () => {
  it('returns the same signature for repeated identical snapshots', () => {
    const first = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });
    const second = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });

    expect(createMusicDebugSnapshotSignature(first)).toBe(
      createMusicDebugSnapshotSignature(second)
    );
  });

  it('changes when snapshot note content changes', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });
    const altered = {
      ...snapshot,
      notes: snapshot.notes.map((note, index) =>
        index === 0 ? { ...note, startMs: note.startMs + 1 } : note
      ),
    };

    expect(createMusicDebugSnapshotSignature(snapshot)).not.toBe(
      createMusicDebugSnapshotSignature(altered)
    );
  });
});
