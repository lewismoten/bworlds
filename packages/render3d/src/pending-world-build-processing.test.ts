import { describe, expect, it } from 'vitest';

import { shouldProcessPendingWorldBuildEntryWithinBudget } from './pending-world-build-processing.ts';

describe('pending world build processing helpers', () => {
  it('supports zero-minimum flushes without allocating budget wrapper objects', () => {
    expect(
      shouldProcessPendingWorldBuildEntryWithinBudget(100, 100, 0, 0, 4, 0)
    ).toBe(false);
    expect(
      shouldProcessPendingWorldBuildEntryWithinBudget(100, 100.5, 0, 1, 4, 1)
    ).toBe(true);
    expect(
      shouldProcessPendingWorldBuildEntryWithinBudget(100, 101.5, 1, 1, 4, 1)
    ).toBe(false);
  });

  it('keeps processing additional entries in the same flush while budget remains', () => {
    expect(
      shouldProcessPendingWorldBuildEntryWithinBudget(100, 100, 0, 2, 4, 0)
    ).toBe(true);
    expect(
      shouldProcessPendingWorldBuildEntryWithinBudget(100, 100.6, 1, 2, 4, 0)
    ).toBe(true);
    expect(
      shouldProcessPendingWorldBuildEntryWithinBudget(100, 101.9, 2, 2, 4, 0)
    ).toBe(true);
    expect(
      shouldProcessPendingWorldBuildEntryWithinBudget(100, 102, 3, 2, 4, 0)
    ).toBe(false);
  });
});
