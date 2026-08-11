export const LONG_TEST_FILES = [
  'apps/web/src/music-debug-midi-audit.test.ts',
  'apps/web/src/music-debug-export-bundle-percussion.test.ts',
  'apps/web/src/music-debug-export-bundle.test.ts',
  'apps/web/src/music-debug-known-good-seeds.test.ts',
  'apps/web/src/music-debug-midi.test.ts',
  'apps/web/src/music-debug-note-analysis.test.ts',
  'apps/web/src/music-debug.test.ts',
  'apps/web/src/music-debug-track-stats.test.ts',
  'apps/web/src/procedural-music-harmony.test.ts',
  'apps/web/src/procedural-music-song.test.ts',
  'apps/web/src/sound-bank-debug.test.ts',
  'apps/web/src/tree-debug-quality.test.ts',
  'packages/tile-forest/src/index.test.ts',
  'packages/worldgen/src/index.test.ts',
] as const;

export type VitestSuiteMode = 'all' | 'fast' | 'long';

export function resolveVitestSuiteMode(
  value: string | null | undefined
): VitestSuiteMode {
  if (value === 'fast' || value === 'long' || value === 'all') {
    return value;
  }
  return 'all';
}

export function resolveVitestSuiteSelection(mode: VitestSuiteMode): {
  include?: readonly string[];
  exclude?: readonly string[];
} {
  if (mode === 'long') {
    return {
      include: LONG_TEST_FILES,
    };
  }
  if (mode === 'fast') {
    return {
      exclude: LONG_TEST_FILES,
    };
  }
  return {};
}
