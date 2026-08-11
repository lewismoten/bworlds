import { describe, expect, it } from 'vitest';

import { collectMergedRecentDebugEvents } from './recent-debug-events.ts';

describe('recent debug events', () => {
  it('merges local and renderer events in order within the time window', () => {
    expect(
      collectMergedRecentDebugEvents(
        [
          { nowMs: 100, type: 'graphics-quality-changed' },
          { nowMs: 250, type: 'graphics-quality-changed' },
        ],
        [
          { nowMs: 200, type: 'lod-changed' },
          { nowMs: 275, type: 'fallback-box' },
          { nowMs: 300, type: 'model-rejected' },
        ],
        350,
        {
          windowMs: 30000,
          maxEntries: 10,
        }
      )
    ).toEqual([
      { nowMs: 100, type: 'graphics-quality-changed' },
      { nowMs: 200, type: 'lod-changed' },
      { nowMs: 250, type: 'graphics-quality-changed' },
      { nowMs: 275, type: 'fallback-box' },
      { nowMs: 300, type: 'model-rejected' },
    ]);
  });

  it('keeps only the newest merged entries inside the cap', () => {
    expect(
      collectMergedRecentDebugEvents(
        [
          { nowMs: 100, type: 'graphics-quality-changed' },
          { nowMs: 250, type: 'graphics-quality-changed' },
        ],
        [
          { nowMs: 200, type: 'lod-changed' },
          { nowMs: 275, type: 'fallback-box' },
          { nowMs: 300, type: 'model-rejected' },
        ],
        350,
        {
          windowMs: 30000,
          maxEntries: 2,
        }
      )
    ).toEqual([
      { nowMs: 275, type: 'fallback-box' },
      { nowMs: 300, type: 'model-rejected' },
    ]);
  });
});
