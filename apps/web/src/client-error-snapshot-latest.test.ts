import { describe, expect, it } from 'vitest';

import { readRecentClientErrorSnapshots } from '../client-error-snapshot-store.mjs';

describe('latest client error snapshots', () => {
  it('fails when local client error snapshots still exist on disk', () => {
    const snapshots = readRecentClientErrorSnapshots({ limit: 50 });
    if (snapshots.length === 0) {
      expect(true).toBe(true);
      return;
    }

    const details = snapshots
      .map(
        (snapshot) =>
          `${snapshot.createdAt} | ${snapshot.message}\n${snapshot.stack ?? 'No stack trace recorded.'}`
      )
      .join('\n\n');
    throw new Error(
      `Found saved client error snapshots. Fix the errors and remove the resolved snapshot files from disk.\n\n${details}`
    );
  });
});
