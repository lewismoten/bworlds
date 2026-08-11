import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import { createMusicDebugSnapshotSignature } from './music-debug-snapshot-signature.ts';

describe('music debug snapshot signature long-running checks', () => {
  it('stays stable across repeated representative generated snapshots', () => {
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
});
