import { describe, expect, it, vi } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  createMusicDebugPagePersistenceController,
  loadMusicDebugPagePersistenceState,
  normalizeMusicDebugPagePersistenceState,
  resolveMusicDebugPlaybackResumeOffset,
} from './music-debug-page-persistence.ts';

const DEFAULT_SNAPSHOT = createMusicDebugSnapshot();

describe('music debug page persistence', () => {
  it('normalizes partial persisted page state conservatively', () => {
    expect(
      normalizeMusicDebugPagePersistenceState({
        loopEnabled: true,
        playbackVariant: 'melody-only',
        dryPlaybackEnabled: true,
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
        playbackVariant: 'melody-only',
        dryPlaybackEnabled: true,
        percussionPlaybackState: {
          soloVoiceIds: [],
          mutedVoiceIds: [],
        },
        hiddenRoles: [],
        hiddenTimelineOverlays: [],
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
    const hot = { data: {} as Record<string, unknown> };
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
      hmr: hot,
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
      playbackVariant: 'harmony-and-bass',
      dryPlaybackEnabled: true,
      percussionPlaybackState: {
        soloVoiceIds: ['kick-35'],
        mutedVoiceIds: ['snare-38'],
      },
      hiddenRoles: ['harmony', 'percussion'],
      hiddenTimelineOverlays: ['motif', 'climax'],
      trackPlaybackState: {
        soloRoles: ['lead'],
        mutedRoles: ['bass'],
      },
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
        'bworlds:music-debug-page',
        hot
      )
    ).toEqual(
      expect.objectContaining({
        loopEnabled: true,
        playbackVariant: 'harmony-and-bass',
        dryPlaybackEnabled: true,
        percussionPlaybackState: {
          soloVoiceIds: ['kick-35'],
          mutedVoiceIds: ['snare-38'],
        },
        hiddenRoles: ['harmony', 'percussion'],
        hiddenTimelineOverlays: ['motif', 'climax'],
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

  it('prefers hot state over stale storage during vite updates', () => {
    const storage = {
      getItem() {
        return JSON.stringify({
          loopEnabled: false,
          playbackVariant: 'full',
          dryPlaybackEnabled: false,
          percussionPlaybackState: {
            soloVoiceIds: [],
            mutedVoiceIds: [],
          },
          hiddenRoles: [],
          hiddenTimelineOverlays: [],
          previewOffsetMs: 100,
          shouldResume: false,
          scrollY: 10,
          options: {
            tileKind: 'plains',
            contextType: 'overworld',
          },
        });
      },
      setItem() {},
    };
    const hot = {
      data: {
        'bworlds:music-debug-page': {
          loopEnabled: true,
          playbackVariant: 'melody-only',
          dryPlaybackEnabled: true,
          percussionPlaybackState: {
            soloVoiceIds: ['kick-35'],
            mutedVoiceIds: [],
          },
          hiddenRoles: ['bass'],
          hiddenTimelineOverlays: ['cadence'],
          previewOffsetMs: 4_200,
          shouldResume: true,
          scrollY: 310,
          options: {
            tileKind: 'forest',
            contextType: 'overworld',
            encounterMode: 'ambient',
            weatherKind: 'clear',
            weatherIntensity: 0,
            combatIntensity: 0,
            dayProgress: 0.5,
            yearProgress: 0.25,
            clusterX: 3,
            clusterY: 4,
          },
        },
      } as Record<string, unknown>,
    };

    expect(
      loadMusicDebugPagePersistenceState(
        storage,
        'bworlds:music-debug-page',
        hot
      )
    ).toEqual(
      expect.objectContaining({
        loopEnabled: true,
        playbackVariant: 'melody-only',
        dryPlaybackEnabled: true,
        percussionPlaybackState: {
          soloVoiceIds: ['kick-35'],
          mutedVoiceIds: [],
        },
        hiddenRoles: ['bass'],
        hiddenTimelineOverlays: ['cadence'],
        previewOffsetMs: 4_200,
        shouldResume: true,
        scrollY: 310,
        options: expect.objectContaining({
          tileKind: 'forest',
          clusterX: 3,
          clusterY: 4,
        }),
      })
    );
  });

  it('restarts from the beginning when the persisted playhead is at song end', () => {
    expect(
      resolveMusicDebugPlaybackResumeOffset({
        snapshot: DEFAULT_SNAPSHOT,
        previewOffsetMs: DEFAULT_SNAPSHOT.durationMs,
      })
    ).toBe(0);
    expect(
      resolveMusicDebugPlaybackResumeOffset({
        snapshot: DEFAULT_SNAPSHOT,
        previewOffsetMs: DEFAULT_SNAPSHOT.durationMs - 1_000,
      })
    ).toBe(DEFAULT_SNAPSHOT.durationMs - 1_000);
  });
});
