import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  MUSIC_DEBUG_KNOWN_GOOD_SEEDS,
  resolveMusicDebugKnownGoodSeed,
} from './music-debug-known-good-seeds.ts';

describe('music debug known-good seeds', () => {
  it('defines unique known-good seed ids for regression coverage', () => {
    expect(
      new Set(MUSIC_DEBUG_KNOWN_GOOD_SEEDS.map((seed) => seed.id)).size
    ).toBe(MUSIC_DEBUG_KNOWN_GOOD_SEEDS.length);
  });

  it('builds deterministic snapshots for each registered known-good seed', () => {
    for (const seed of MUSIC_DEBUG_KNOWN_GOOD_SEEDS) {
      const first = createMusicDebugSnapshot(seed.options);
      const second = createMusicDebugSnapshot(seed.options);

      expect(first.theme.id).toBe(second.theme.id);
      expect(first.songDna.identityId).toBe(second.songDna.identityId);
      expect(first.notes).toEqual(second.notes);
      expect(first.sectionLayerComparisons).toEqual(
        second.sectionLayerComparisons
      );
      expect(first.sectionMotifMatches).toEqual(second.sectionMotifMatches);
    }
  });

  it('resolves known-good seeds by id for reuse across regression tests', () => {
    expect(resolveMusicDebugKnownGoodSeed('forest-structure-baseline')).toEqual(
      expect.objectContaining({
        label: 'Forest Structure Baseline',
        options: expect.objectContaining({
          tileKind: 'forest',
          clusterX: 4,
          clusterY: -1,
        }),
      })
    );
  });
});
