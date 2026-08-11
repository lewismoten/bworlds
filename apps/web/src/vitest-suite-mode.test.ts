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
        'apps/web/src/music-debug-preview-wav.test.ts',
        'apps/web/src/procedural-music-song-base.test.ts',
        'apps/web/src/sound-effects.test.ts',
        'packages/map-overworld/src/index.test.ts',
        'packages/overworld-support/src/index.test.ts',
        'packages/runtime-dock-traffic/src/index.test.ts',
        'packages/worldgen/src/index.test.ts',
      ])
    );
  });

  it('keeps already-split support package behavior tests on the fast path', () => {
    expect(LONG_TEST_FILES).not.toContain(
      'packages/dock-route-support/src/index.test.ts'
    );
    expect(LONG_TEST_FILES).not.toContain(
      'packages/tile-route/src/index.test.ts'
    );
    expect(LONG_TEST_FILES).not.toContain(
      'packages/town-support/src/index.test.ts'
    );
  });

  it('relies on the .long.test.ts glob for renamed heavy audio suites', () => {
    expect(LONG_TEST_FILES).not.toContain(
      'apps/web/src/music-debug-export-bundle-archive.test.ts'
    );
    expect(LONG_TEST_FILES).not.toContain(
      'apps/web/src/music-debug-timeline.test.ts'
    );
    expect(LONG_TEST_FILES).not.toContain(
      'apps/web/src/music-debug-midi-export-metadata.test.ts'
    );
    expect(LONG_TEST_FILES).not.toContain(
      'apps/web/src/music-debug-midi-export-structure.test.ts'
    );
    expect(LONG_TEST_FILES).not.toContain(
      'apps/web/src/music-debug-midi-export-variants.test.ts'
    );
    expect(LONG_TEST_FILES).not.toContain(
      'apps/web/src/music-debug-markup.test.ts'
    );
    expect(LONG_TEST_FILES).not.toContain(
      'apps/web/src/music-debug-song-playback.test.ts'
    );
    expect(LONG_TEST_FILES).not.toContain(
      'apps/web/src/procedural-music-song-repair.test.ts'
    );
    expect(LONG_TEST_FILES).not.toContain(
      'apps/web/src/procedural-music.test.ts'
    );
    expect(LONG_TEST_FILES).not.toContain(
      'apps/web/src/sound-bank-debug-shell-audio.test.ts'
    );
    expect(LONG_TEST_FILES).not.toContain(
      'apps/web/src/testing/test-source-audit-repository.test.ts'
    );
  });
});
