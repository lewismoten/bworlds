import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  clampMusicDebugPreviewOffset,
  resolveMusicDebugDisplayedOffsetMs,
  resolveMusicDebugPlaybackOffsetMs,
  resolveMusicDebugSectionJumpTargets,
} from './music-debug-transport.ts';

describe('music debug transport', () => {
  it('clamps preview offsets inside the song duration', () => {
    const snapshot = createMusicDebugSnapshot();

    expect(clampMusicDebugPreviewOffset(snapshot, -80)).toBe(0);
    expect(
      clampMusicDebugPreviewOffset(snapshot, snapshot.durationMs + 500)
    ).toBe(snapshot.durationMs);
  });

  it('resolves playback offsets from the active playback cycle timing', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
    });

    expect(
      resolveMusicDebugPlaybackOffsetMs(
        {
          snapshot,
          region: {
            startOffsetMs: 12_000,
            endOffsetMs: 16_000,
          },
          startedAtMs: 1_000,
        },
        2_600
      )
    ).toBe(13_600);
  });

  it('falls back to the preview offset when playback is inactive', () => {
    const snapshot = createMusicDebugSnapshot();

    expect(
      resolveMusicDebugDisplayedOffsetMs({
        playback: null,
        snapshot,
        previewOffsetMs: 4_321,
        nowMs: 10_000,
      })
    ).toBe(4_321);
  });

  it('builds jump targets for the beginning and each section', () => {
    const snapshot = createMusicDebugSnapshot();
    const targets = resolveMusicDebugSectionJumpTargets(snapshot);

    expect(targets[0]).toEqual({
      id: 'start',
      label: 'Start',
      startOffsetMs: 0,
    });
    expect(targets).toHaveLength(snapshot.song.sections.length + 1);
    expect(targets[1]?.label).toBe(snapshot.song.sections[0]?.label);
  });
});
