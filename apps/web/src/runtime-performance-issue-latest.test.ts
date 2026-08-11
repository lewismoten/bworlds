import { describe, expect, it } from 'vitest';

import { readRecentRuntimePerformanceIssues } from '../runtime-performance-snapshot-store.mjs';

describe('latest runtime performance issues', () => {
  it('fails when local runtime performance issue reports still exist on disk', () => {
    const issues = readRecentRuntimePerformanceIssues({ limit: 50 });
    if (issues.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const details = issues
      .map(
        (issue) =>
          `${issue.createdAt} | ${issue.summary}\n${issue.reasons.join('\n')}`
      )
      .join('\n\n');
    throw new Error(
      `Found saved runtime performance issue reports. Investigate the runtime regressions and remove the resolved issue files from disk.\n\n${details}`
    );
  });
});
