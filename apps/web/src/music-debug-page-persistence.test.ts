import { describe, expect, it, vi } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  createMusicDebugPagePersistenceController,
  loadMusicDebugPagePersistenceState,
  normalizeMusicDebugPagePersistenceState,
  resolveMusicDebugPlaybackResumeOffset,
} from './music-debug-page-persistence.ts';

describe('music debug page persistence', () => {
  it('normalizes partial persisted page state conservatively', () => {
    expect(
      normalizeMusicDebugPagePersistenceState({
        loopEnabled: true,
        previewOffsetMs: -50,
        shouldResume: true,
        scrollY: -18,
        options: {
          tileKind: 'forest',
          clusterX: 8,
        },
      })
    ).toEqual(
      expect.objectContaining({
        loopEnabled: true,
        previewOffsetMs: 0,
        shouldResume: true,
        scrollY: 0,
        options: expect.objectContaining({
          tileKind: 'forest',
          clusterX: 8,
          contextType: 'overworld',
        }),
      })
    );
  });

  it('round-trips persisted page state through the storage controller', () => {
    vi.useFakeTimers();
    const saved = new Map<string, string>();
    const controller = createMusicDebugPagePersistenceController({
      storage: {
        getItem(key) {
          return saved.get(key) ?? null;
        },
        setItem(key, value) {
          saved.set(key, value);
        },
      },
      debounceDelayMs: 60,
    });

    controller.save({
      options: {
        tileKind: 'forest',
        contextType: 'overworld',
        encounterMode: 'ambient',
        weatherKind: 'clear',
        weatherIntensity: 0,
        combatIntensity: 0,
        dayProgress: 0.5,
        yearProgress: 0.25,
        clusterX: 12,
        clusterY: -7,
      },
      loopEnabled: true,
      previewOffsetMs: 9_000,
      shouldResume: true,
      scrollY: 420,
    });

    vi.advanceTimersByTime(60);

    expect(
      loadMusicDebugPagePersistenceState(
        {
          getItem(key) {
            return saved.get(key) ?? null;
          },
          setItem() {},
        },
        'bworlds:music-debug-page'
      )
    ).toEqual(
      expect.objectContaining({
        loopEnabled: true,
        previewOffsetMs: 9_000,
        shouldResume: true,
        scrollY: 420,
        options: expect.objectContaining({
          clusterX: 12,
          clusterY: -7,
        }),
      })
    );
  });

  it('restarts from the beginning when the persisted playhead is at song end', () => {
    const snapshot = createMusicDebugSnapshot();

    expect(
      resolveMusicDebugPlaybackResumeOffset({
        snapshot,
        previewOffsetMs: snapshot.durationMs,
      })
    ).toBe(0);
    expect(
      resolveMusicDebugPlaybackResumeOffset({
        snapshot,
        previewOffsetMs: snapshot.durationMs - 1_000,
      })
    ).toBe(snapshot.durationMs - 1_000);
  });
});
