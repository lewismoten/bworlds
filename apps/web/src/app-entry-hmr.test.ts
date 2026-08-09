import { describe, expect, it, vi } from 'vitest';

import { registerAppEntryHmr } from './app-entry-hmr.ts';

describe('app entry hmr', () => {
  it('re-runs bootstrap when Vite accepts an update', async () => {
    vi.useFakeTimers();
    let callback: (() => void) | null = null;
    const bootstrap = vi.fn();

    registerAppEntryHmr(bootstrap, {
      accept(nextCallback) {
        callback = nextCallback;
      },
    });

    callback?.();
    await vi.advanceTimersByTimeAsync(80);
    await Promise.resolve();

    expect(bootstrap).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('coalesces rapid Vite updates into a single remount', async () => {
    vi.useFakeTimers();
    let callback: (() => void) | null = null;
    const bootstrap = vi.fn();

    registerAppEntryHmr(bootstrap, {
      accept(nextCallback) {
        callback = nextCallback;
      },
    });

    callback?.();
    callback?.();
    callback?.();
    await vi.advanceTimersByTimeAsync(80);
    await Promise.resolve();

    expect(bootstrap).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('does nothing when hot context is unavailable', () => {
    const bootstrap = vi.fn();

    registerAppEntryHmr(bootstrap, null);

    expect(bootstrap).not.toHaveBeenCalled();
  });
});
