import { describe, expect, it } from 'vitest';

import {
  collectMergedRecentDebugEvents,
  formatRecentDebugEventReason,
  getMostRecentDebugEventByType,
} from './recent-debug-events.ts';

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

  it('returns the most recent event of the requested type', () => {
    expect(
      getMostRecentDebugEventByType(
        [
          { nowMs: 100, type: 'fallback-box', summary: 'older' },
          { nowMs: 200, type: 'lod-changed' },
          { nowMs: 300, type: 'fallback-box', summary: 'newer' },
        ],
        'fallback-box'
      )
    ).toEqual({ nowMs: 300, type: 'fallback-box', summary: 'newer' });
    expect(
      getMostRecentDebugEventByType(
        [{ nowMs: 200, type: 'lod-changed' }],
        'model-rejected'
      )
    ).toBeNull();
  });

  it('formats debug event reasons with tile and plugin context when present', () => {
    expect(
      formatRecentDebugEventReason({
        tileKey: '15:-9',
        plugin: 'tile-forest',
        summary: 'low failed',
      })
    ).toBe('15:-9 / tile-forest: low failed');
    expect(
      formatRecentDebugEventReason({
        plugin: 'tile-forest',
        summary: 'budget exceeded',
      })
    ).toBe('tile-forest: budget exceeded');
    expect(
      formatRecentDebugEventReason({
        tileKey: '15:-9',
        plugin: 'tile-forest',
        summary: '   ',
      })
    ).toBe('15:-9 / tile-forest');
  });
});
