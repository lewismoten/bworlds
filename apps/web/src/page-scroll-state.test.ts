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
    const setTimeout = vi.fn(
      (callback: (...args: Array<unknown>) => void) => {
        callback();
        return 2 as unknown as ReturnType<typeof globalThis.setTimeout>;
      }
    );
    const scrollTo = vi.fn();

    restorePersistedPageScrollY(320, {
      requestAnimationFrame,
      scrollTo,
      setTimeout: setTimeout as unknown as typeof globalThis.setTimeout,
    });

    expect(requestAnimationFrame).toHaveBeenCalledTimes(2);
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith(0, 320);
  });
});
