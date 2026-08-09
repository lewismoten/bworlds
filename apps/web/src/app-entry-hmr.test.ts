import { describe, expect, it, vi } from 'vitest';

import { registerAppEntryHmr } from './app-entry-hmr.ts';

describe('app entry hmr', () => {
  it('registers a hot accept boundary without forcing bootstrap reruns', () => {
    let callback: (() => void) | null = null;
    const bootstrap = vi.fn();

    registerAppEntryHmr(bootstrap, {
      accept(nextCallback) {
        callback = nextCallback;
      },
    });

    expect(callback).toBeTypeOf('function');
    callback?.();
    expect(bootstrap).not.toHaveBeenCalled();
  });

  it('keeps the active page mounted across repeated accepted updates', () => {
    let acceptCallCount = 0;
    const bootstrap = vi.fn();

    registerAppEntryHmr(bootstrap, {
      accept(nextCallback) {
        acceptCallCount += 1;
        nextCallback?.();
        nextCallback?.();
        nextCallback?.();
      },
    });

    expect(acceptCallCount).toBe(1);
    expect(bootstrap).not.toHaveBeenCalled();
  });

  it('does nothing when hot context is unavailable', () => {
    const bootstrap = vi.fn();

    registerAppEntryHmr(bootstrap, null);

    expect(bootstrap).not.toHaveBeenCalled();
  });
});
