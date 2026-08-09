export function collectRecentWindowedEvents<T extends { nowMs: number }>(
  events: readonly T[],
  nowMs: number,
  {
    windowMs,
    maxEntries,
  }: {
    windowMs: number;
    maxEntries: number;
  }
): T[] {
  const minimumTime = nowMs - windowMs;
  const recentEvents: T[] = [];

  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index] as T;
    if (event.nowMs < minimumTime) {
      break;
    }
    recentEvents.push(event);
    if (recentEvents.length >= maxEntries) {
      break;
    }
  }

  recentEvents.reverse();
  return recentEvents;
}
