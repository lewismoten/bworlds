import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  clampMusicDebugPreviewOffset,
  resolveMusicDebugDisplayedOffsetMs,
  resolveMusicDebugPlaybackOffsetMs,
  resolveMusicDebugSectionJumpTargets,
} from './music-debug-transport.ts';

const DEFAULT_SNAPSHOT = createMusicDebugSnapshot();
const FOREST_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'forest',
  contextType: 'overworld',
});
const DEFAULT_SECTION_JUMP_TARGETS =
  resolveMusicDebugSectionJumpTargets(DEFAULT_SNAPSHOT);

describe('music debug transport', () => {
  it('clamps preview offsets inside the song duration', () => {
    expect(clampMusicDebugPreviewOffset(DEFAULT_SNAPSHOT, -80)).toBe(0);
    expect(
      clampMusicDebugPreviewOffset(
        DEFAULT_SNAPSHOT,
        DEFAULT_SNAPSHOT.durationMs + 500
      )
    ).toBe(DEFAULT_SNAPSHOT.durationMs);
  });

  it('resolves playback offsets from the active playback cycle timing', () => {
    expect(
      resolveMusicDebugPlaybackOffsetMs(
        {
          snapshot: FOREST_SNAPSHOT,
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
    expect(
      resolveMusicDebugDisplayedOffsetMs({
        playback: null,
        snapshot: DEFAULT_SNAPSHOT,
        previewOffsetMs: 4_321,
        nowMs: 10_000,
      })
    ).toBe(4_321);
  });

  it('builds jump targets for the beginning and each section', () => {
    expect(DEFAULT_SECTION_JUMP_TARGETS[0]).toEqual({
      id: 'start',
      label: 'Start',
      startOffsetMs: 0,
    });
    expect(DEFAULT_SECTION_JUMP_TARGETS).toHaveLength(
      DEFAULT_SNAPSHOT.song.sections.length + 1
    );
    expect(DEFAULT_SECTION_JUMP_TARGETS[1]?.label).toBe(
      DEFAULT_SNAPSHOT.song.sections[0]?.label
    );
  });
});
