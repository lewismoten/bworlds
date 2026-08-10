import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  MUSIC_DEBUG_FULL_SONG_BUTTON_LABEL,
  MUSIC_DEBUG_LOOP_TOGGLE_LABEL,
  MUSIC_DEBUG_LOOPED_SONG_BUTTON_LABEL,
  MUSIC_DEBUG_STOP_BUTTON_LABEL,
  resolveMusicDebugPlaybackIntent,
} from './music-debug-playback-intent.ts';

describe('music debug playback intent', () => {
  it('defaults to a whole-song preview when loop mode is off', () => {
    const snapshot = createMusicDebugSnapshot();

    expect(
      resolveMusicDebugPlaybackIntent({
        snapshot,
        previewOffsetMs: 0,
        loopEnabled: false,
      })
    ).toEqual({
      loop: false,
      startOffsetMs: 0,
      idleButtonLabel: MUSIC_DEBUG_FULL_SONG_BUTTON_LABEL,
      activeButtonLabel: MUSIC_DEBUG_STOP_BUTTON_LABEL,
      loopToggleLabel: MUSIC_DEBUG_LOOP_TOGGLE_LABEL,
    });
  });

  it('keeps the full-song rewind behavior when the playhead is already at the end', () => {
    const snapshot = createMusicDebugSnapshot();

    expect(
      resolveMusicDebugPlaybackIntent({
        snapshot,
        previewOffsetMs: snapshot.durationMs,
        loopEnabled: true,
      })
    ).toEqual({
      loop: true,
      startOffsetMs: 0,
      idleButtonLabel: MUSIC_DEBUG_LOOPED_SONG_BUTTON_LABEL,
      activeButtonLabel: MUSIC_DEBUG_STOP_BUTTON_LABEL,
      loopToggleLabel: MUSIC_DEBUG_LOOP_TOGGLE_LABEL,
    });
  });
});
