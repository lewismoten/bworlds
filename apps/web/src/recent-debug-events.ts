import type { DebugSnapshotRecentEvent } from './debug-snapshot.ts';

export function collectMergedRecentDebugEvents(
  localEvents: readonly DebugSnapshotRecentEvent[],
  rendererEvents: readonly DebugSnapshotRecentEvent[],
  nowMs: number,
  {
    windowMs,
    maxEntries,
  }: {
    windowMs: number;
    maxEntries: number;
  }
): DebugSnapshotRecentEvent[] {
  const minimumTime = nowMs - windowMs;
  const merged: DebugSnapshotRecentEvent[] = [];
  let localIndex = localEvents.length - 1;
  let rendererIndex = rendererEvents.length - 1;

  while (
    merged.length < maxEntries &&
    (localIndex >= 0 || rendererIndex >= 0)
  ) {
    const localEvent = localIndex >= 0 ? localEvents[localIndex] : null;
    const rendererEvent =
      rendererIndex >= 0 ? rendererEvents[rendererIndex] : null;
    const localNowMs = localEvent?.nowMs ?? Number.NEGATIVE_INFINITY;
    const rendererNowMs = rendererEvent?.nowMs ?? Number.NEGATIVE_INFINITY;

    if (localNowMs < minimumTime && rendererNowMs < minimumTime) {
      break;
    }

    if (localNowMs >= rendererNowMs) {
      if (localEvent && localEvent.nowMs >= minimumTime) {
        merged.push(localEvent);
      }
      localIndex -= 1;
      continue;
    }

    if (rendererEvent && rendererEvent.nowMs >= minimumTime) {
      merged.push(rendererEvent);
    }
    rendererIndex -= 1;
  }

  merged.reverse();
  return merged;
}

export function getMostRecentDebugEventByType(
  events: readonly DebugSnapshotRecentEvent[],
  type: DebugSnapshotRecentEvent['type']
): DebugSnapshotRecentEvent | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.type === type) {
      return event;
    }
  }
  return null;
}

export function formatRecentDebugEventReason(
  event: Pick<
    DebugSnapshotRecentEvent,
    'tileKey' | 'plugin' | 'source' | 'summary'
  >
): string | null {
  const summary = event.summary?.trim() || '';
  const tileKey = event.tileKey?.trim() || '';
  const plugin = event.plugin?.trim() || event.source?.trim() || '';
  const source =
    tileKey && plugin ? `${tileKey} / ${plugin}` : tileKey || plugin || '';
  if (!summary) {
    return source || null;
  }
  return source ? `${source}: ${summary}` : summary;
}
