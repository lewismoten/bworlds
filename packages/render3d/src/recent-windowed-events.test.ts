import { describe, expect, it } from 'vitest';

import { collectRecentWindowedEvents } from './recent-windowed-events.ts';

describe('recent windowed events', () => {
  it('collects only the newest in-window events without filtering the whole array', () => {
    expect(
      collectRecentWindowedEvents(
        [
          { nowMs: 100, id: 'a' },
          { nowMs: 200, id: 'b' },
          { nowMs: 300, id: 'c' },
        ],
        30150,
        {
          windowMs: 30000,
          maxEntries: 10,
        }
      )
    ).toEqual([
      { nowMs: 200, id: 'b' },
      { nowMs: 300, id: 'c' },
    ]);
  });

  it('caps the result to the newest requested entries', () => {
    expect(
      collectRecentWindowedEvents(
        [
          { nowMs: 100, id: 'a' },
          { nowMs: 200, id: 'b' },
          { nowMs: 300, id: 'c' },
        ],
        350,
        {
          windowMs: 30000,
          maxEntries: 2,
        }
      )
    ).toEqual([
      { nowMs: 200, id: 'b' },
      { nowMs: 300, id: 'c' },
    ]);
  });
});
