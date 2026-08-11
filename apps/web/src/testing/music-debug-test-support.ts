import { resolveMusicDebugKnownGoodSeed } from '../music-debug-known-good-seeds.ts';
import { createMusicDebugSnapshot } from '../music-debug.ts';

export const FOREST_KNOWN_GOOD_SNAPSHOT = createMusicDebugSnapshot(
  resolveMusicDebugKnownGoodSeed('forest-structure-baseline').options
);

export const TOWN_KNOWN_GOOD_SNAPSHOT = createMusicDebugSnapshot(
  resolveMusicDebugKnownGoodSeed('town-blueprint-baseline').options,
  1000
);
