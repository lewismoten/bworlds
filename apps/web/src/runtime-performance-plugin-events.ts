import {
  PLUGIN_EVENT_TYPES,
  type PluginEvent,
  type PluginEventChannel,
  type PluginEventDetails,
} from '@bworlds/plugin-event-channel';
import type { DebugSnapshotRecentEvent } from './debug-snapshot.ts';

export type RuntimePerformanceSnapshotPluginEvent = {
  type: string;
  source: string;
  message: string;
  timestamp: string | null;
  severity: string | null;
  details?: PluginEventDetails;
};

export type RuntimePerformanceSnapshotPluginEventSummary = {
  recent: readonly RuntimePerformanceSnapshotPluginEvent[];
  countsByType: Readonly<Record<string, number>>;
  countsBySource: Readonly<Record<string, number>>;
};

const DEFAULT_RUNTIME_PERFORMANCE_PLUGIN_EVENT_HISTORY_LIMIT = 24;

export function createEmptyRuntimePerformanceSnapshotPluginEventSummary(): RuntimePerformanceSnapshotPluginEventSummary {
  return {
    recent: [],
    countsByType: Object.freeze({}),
    countsBySource: Object.freeze({}),
  };
}

export function createRuntimePerformancePluginEventTracker(
  options: {
    maxHistory?: number;
  } = {}
) {
  const maxHistory = normalizePositiveInteger(
    options.maxHistory,
    DEFAULT_RUNTIME_PERFORMANCE_PLUGIN_EVENT_HISTORY_LIMIT
  );
  const history: RuntimePerformanceSnapshotPluginEvent[] = [];

  return {
    record(event: PluginEvent): RuntimePerformanceSnapshotPluginEvent {
      const entry: RuntimePerformanceSnapshotPluginEvent = {
        type: event.type,
        source: event.source,
        message: event.message,
        timestamp: event.timestamp ?? null,
        severity: event.severity ?? null,
        ...(event.details !== undefined ? { details: event.details } : {}),
      };
      history.unshift(entry);
      if (history.length > maxHistory) {
        history.length = maxHistory;
      }
      return entry;
    },
    getSnapshot(): RuntimePerformanceSnapshotPluginEventSummary {
      return {
        recent: history.slice(),
        countsByType: Object.freeze(
          Object.fromEntries(summarizeCounts(history, 'type'))
        ),
        countsBySource: Object.freeze(
          Object.fromEntries(summarizeCounts(history, 'source'))
        ),
      };
    },
    clear(): void {
      history.length = 0;
    },
  };
}

export function installRuntimePerformancePluginErrorTracking(
  channel: Pick<PluginEventChannel, 'subscribeByType'>,
  tracker: Pick<
    ReturnType<typeof createRuntimePerformancePluginEventTracker>,
    'record'
  >,
  options: {
    nowMs: () => number;
    onDebugEvent?: (event: DebugSnapshotRecentEvent) => void;
  }
): () => void {
  return channel.subscribeByType(PLUGIN_EVENT_TYPES.ERROR, (event) => {
    const recorded = tracker.record(event);
    options.onDebugEvent?.(
      createDebugSnapshotPluginErrorEvent(recorded, options.nowMs())
    );
  });
}

export function createDebugSnapshotPluginErrorEvent(
  event: RuntimePerformanceSnapshotPluginEvent,
  nowMs: number
): DebugSnapshotRecentEvent {
  return {
    nowMs,
    type: 'plugin-error',
    plugin: event.source,
    source: event.source,
    summary: event.message,
    details: event.details,
    severity: event.severity ?? undefined,
    eventTimestamp: event.timestamp ?? undefined,
  };
}

function summarizeCounts(
  history: readonly RuntimePerformanceSnapshotPluginEvent[],
  key: 'type' | 'source'
): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const entry of history) {
    counts.set(entry[key], (counts.get(entry[key]) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) =>
    right[1] === left[1] ? left[0].localeCompare(right[0]) : right[1] - left[1]
  );
}

function normalizePositiveInteger(
  value: number | undefined,
  fallback: number
): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}
