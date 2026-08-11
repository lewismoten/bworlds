export const LONG_TEST_GLOBS = [
  'packages/**/src/**/*.long.test.ts',
  'apps/web/src/**/*.long.test.ts',
] as const;

export const LONG_TEST_FILES = [
  'apps/web/src/music-debug-known-good-seeds.long.test.ts',
  'apps/web/src/music-debug-snapshot-signature.long.test.ts',
  'packages/map-overworld/src/index.test.ts',
  'packages/map-town/src/index.test.ts',
  'packages/overworld-support/src/index.test.ts',
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
