import { describe, expect, it } from 'vitest';

import { auditRepositoryTestSources } from './test-source-audit.ts';

describe('test source audit repository sweep', () => {
  it('keeps repository test sources free of unbounded loops and oversized fixtures', async () => {
    await expect(auditRepositoryTestSources()).resolves.toEqual([]);
  });
});
