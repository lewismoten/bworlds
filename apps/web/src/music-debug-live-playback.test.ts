import { describe, expect, it } from 'vitest';
import { resolveMusicDebugLivePlaybackIntent } from './music-debug-live-playback.ts';
import { createMusicDebugSnapshot } from './music-debug.ts';

describe('music debug live playback', () => {
  it('keeps the current playback offset when inputs rebuild the song', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
    });
    const nextSnapshot = createMusicDebugSnapshot({
      tileKind: 'shore',
      contextType: 'overworld',
      clusterX: 8,
      clusterY: -4,
    });

    const intent = resolveMusicDebugLivePlaybackIntent({
      snapshot: nextSnapshot,
      playback: {
        snapshot,
        region: null,
        startedAtMs: 10_000,
      },
      previewOffsetMs: 0,
      loopEnabled: true,
      nowMs: 22_345,
    });

    expect(intent.loop).toBe(true);
    expect(intent.startOffsetMs).toBe(12_345);
  });

  it('falls back to the preview offset when playback is inactive', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
    });

    const intent = resolveMusicDebugLivePlaybackIntent({
      snapshot,
      playback: null,
      previewOffsetMs: snapshot.durationMs + 5_000,
      loopEnabled: false,
      nowMs: 0,
    });

    expect(intent.loop).toBe(false);
    expect(intent.startOffsetMs).toBe(0);
  });
});
