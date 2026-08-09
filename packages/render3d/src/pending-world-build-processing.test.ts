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
});
