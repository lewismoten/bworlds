import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPluginEventChannel } from '@bworlds/plugin-event-channel';

import {
  buildClientErrorSnapshot,
  buildClientErrorSnapshotFromPluginEvent,
  CLIENT_ERROR_SNAPSHOT_API_PATH,
  createClientErrorSnapshotMessageHash,
  installClientErrorSnapshotReporter,
  postClientErrorSnapshot,
} from './client-error-snapshot.ts';

describe('client error snapshots', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds snapshots with a stable message hash and normalized error details', () => {
    const snapshot = buildClientErrorSnapshot({
      error: new TypeError('Explosion'),
      source: 'window.error',
      pageUrl: 'https://example.com/play',
      createdAt: new Date('2026-08-11T12:00:00.000Z'),
    });

    expect(snapshot).toMatchObject({
      schemaVersion: 1,
      createdAt: '2026-08-11T12:00:00.000Z',
      message: 'Explosion',
      source: 'window.error',
      pageUrl: 'https://example.com/play',
      details: 'TypeError',
      messageHash: createClientErrorSnapshotMessageHash('Explosion'),
    });
    expect(snapshot.stack).toContain('TypeError: Explosion');
  });

  it('normalizes non-Error values into readable messages', () => {
    const snapshot = buildClientErrorSnapshot({
      error: { code: 500, ok: false },
      source: 'unhandledrejection',
      pageUrl: 'https://example.com/debug',
      createdAt: new Date('2026-08-11T12:00:00.000Z'),
    });

    expect(snapshot.message).toBe('Non-Error value: {"code":500,"ok":false}');
    expect(snapshot.details).toBe('{"code":500,"ok":false}');
    expect(snapshot.stack).toBeNull();
  });

  it('builds plugin error snapshots with the shared message hash and serialized details', () => {
    const snapshot = buildClientErrorSnapshotFromPluginEvent({
      event: {
        message: 'Forest bark cache failed.',
        source: 'tile-forest.materials',
        timestamp: '2026-08-12T12:00:00.000Z',
        details: {
          error: {
            name: 'Error',
            message: 'Forest bark cache failed.',
            stack: 'Error: Forest bark cache failed.\n    at forest.ts:1:1',
          },
          details: {
            code: 'forest-bark-cache',
          },
        },
      },
      pageUrl: 'https://example.com/play',
    });

    expect(snapshot).toEqual(
      expect.objectContaining({
        createdAt: '2026-08-12T12:00:00.000Z',
        message: 'Forest bark cache failed.',
        source: 'tile-forest.materials',
        pageUrl: 'https://example.com/play',
        messageHash: createClientErrorSnapshotMessageHash(
          'Forest bark cache failed.'
        ),
      })
    );
    expect(snapshot.stack).toContain('Forest bark cache failed.');
    expect(snapshot.details).toContain('forest-bark-cache');
  });

  it('posts snapshots to the vite endpoint when fetch is available', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }) as Response);
    const snapshot = buildClientErrorSnapshot({
      error: new Error('Posted'),
      source: 'console.error',
      pageUrl: 'https://example.com/play',
    });

    await expect(
      postClientErrorSnapshot(snapshot, { fetchImpl })
    ).resolves.toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      CLIENT_ERROR_SNAPSHOT_API_PATH,
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('skips reporting when runtime tracking is disabled', async () => {
    const target = createFakeEventTarget();
    const fetchImpl = vi.fn(async () => ({ ok: true }) as Response);
    const cleanup = installClientErrorSnapshotReporter({
      tracking: false,
      eventTarget: target,
      fetchImpl,
      getPageUrl: () => 'https://example.com/play',
      consoleRef: { error: vi.fn() },
    });

    target.dispatchEvent({
      type: 'error',
      error: new Error('disabled'),
      filename: '/src/main.ts',
      lineno: 10,
      colno: 20,
    });
    await flushMicrotasks();

    expect(fetchImpl).not.toHaveBeenCalled();
    cleanup();
  });

  it('skips reporting plugin error events when runtime tracking is disabled', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }) as Response);
    const pluginEventChannel = createPluginEventChannel();
    const cleanup = installClientErrorSnapshotReporter({
      tracking: false,
      fetchImpl,
      getPageUrl: () => 'https://example.com/play',
      consoleRef: { error: vi.fn() },
      pluginEventChannel,
    });

    pluginEventChannel.publishError({
      source: 'tile-forest.materials',
      message: 'Forest bark cache failed.',
      details: {
        code: 'forest-bark-cache',
      },
      timestamp: '2026-08-12T12:30:00.000Z',
    });
    await flushMicrotasks();

    expect(fetchImpl).not.toHaveBeenCalled();
    cleanup();
  });

  it('reports window errors, promise rejections, and console errors while preserving console output', async () => {
    const target = createFakeEventTarget();
    const fetchImpl = vi.fn(async () => ({ ok: true }) as Response);
    const consoleError = vi.fn();
    const consoleRef = { error: consoleError };
    const scheduleRethrow = vi.fn();
    const cleanup = installClientErrorSnapshotReporter({
      tracking: true,
      eventTarget: target,
      fetchImpl,
      getPageUrl: () => 'https://example.com/play',
      consoleRef,
      scheduleRethrow,
    });

    const windowError = new Error('window broke');
    const preventWindowDefault = vi.fn();
    target.dispatchEvent({
      type: 'error',
      error: windowError,
      filename: '/src/main.ts',
      lineno: 1,
      colno: 2,
      preventDefault: preventWindowDefault,
    });
    const preventRejectionDefault = vi.fn();
    target.dispatchEvent({
      type: 'unhandledrejection',
      reason: 'promise broke',
      preventDefault: preventRejectionDefault,
    });
    consoleError.mockClear();
    consoleRef.error(new Error('console broke'));

    await flushMicrotasks();

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(preventWindowDefault).toHaveBeenCalledTimes(1);
    expect(preventRejectionDefault).toHaveBeenCalledTimes(1);
    expect(scheduleRethrow).toHaveBeenCalledTimes(2);
    expect(scheduleRethrow).toHaveBeenNthCalledWith(1, windowError);
    expect(scheduleRethrow).toHaveBeenNthCalledWith(2, 'promise broke');
    const payloads = fetchImpl.mock.calls
      .map((call) => {
        const requestInit = (call as unknown[])[1];
        if (!requestInit || typeof requestInit !== 'object') {
          return null;
        }
        return 'body' in requestInit ? requestInit.body : null;
      })
      .filter((body): body is string => typeof body === 'string')
      .map((body) => JSON.parse(body));
    expect(payloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'window broke',
          source: '/src/main.ts:1:2',
        }),
        expect.objectContaining({
          message: 'promise broke',
          source: 'unhandledrejection',
        }),
        expect.objectContaining({
          message: 'console broke',
          source: 'console.error',
        }),
      ])
    );

    cleanup();
  });

  it('skips reporting the same error value when it is rethrown through the reporter scheduler', async () => {
    const target = createFakeEventTarget();
    const fetchImpl = vi.fn(async () => ({ ok: true }) as Response);
    const scheduledRethrows: unknown[] = [];
    const cleanup = installClientErrorSnapshotReporter({
      tracking: true,
      eventTarget: target,
      fetchImpl,
      getPageUrl: () => 'https://example.com/play',
      consoleRef: { error: vi.fn() },
      scheduleRethrow(value) {
        scheduledRethrows.push(value);
      },
    });

    const rethrownError = new Error('rethrow me');
    target.dispatchEvent({
      type: 'error',
      error: rethrownError,
      filename: '/src/main.ts',
      lineno: 2,
      colno: 3,
      preventDefault: vi.fn(),
    });
    await flushMicrotasks();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(scheduledRethrows).toEqual([rethrownError]);

    target.dispatchEvent({
      type: 'error',
      error: rethrownError,
      filename: '/src/main.ts',
      lineno: 2,
      colno: 3,
      preventDefault: vi.fn(),
    });
    await flushMicrotasks();

    expect(fetchImpl).toHaveBeenCalledTimes(1);

    target.dispatchEvent({
      type: 'error',
      error: rethrownError,
      filename: '/src/main.ts',
      lineno: 2,
      colno: 3,
      preventDefault: vi.fn(),
    });
    await flushMicrotasks();

    expect(fetchImpl).toHaveBeenCalledTimes(2);

    cleanup();
  });

  it('prevents reporting loops when snapshot delivery fails and logs through console.error', async () => {
    const target = createFakeEventTarget();
    const consoleError = vi.fn();
    const consoleRef = {
      error: (...args: unknown[]) => {
        consoleError(...args);
      },
    };
    let wrappedConsoleError: ((...args: unknown[]) => void) | null = null;
    const fetchImpl = vi.fn(async () => {
      wrappedConsoleError?.('nested delivery failure');
      throw new Error('post failed');
    });
    const cleanup = installClientErrorSnapshotReporter({
      tracking: true,
      eventTarget: target,
      fetchImpl,
      getPageUrl: () => 'https://example.com/play',
      consoleRef,
    });
    wrappedConsoleError = consoleRef.error;

    consoleRef.error(new Error('outer failure'));
    await flushMicrotasks();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledTimes(2);

    cleanup();
  });

  it('reports plugin error events through the existing snapshot endpoint', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }) as Response);
    const pluginEventChannel = createPluginEventChannel();
    const cleanup = installClientErrorSnapshotReporter({
      tracking: true,
      fetchImpl,
      getPageUrl: () => 'https://example.com/play',
      consoleRef: { error: vi.fn() },
      pluginEventChannel,
    });

    pluginEventChannel.publishError({
      source: 'tile-forest.materials',
      message: 'Forest bark cache failed.',
      details: {
        code: 'forest-bark-cache',
      },
      timestamp: '2026-08-12T12:45:00.000Z',
    });
    await flushMicrotasks();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const firstCall = fetchImpl.mock.calls[0] as unknown[] | undefined;
    const requestInit = firstCall?.[1];
    const payload =
      requestInit && typeof requestInit === 'object' && 'body' in requestInit
        ? JSON.parse(String(requestInit.body))
        : null;
    expect(payload).toEqual(
      expect.objectContaining({
        createdAt: '2026-08-12T12:45:00.000Z',
        message: 'Forest bark cache failed.',
        source: 'tile-forest.materials',
        pageUrl: 'https://example.com/play',
        messageHash: createClientErrorSnapshotMessageHash(
          'Forest bark cache failed.'
        ),
      })
    );

    cleanup();
  });
});

type FakeDispatchedEvent = {
  type: string;
  [key: string]: unknown;
};

function createFakeEventTarget() {
  const listeners = new Map<string, Set<(event: unknown) => void>>();

  return {
    addEventListener(type: string, listener: (event: unknown) => void) {
      const entries =
        listeners.get(type) ?? new Set<(event: unknown) => void>();
      entries.add(listener);
      listeners.set(type, entries);
    },
    removeEventListener(type: string, listener: (event: unknown) => void) {
      listeners.get(type)?.delete(listener);
    },
    dispatchEvent(event: FakeDispatchedEvent) {
      for (const listener of listeners.get(event.type) ?? []) {
        listener(event);
      }
    },
  };
}

async function flushMicrotasks(): Promise<void> {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
}
