import { describe, expect, it } from 'vitest';

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
