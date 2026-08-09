import { createDebouncedPersistence } from './debounced-persistence.ts';
import type { MusicDebugSnapshot } from './music-debug.ts';

export type MusicDebugPageState = {
  currentSnapshot(): MusicDebugSnapshot | null;
  refreshNow(): MusicDebugSnapshot;
  scheduleRefresh(): void;
  pendingRefresh(): boolean;
};

type MusicDebugPageStateOptions = {
  createSnapshot: () => MusicDebugSnapshot;
  onSnapshot: (snapshot: MusicDebugSnapshot) => void;
  debounceDelayMs?: number;
};

export function createMusicDebugPageState(
  options: MusicDebugPageStateOptions
): MusicDebugPageState {
  let snapshot: MusicDebugSnapshot | null = null;
  let dirty = true;

  function refreshSnapshot(): MusicDebugSnapshot {
    snapshot = options.createSnapshot();
    dirty = false;
    options.onSnapshot(snapshot);
    return snapshot;
  }

  const debouncedRefresh = createDebouncedPersistence(() => {
    refreshSnapshot();
  }, options.debounceDelayMs ?? 120);

  return {
    currentSnapshot() {
      return snapshot;
    },
    refreshNow() {
      if (!dirty && snapshot) {
        return snapshot;
      }
      if (debouncedRefresh.pending()) {
        debouncedRefresh.flush();
        if (snapshot) {
          return snapshot;
        }
      }
      return refreshSnapshot();
    },
    scheduleRefresh() {
      dirty = true;
      debouncedRefresh.schedule();
    },
    pendingRefresh() {
      return debouncedRefresh.pending();
    },
  };
}
