import { describe, expect, it, vi } from 'vitest';

import { registerAppEntryHmr } from './app-entry-hmr.ts';

describe('app entry hmr', () => {
  it('re-runs bootstrap when Vite accepts an update', async () => {
    let callback: (() => void) | null = null;
    const bootstrap = vi.fn();

    registerAppEntryHmr(bootstrap, {
      accept(nextCallback) {
        callback = nextCallback;
      },
    });

    callback?.();
    await Promise.resolve();

    expect(bootstrap).toHaveBeenCalledTimes(1);
  });

  it('does nothing when hot context is unavailable', () => {
    const bootstrap = vi.fn();

    registerAppEntryHmr(bootstrap, null);

    expect(bootstrap).not.toHaveBeenCalled();
  });
});
