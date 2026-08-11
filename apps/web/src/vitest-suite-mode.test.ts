import { describe, expect, it } from 'vitest';

import {
  LONG_TEST_FILES,
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
      exclude: LONG_TEST_FILES,
    });
    expect(resolveVitestSuiteSelection('long')).toEqual({
      include: LONG_TEST_FILES,
    });
    expect(resolveVitestSuiteSelection('all')).toEqual({});
  });
});
