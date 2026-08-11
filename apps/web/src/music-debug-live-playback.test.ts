import { describe, expect, it } from 'vitest';
import { resolveMusicDebugLivePlaybackIntent } from './music-debug-live-playback.ts';
import type { MusicDebugSnapshot } from './music-debug.ts';

describe('music debug live playback', () => {
  it('keeps the current playback offset when inputs rebuild the song', () => {
    const snapshot = createSnapshot(120_000);
    const nextSnapshot = createSnapshot(180_000);

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
    const snapshot = createSnapshot(150_000);

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

function createSnapshot(durationMs: number): MusicDebugSnapshot {
  return { durationMs } as MusicDebugSnapshot;
}
