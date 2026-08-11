export const LONG_TEST_GLOBS = [
  'packages/**/src/**/*.long.test.ts',
  'apps/web/src/**/*.long.test.ts',
] as const;

export const LONG_TEST_FILES = [
  'apps/web/src/ambience-debug.test.ts',
  'apps/web/src/music-debug-preview-wav.test.ts',
  'apps/web/src/music-debug-midi-audit-baseline.test.ts',
  'apps/web/src/music-debug-midi-audit-mismatch.test.ts',
  'apps/web/src/music-debug-midi-audit-warnings.test.ts',
  'apps/web/src/music-debug-export-bundle-percussion.test.ts',
  'apps/web/src/music-debug-known-good-seeds.long.test.ts',
  'apps/web/src/music-debug-midi-interaction.test.ts',
  'apps/web/src/music-debug-midi-validation-content.test.ts',
  'apps/web/src/music-debug-note-analysis.test.ts',
  'apps/web/src/music-debug-snapshot-signature.long.test.ts',
  'apps/web/src/music-debug-behavior.test.ts',
  'apps/web/src/music-debug-snapshot-representative.test.ts',
  'apps/web/src/music-debug-track-stats.test.ts',
  'apps/web/src/procedural-music-harmony-chords.test.ts',
  'apps/web/src/procedural-music-harmony-lead.test.ts',
  'apps/web/src/procedural-music-harmony-voicing.test.ts',
  'apps/web/src/procedural-music-song-base.test.ts',
  'apps/web/src/procedural-music-song-arrangement-boundaries.test.ts',
  'apps/web/src/procedural-music-song-arrangement-dynamics.test.ts',
  'apps/web/src/procedural-music-song-arrangement-identity.test.ts',
  'apps/web/src/procedural-music-song-phrasing.test.ts',
  'apps/web/src/procedural-music-song-structure-layout.test.ts',
  'apps/web/src/procedural-music-song-structure-motif.test.ts',
  'apps/web/src/sound-effects.test.ts',
  'apps/web/src/sound-bank-debug-midi-browser.test.ts',
  'apps/web/src/sound-bank-debug-percussion.test.ts',
  'apps/web/src/tree-debug-quality.test.ts',
  'packages/map-overworld/src/index.test.ts',
  'packages/map-station/src/index.test.ts',
  'packages/map-town/src/index.test.ts',
  'packages/overworld-support/src/index.test.ts',
  'packages/runtime-dock-traffic/src/index.test.ts',
  'packages/runtime-rail-network/src/index.test.ts',
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
      include: [...LONG_TEST_GLOBS, ...LONG_TEST_FILES],
    };
  }
  if (mode === 'fast') {
    return {
      exclude: [...LONG_TEST_GLOBS, ...LONG_TEST_FILES],
    };
  }
  return {};
}
