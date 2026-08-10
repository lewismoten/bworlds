import { resolveMusicDebugPlaybackIntent } from './music-debug-playback-intent.ts';
import {
  resolveMusicDebugPlaybackOffsetMs,
  type MusicDebugPlaybackVisualState,
} from './music-debug-transport.ts';
import type { MusicDebugSnapshot } from './music-debug.ts';

export function resolveMusicDebugLivePlaybackIntent(options: {
  snapshot: MusicDebugSnapshot;
  playback: MusicDebugPlaybackVisualState | null;
  previewOffsetMs: number;
  loopEnabled: boolean;
  nowMs: number;
}): ReturnType<typeof resolveMusicDebugPlaybackIntent> {
  const playbackOffsetMs = options.playback
    ? resolveMusicDebugPlaybackOffsetMs(options.playback, options.nowMs)
    : options.previewOffsetMs;

  return resolveMusicDebugPlaybackIntent({
    snapshot: options.snapshot,
    previewOffsetMs: playbackOffsetMs,
    loopEnabled: options.loopEnabled,
  });
}
