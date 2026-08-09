import { describe, expect, it, vi } from 'vitest';

import {
  loadPersistedPageScrollY,
  normalizePageScrollY,
  restorePersistedPageScrollY,
  savePersistedPageScrollY,
} from './page-scroll-state.ts';

describe('page scroll state', () => {
  it('normalizes invalid and fractional scroll offsets conservatively', () => {
    expect(normalizePageScrollY(-10)).toBe(0);
    expect(normalizePageScrollY(18.8)).toBe(19);
    expect(normalizePageScrollY(Number.NaN)).toBe(0);
    expect(normalizePageScrollY(null)).toBe(0);
  });

  it('round-trips a persisted scroll position through storage', () => {
    const saved = new Map<string, string>();
    const storage = {
      getItem(key: string) {
        return saved.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        saved.set(key, value);
      },
    };

    savePersistedPageScrollY(storage, 'bworlds:test-scroll', 245.7);

    expect(loadPersistedPageScrollY(storage, 'bworlds:test-scroll')).toBe(246);
  });

  it('restores persisted scroll after the next paint tick', () => {
    const requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      callback(16);
      return 1;
    });
    const scrollTo = vi.fn();

    restorePersistedPageScrollY(320, {
      requestAnimationFrame,
      scrollTo,
    });

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(0, 320);
  });
});
