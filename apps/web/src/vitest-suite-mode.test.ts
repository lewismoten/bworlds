import { describe, expect, it } from 'vitest';

import {
  LONG_TEST_FILES,
  LONG_TEST_GLOBS,
  resolveVitestSuiteMode,
  resolveVitestSuiteSelection,
} from '../../../vitest.suite-mode.ts';

describe('vitest suite mode', () => {
  it('normalizes supported suite modes and falls back to all', () => {
    expect(resolveVitestSuiteMode('fast')).toBe('fast');
    expect(resolveVitestSuiteMode('long')).toBe('long');
    expect(resolveVitestSuiteMode('all')).toBe('all');
    expect(resolveVitestSuiteMode('missing')).toBe('all');
  });

  it('selects the long-test list only for long-mode runs', () => {
    expect(resolveVitestSuiteSelection('fast')).toEqual({
      exclude: [...LONG_TEST_GLOBS, ...LONG_TEST_FILES],
    });
    expect(resolveVitestSuiteSelection('long')).toEqual({
      include: [...LONG_TEST_GLOBS, ...LONG_TEST_FILES],
    });
    expect(resolveVitestSuiteSelection('all')).toEqual({});
  });

  it('keeps broad audio and world sweeps off the fast suite', () => {
    expect(LONG_TEST_FILES).toEqual(
      expect.arrayContaining([
        'apps/web/src/ambience-debug.test.ts',
        'apps/web/src/procedural-music-song-repair.test.ts',
        'apps/web/src/procedural-music.test.ts',
        'packages/map-overworld/src/index.test.ts',
        'packages/overworld-support/src/index.test.ts',
        'packages/runtime-dock-traffic/src/index.test.ts',
        'packages/tile-route/src/index.test.ts',
        'packages/worldgen/src/index.test.ts',
      ])
    );
  });
});
