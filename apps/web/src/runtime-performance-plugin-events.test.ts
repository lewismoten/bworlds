import { describe, expect, it, vi } from 'vitest';
import {
  createPluginEventChannel,
  type PluginEvent,
} from '@bworlds/plugin-event-channel';
import {
  createDebugSnapshotPluginErrorEvent,
  createEmptyRuntimePerformanceSnapshotPluginEventSummary,
  createRuntimePerformancePluginEventTracker,
  installRuntimePerformancePluginErrorTracking,
} from './runtime-performance-plugin-events.ts';

describe('runtime performance plugin events', () => {
  it('starts with an empty snapshot summary', () => {
    expect(createEmptyRuntimePerformanceSnapshotPluginEventSummary()).toEqual({
      recent: [],
      countsByType: {},
      countsBySource: {},
    });
  });

  it('records newest-first plugin error history and counts by type and source', () => {
    const tracker = createRuntimePerformancePluginEventTracker({
      maxHistory: 2,
    });

    tracker.record(createPluginEvent('tile-forest.materials', 'First issue.'));
    tracker.record(createPluginEvent('tile-town.materials', 'Second issue.'));
    tracker.record(createPluginEvent('tile-forest.materials', 'Third issue.'));

    expect(tracker.getSnapshot()).toEqual({
      recent: [
        {
          type: 'error',
          source: 'tile-forest.materials',
          message: 'Third issue.',
          timestamp: '2026-08-12T12:00:00.000Z',
          severity: 'error',
          details: {
            code: 'shared-material-miss',
          },
        },
        {
          type: 'error',
          source: 'tile-town.materials',
          message: 'Second issue.',
          timestamp: '2026-08-12T12:00:00.000Z',
          severity: 'error',
          details: {
            code: 'shared-material-miss',
          },
        },
      ],
      countsByType: {
        error: 2,
      },
      countsBySource: {
        'tile-forest.materials': 1,
        'tile-town.materials': 1,
      },
    });
  });

  it('installs plugin error tracking on the shared event channel and emits debug recent events', () => {
    const channel = createPluginEventChannel();
    const tracker = createRuntimePerformancePluginEventTracker();
    const onDebugEvent = vi.fn();
    const unsubscribe = installRuntimePerformancePluginErrorTracking(
      channel,
      tracker,
      {
        nowMs: () => 4321,
        onDebugEvent,
      }
    );

    channel.publish({
      type: 'warning',
      source: 'tile-forest.materials',
      message: 'Ignored warning.',
    });
    channel.publishError({
      source: 'tile-forest.materials',
      message: 'Forest bark cache failed.',
      details: {
        code: 'forest-bark-cache',
      },
      timestamp: '2026-08-12T14:45:00.000Z',
    });
    unsubscribe();
    channel.publishError({
      source: 'tile-town.materials',
      message: 'Town wall cache failed.',
    });

    expect(tracker.getSnapshot().recent).toEqual([
      {
        type: 'error',
        source: 'tile-forest.materials',
        message: 'Forest bark cache failed.',
        timestamp: '2026-08-12T14:45:00.000Z',
        severity: 'error',
        details: {
          code: 'forest-bark-cache',
        },
      },
    ]);
    expect(onDebugEvent).toHaveBeenCalledWith({
      nowMs: 4321,
      type: 'plugin-error',
      plugin: 'tile-forest.materials',
      source: 'tile-forest.materials',
      summary: 'Forest bark cache failed.',
      details: {
        code: 'forest-bark-cache',
      },
      severity: 'error',
      eventTimestamp: '2026-08-12T14:45:00.000Z',
    });
  });

  it('converts tracked plugin events into debug recent events', () => {
    expect(
      createDebugSnapshotPluginErrorEvent(
        {
          type: 'error',
          source: 'tile-route.labels',
          message: 'Dock label cache failed.',
          timestamp: '2026-08-12T15:00:00.000Z',
          severity: 'error',
          details: {
            code: 'dock-route-label',
          },
        },
        9876
      )
    ).toEqual({
      nowMs: 9876,
      type: 'plugin-error',
      plugin: 'tile-route.labels',
      source: 'tile-route.labels',
      summary: 'Dock label cache failed.',
      details: {
        code: 'dock-route-label',
      },
      severity: 'error',
      eventTimestamp: '2026-08-12T15:00:00.000Z',
    });
  });
});

function createPluginEvent(source: string, message: string): PluginEvent {
  return Object.freeze({
    type: 'error',
    source,
    message,
    timestamp: '2026-08-12T12:00:00.000Z',
    severity: 'error',
    details: {
      code: 'shared-material-miss',
    },
  });
}
