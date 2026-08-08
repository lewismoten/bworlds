import { describe, expect, it } from 'vitest';
import {
  DEBUG_SNAPSHOT_SAMPLE_INTERVAL_MS,
  shouldCollectDebugSnapshot,
} from './debug-sampling.ts';

describe('debug sampling', () => {
  it('skips debug sampling when the inspector is not actively visible', () => {
    expect(
      shouldCollectDebugSnapshot({
        debugInspectorVisible: false,
        hasDebugSummary: true,
        hasGps: true,
        nowMs: 1000,
        lastSampleNowMs: null,
      })
    ).toBe(false);
  });

  it('allows the first visible debug sample immediately', () => {
    expect(
      shouldCollectDebugSnapshot({
        debugInspectorVisible: true,
        hasDebugSummary: true,
        hasGps: true,
        nowMs: 1000,
        lastSampleNowMs: null,
      })
    ).toBe(true);
  });

  it('throttles repeated visible debug samples to the configured interval', () => {
    expect(
      shouldCollectDebugSnapshot({
        debugInspectorVisible: true,
        hasDebugSummary: true,
        hasGps: true,
        nowMs: 1000 + DEBUG_SNAPSHOT_SAMPLE_INTERVAL_MS - 1,
        lastSampleNowMs: 1000,
      })
    ).toBe(false);

    expect(
      shouldCollectDebugSnapshot({
        debugInspectorVisible: true,
        hasDebugSummary: true,
        hasGps: true,
        nowMs: 1000 + DEBUG_SNAPSHOT_SAMPLE_INTERVAL_MS,
        lastSampleNowMs: 1000,
      })
    ).toBe(true);
  });
});
