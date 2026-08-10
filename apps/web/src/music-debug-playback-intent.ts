import type { MusicDebugSnapshot } from './music-debug.ts';
import { resolveMusicDebugPlaybackResumeOffset } from './music-debug-playback-offset.ts';

export const MUSIC_DEBUG_STOP_BUTTON_LABEL = 'Stop Song';
export const MUSIC_DEBUG_FULL_SONG_BUTTON_LABEL = 'Play Full Song';
export const MUSIC_DEBUG_LOOPED_SONG_BUTTON_LABEL = 'Play Song + Loop';
export const MUSIC_DEBUG_LOOP_TOGGLE_LABEL =
  'Loop middle section after full-song preview';

export type MusicDebugPlaybackIntent = {
  loop: boolean;
  startOffsetMs: number;
  idleButtonLabel: string;
  activeButtonLabel: string;
  loopToggleLabel: string;
};

export function resolveMusicDebugPlaybackIntent(options: {
  snapshot: MusicDebugSnapshot;
  previewOffsetMs: number;
  loopEnabled: boolean;
}): MusicDebugPlaybackIntent {
  return {
    loop: options.loopEnabled,
    startOffsetMs: resolveMusicDebugPlaybackResumeOffset({
      snapshot: options.snapshot,
      previewOffsetMs: options.previewOffsetMs,
    }),
    idleButtonLabel: options.loopEnabled
      ? MUSIC_DEBUG_LOOPED_SONG_BUTTON_LABEL
      : MUSIC_DEBUG_FULL_SONG_BUTTON_LABEL,
    activeButtonLabel: MUSIC_DEBUG_STOP_BUTTON_LABEL,
    loopToggleLabel: MUSIC_DEBUG_LOOP_TOGGLE_LABEL,
  };
}
