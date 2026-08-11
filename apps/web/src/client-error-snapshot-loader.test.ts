import { afterEach, describe, expect, it, vi } from 'vitest';

import { installDeferredClientErrorSnapshotReporter } from './client-error-snapshot-loader.ts';

describe('client error snapshot loader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('installs the reporter after the deferred module resolves and forwards cleanup', async () => {
    const installedCleanup = vi.fn();
    const installClientErrorSnapshotReporter = vi.fn(() => installedCleanup);
    const cleanup = installDeferredClientErrorSnapshotReporter(
      {
        tracking: true,
      },
      {
        loadModule: async () => ({
          installClientErrorSnapshotReporter,
        }),
      }
    );

    await flushMicrotasks();

    expect(installClientErrorSnapshotReporter).toHaveBeenCalledWith({
      tracking: true,
    });

    cleanup();

    expect(installedCleanup).toHaveBeenCalledTimes(1);
  });

  it('does not install the reporter when cleanup happens before the module resolves', async () => {
    let resolveModule:
      | ((value: {
          installClientErrorSnapshotReporter: () => () => void;
        }) => void)
      | null = null;
    const installClientErrorSnapshotReporter = vi.fn(() => vi.fn());
    const cleanup = installDeferredClientErrorSnapshotReporter(
      {
        tracking: true,
      },
      {
        loadModule: () =>
          new Promise((resolve) => {
            resolveModule = resolve;
          }),
      }
    );

    cleanup();
    resolveModule?.({
      installClientErrorSnapshotReporter,
    });
    await flushMicrotasks();

    expect(installClientErrorSnapshotReporter).not.toHaveBeenCalled();
  });

  it('logs deferred loader failures through console.error', async () => {
    const consoleError = vi.fn();

    installDeferredClientErrorSnapshotReporter(
      {
        tracking: true,
      },
      {
        consoleRef: { error: consoleError },
        loadModule: async () => {
          throw new Error('chunk missing');
        },
      }
    );

    await flushMicrotasks();

    expect(consoleError).toHaveBeenCalledWith(
      'Failed to load client error snapshot reporter.',
      expect.any(Error)
    );
  });
});

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}
