import { describe, expect, it } from 'vitest';

import {
  registerTestCleanup,
  runRegisteredTestCleanups,
  trackClosableTestResource,
} from './test-cleanup.ts';

describe('test cleanup helpers', () => {
  it('fails fast when a registered cleanup promise never settles', async () => {
    registerTestCleanup(() => new Promise<void>(() => {}));

    await expect(runRegisteredTestCleanups()).rejects.toThrow(
      'registered test cleanup did not resolve or reject within 100ms.'
    );
  });

  it('fails fast when a callback-style close never completes', async () => {
    trackClosableTestResource(
      {
        close(_callback: (error?: unknown) => void) {
          return undefined;
        },
      },
      {
        label: 'hung callback close',
      }
    );

    await expect(runRegisteredTestCleanups()).rejects.toThrow(
      'hung callback close did not resolve or reject within 100ms.'
    );
  });

  it('allows tracked async closers that settle in time', async () => {
    let terminated = false;
    trackClosableTestResource(
      {
        async terminate() {
          terminated = true;
        },
      },
      {
        label: 'terminating worker',
      }
    );

    await expect(runRegisteredTestCleanups()).resolves.toBeUndefined();
    expect(terminated).toBe(true);
  });
});
