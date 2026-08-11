import { describe, expect, it, vi } from 'vitest';
import {
  createMusicDebugSnapshot,
  type MusicDebugSnapshot,
} from './music-debug.ts';
import { createMusicDebugPageState } from './music-debug-page-state.ts';

const DEFAULT_SNAPSHOT = createMusicDebugSnapshot();
const OFFSET_SNAPSHOTS = [
  createMusicDebugSnapshot({ clusterX: 0 }),
  createMusicDebugSnapshot({ clusterX: 1 }),
] as const;

describe('music debug page state', () => {
  it('debounces repeated refresh requests into one snapshot rebuild', () => {
    vi.useFakeTimers();
    const rendered: MusicDebugSnapshot[] = [];
    const createSnapshot = vi.fn(() => DEFAULT_SNAPSHOT);
    const state = createMusicDebugPageState({
      createSnapshot,
      onSnapshot: (snapshot) => {
        rendered.push(snapshot);
      },
      debounceDelayMs: 80,
    });

    state.scheduleRefresh();
    state.scheduleRefresh();
    state.scheduleRefresh();

    expect(createSnapshot).not.toHaveBeenCalled();
    expect(state.pendingRefresh()).toBe(true);

    vi.advanceTimersByTime(80);

    expect(createSnapshot).toHaveBeenCalledTimes(1);
    expect(rendered).toHaveLength(1);
    expect(state.pendingRefresh()).toBe(false);
  });

  it('reuses the current snapshot until another refresh is requested', () => {
    const rendered: MusicDebugSnapshot[] = [];
    const createSnapshot = vi.fn(() => DEFAULT_SNAPSHOT);
    const state = createMusicDebugPageState({
      createSnapshot,
      onSnapshot: (snapshot) => {
        rendered.push(snapshot);
      },
    });

    const first = state.refreshNow();
    const second = state.refreshNow();

    expect(first).toBe(second);
    expect(state.currentSnapshot()).toBe(first);
    expect(createSnapshot).toHaveBeenCalledTimes(1);
    expect(rendered).toEqual([first]);
  });

  it('flushes pending work immediately when playback needs the latest snapshot', () => {
    vi.useFakeTimers();
    const rendered: MusicDebugSnapshot[] = [];
    const createSnapshot = vi.fn(
      () => OFFSET_SNAPSHOTS[rendered.length] ?? OFFSET_SNAPSHOTS.at(-1)!
    );
    const state = createMusicDebugPageState({
      createSnapshot,
      onSnapshot: (snapshot) => {
        rendered.push(snapshot);
      },
      debounceDelayMs: 120,
    });

    state.scheduleRefresh();

    const refreshed = state.refreshNow();

    expect(createSnapshot).toHaveBeenCalledTimes(1);
    expect(refreshed).toBe(rendered[0]);
    expect(state.pendingRefresh()).toBe(false);
  });
});
