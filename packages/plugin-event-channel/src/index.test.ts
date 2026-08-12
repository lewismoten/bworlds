import { describe, expect, it, vi } from 'vitest';
import {
  createPluginEventChannel,
  PLUGIN_EVENT_TYPES,
  serializePluginEventDetails,
} from './index.ts';

describe('plugin event channel', () => {
  it('publishes an event with no listeners and records it in newest-first history', () => {
    const channel = createPluginEventChannel({
      now: () => new Date('2026-08-12T12:00:00.000Z'),
    });

    const event = channel.publish({
      type: 'error',
      source: 'tile-forest',
      message: 'Shared bark material cache missed.',
    });

    expect(event).toEqual({
      type: 'error',
      source: 'tile-forest',
      message: 'Shared bark material cache missed.',
      timestamp: '2026-08-12T12:00:00.000Z',
    });
    expect(channel.getRecentEvents()).toEqual([event]);
  });

  it('publishes an event to one listener and freezes the delivered event', () => {
    const channel = createPluginEventChannel();
    const listener = vi.fn((event) => {
      expect(Object.isFrozen(event)).toBe(true);
      expect(() => {
        (event as { message: string }).message = 'mutated';
      }).toThrow();
    });
    channel.subscribe(listener);

    const event = channel.publish({
      type: 'warning',
      source: 'tile-forest.lod',
      message: 'Fallback model promoted.',
      details: { budget: 'draw-calls' },
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(event);
  });

  it('publishes an event to multiple listeners in registration order', () => {
    const channel = createPluginEventChannel();
    const calls: string[] = [];
    channel.subscribe(() => {
      calls.push('all-1');
    });
    channel.subscribe(() => {
      calls.push('all-2');
    });

    channel.publish({
      type: 'error',
      source: 'tile-town',
      message: 'Town label atlas failed.',
    });

    expect(calls).toEqual(['all-1', 'all-2']);
  });

  it('supports subscribing by event type', () => {
    const channel = createPluginEventChannel();
    const errorListener = vi.fn();
    channel.subscribeByType(PLUGIN_EVENT_TYPES.ERROR, errorListener);

    channel.publish({
      type: 'warning',
      source: 'tile-town',
      message: 'Ignored warning.',
    });
    channel.publish({
      type: 'error',
      source: 'tile-town',
      message: 'Town wall surface cache missed.',
    });

    expect(errorListener).toHaveBeenCalledTimes(1);
    expect(errorListener.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        type: 'error',
        message: 'Town wall surface cache missed.',
      })
    );
  });

  it('supports subscribing by source', () => {
    const channel = createPluginEventChannel();
    const forestListener = vi.fn();
    channel.subscribeBySource('tile-forest.materials', forestListener);

    channel.publish({
      type: 'error',
      source: 'tile-town.materials',
      message: 'Town material cache missed.',
    });
    channel.publish({
      type: 'error',
      source: 'tile-forest.materials',
      message: 'Forest material cache missed.',
    });

    expect(forestListener).toHaveBeenCalledTimes(1);
    expect(forestListener.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        source: 'tile-forest.materials',
      })
    );
  });

  it('returns unsubscribe functions and prevents duplicate listener registration', () => {
    const channel = createPluginEventChannel();
    const listener = vi.fn();
    const unsubscribeFirst = channel.subscribe(listener);
    const unsubscribeDuplicate = channel.subscribe(listener);

    channel.publish({
      type: 'error',
      source: 'tile-sign',
      message: 'Label paint cache failed.',
    });
    unsubscribeDuplicate();
    channel.publish({
      type: 'error',
      source: 'tile-sign',
      message: 'Sign material cache failed again.',
    });
    unsubscribeFirst();
    channel.publish({
      type: 'error',
      source: 'tile-sign',
      message: 'This should not be observed.',
    });

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('keeps one broken listener from stopping later listeners', () => {
    const onListenerError = vi.fn();
    const channel = createPluginEventChannel({ onListenerError });
    const first = vi.fn(() => {
      throw new Error('broken listener');
    });
    const second = vi.fn();
    channel.subscribe(first);
    channel.subscribe(second);

    const event = channel.publish({
      type: 'error',
      source: 'tile-dungeon',
      message: 'Gate beacon cache missed.',
    });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(onListenerError).toHaveBeenCalledWith(
      expect.any(Error),
      event,
      first
    );
  });

  it('prevents identical recursive publish loops while still allowing distinct nested events', () => {
    const channel = createPluginEventChannel();
    const seenMessages: string[] = [];

    channel.subscribe((event) => {
      seenMessages.push(event.message);
      if (event.message === 'Forest bark cache failed.') {
        channel.publish({
          type: 'error',
          source: 'tile-forest.materials',
          message: 'Forest bark cache failed.',
        });
        channel.publish({
          type: 'warning',
          source: 'tile-forest.materials',
          message: 'Forest bark cache retry scheduled.',
        });
      }
    });

    channel.publish({
      type: 'error',
      source: 'tile-forest.materials',
      message: 'Forest bark cache failed.',
    });

    expect(seenMessages).toEqual([
      'Forest bark cache failed.',
      'Forest bark cache retry scheduled.',
    ]);
    expect(channel.getRecentEvents().map((event) => event.message)).toEqual([
      'Forest bark cache retry scheduled.',
      'Forest bark cache failed.',
    ]);
  });

  it('rejects event messages over 80 characters', () => {
    const channel = createPluginEventChannel();

    expect(() =>
      channel.publish({
        type: 'error',
        source: 'tile-dungeon',
        message:
          'This plugin event message is intentionally too long to fit inside the required limit.',
      })
    ).toThrowError('Plugin event message must not exceed 80 characters.');
  });

  it('serializes error details, preserves stack-like fields, and removes functions', () => {
    const error = new Error('Forest bark cache failed.');
    error.stack = 'Error: Forest bark cache failed.\n    at forest.ts:12:1';
    const channel = createPluginEventChannel();

    const event = channel.publishError({
      source: 'tile-forest.materials',
      message: 'Forest bark cache failed.',
      error,
      details: {
        quality: 'reduced',
        onRetry() {
          throw new Error('not serialized');
        },
      },
    });

    expect(event).toEqual(
      expect.objectContaining({
        type: 'error',
        source: 'tile-forest.materials',
        severity: 'error',
        details: {
          error: {
            name: 'Error',
            message: 'Forest bark cache failed.',
            stack: 'Error: Forest bark cache failed.\n    at forest.ts:12:1',
          },
          details: {
            quality: 'reduced',
          },
        },
      })
    );
  });

  it('serializes circular details safely and bounds history size', () => {
    const circular: Record<string, unknown> = {
      label: 'cycle',
    };
    circular.self = circular;
    const channel = createPluginEventChannel({
      maxHistory: 2,
    });

    const first = channel.publish({
      type: 'warning',
      source: 'tile-route',
      message: 'First issue.',
    });
    const second = channel.publish({
      type: 'warning',
      source: 'tile-route',
      message: 'Second issue.',
      details: circular,
    });
    const third = channel.publish({
      type: 'warning',
      source: 'tile-forest',
      message: 'Third issue.',
    });

    expect(second.details).toEqual({
      label: 'cycle',
      self: '[Circular]',
    });
    expect(channel.getRecentEvents()).toEqual([third, second]);
    expect(channel.getRecentEvents({ source: 'tile-route' })).toEqual([second]);
    expect(channel.getRecentEvents({ type: 'warning', limit: 1 })).toEqual([
      third,
    ]);
    channel.clearHistory();
    expect(channel.getRecentEvents()).toEqual([]);
    expect(first).toBeDefined();
  });

  it('marks detail truncation when values exceed depth, breadth, or string limits', () => {
    const result = serializePluginEventDetails(
      {
        long: 'x'.repeat(12),
        nested: {
          keep: 'ok',
          deeper: {
            tooDeep: true,
          },
        },
        extraA: 1,
        extraB: 2,
        extraC: 3,
      },
      {
        maxDepth: 2,
        maxEntriesPerLevel: 3,
        maxStringLength: 6,
      }
    );

    expect(result).toEqual({
      long: 'xxxxx…',
      nested: {
        keep: 'ok',
        deeper: {
          __truncated: true,
        },
      },
      extraA: 1,
      __truncated: true,
    });
  });
});
