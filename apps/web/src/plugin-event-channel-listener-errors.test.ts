import { describe, expect, it, vi } from 'vitest';
import { createPluginEventChannel } from '@bworlds/plugin-event-channel';

import { createPluginEventChannelListenerErrorHandler } from './plugin-event-channel-listener-errors.ts';

describe('plugin event channel listener errors', () => {
  it('logs listener failures with event context and the original error', () => {
    const consoleError = vi.fn();
    const channel = createPluginEventChannel({
      onListenerError: createPluginEventChannelListenerErrorHandler({
        error: consoleError,
      }),
    });
    const brokenListener = function brokenListener() {
      throw new Error('listener broke');
    };

    channel.subscribe(brokenListener);
    channel.publish({
      type: 'error',
      source: 'tile-forest.materials',
      message: 'Forest bark cache failed.',
    });

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      'Plugin event listener failed for tile-forest.materials error "Forest bark cache failed.".',
      {
        event: expect.objectContaining({
          type: 'error',
          source: 'tile-forest.materials',
          message: 'Forest bark cache failed.',
        }),
        listenerName: 'brokenListener',
      },
      expect.any(Error)
    );
    const loggedError = consoleError.mock.calls[0]?.[2];
    expect(loggedError).toBeInstanceOf(Error);
    expect((loggedError as Error).message).toBe('listener broke');
  });
});
