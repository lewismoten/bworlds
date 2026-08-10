import { describe, expect, it } from 'vitest';
import { readRecentRuntimePerformanceSnapshots } from '../runtime-performance-snapshot-store.mjs';

describe('latest runtime performance snapshots', () => {
  it('validate the most recent snapshots when they exist without requiring them to exist in every environment', () => {
    const snapshots = readRecentRuntimePerformanceSnapshots({ limit: 3 });
    if (snapshots.length === 0) {
      expect(true).toBe(true);
      return;
    }

    for (const snapshot of snapshots) {
      expect(snapshot.schemaVersion).toBe(1);
      expect(typeof snapshot.createdAt).toBe('string');
      expect(Array.isArray(snapshot.violations)).toBe(true);
      expect(snapshot.violations).toHaveLength(0);
      expect(snapshot.metrics).toHaveProperty('maximumFrameMs');
      expect(snapshot.metrics).toHaveProperty('drawCalls');
      expect(snapshot.metrics).toHaveProperty('audioNodeCount');
    }
  });
});
