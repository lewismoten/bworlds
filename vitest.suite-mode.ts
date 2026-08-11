export const LONG_TEST_FILES = [
  'packages/core/src/index.long.test.ts',
  'packages/map-depth/src/index.long.test.ts',
  'packages/runtime-weather/src/index.long.test.ts',
  'packages/town-support/src/index.long.test.ts',
  'apps/web/src/music-debug-midi-audit-baseline.test.ts',
  'apps/web/src/music-debug-midi-audit-mismatch.test.ts',
  'apps/web/src/music-debug-midi-audit-warnings.test.ts',
  'apps/web/src/music-debug-export-bundle-percussion.test.ts',
  'apps/web/src/music-debug-export-bundle-archive.test.ts',
  'apps/web/src/music-debug-export-bundle-download.test.ts',
  'apps/web/src/music-debug-export-bundle-fallback.test.ts',
  'apps/web/src/music-debug-export-bundle-metrics.test.ts',
  'apps/web/src/music-debug-known-good-seeds.long.test.ts',
  'apps/web/src/music-debug-midi-export-metadata.test.ts',
  'apps/web/src/music-debug-midi-export-structure.test.ts',
  'apps/web/src/music-debug-midi-export-variants.test.ts',
  'apps/web/src/music-debug-midi-interaction.test.ts',
  'apps/web/src/music-debug-midi-validation-content.test.ts',
  'apps/web/src/music-debug-midi-validation-core.test.ts',
  'apps/web/src/music-debug-note-analysis.test.ts',
  'apps/web/src/music-debug-snapshot-signature.long.test.ts',
  'apps/web/src/music-debug-behavior.test.ts',
  'apps/web/src/music-debug-markup.test.ts',
  'apps/web/src/music-debug-song-playback.test.ts',
  'apps/web/src/music-debug-snapshot-generation.test.ts',
  'apps/web/src/music-debug-snapshot-representative.test.ts',
  'apps/web/src/testing/test-source-audit-repository.test.ts',
  'apps/web/src/music-debug-track-stats.test.ts',
  'apps/web/src/procedural-music-harmony.test.ts',
  'apps/web/src/procedural-music-song-arrangement-boundaries.test.ts',
  'apps/web/src/procedural-music-song-arrangement-dynamics.test.ts',
  'apps/web/src/procedural-music-song-arrangement-identity.test.ts',
  'apps/web/src/procedural-music-song-phrasing.test.ts',
  'apps/web/src/procedural-music-song-structure-layout.test.ts',
  'apps/web/src/procedural-music-song-structure-motif.test.ts',
  'apps/web/src/sound-bank-debug-midi-browser.test.ts',
  'apps/web/src/sound-bank-debug-percussion.test.ts',
  'apps/web/src/sound-bank-debug-shell-audio.test.ts',
  'apps/web/src/sound-bank-debug-shell-markup.test.ts',
  'apps/web/src/sound-bank-debug-shell-options.test.ts',
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
