import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import { MUSIC_DEBUG_KNOWN_GOOD_SEEDS } from './music-debug-known-good-seeds.ts';
import { createMusicDebugSnapshotSignature } from './music-debug-snapshot-signature.ts';

describe('music debug known-good seeds long-running checks', () => {
  it('builds deterministic snapshots for each registered known-good seed', () => {
    for (const seed of MUSIC_DEBUG_KNOWN_GOOD_SEEDS) {
      const first = createMusicDebugSnapshot(seed.options);
      const second = createMusicDebugSnapshot(seed.options);

      expect(createMusicDebugSnapshotSignature(first)).toBe(
        createMusicDebugSnapshotSignature(second)
      );
    }
  }, 3_000);
});
