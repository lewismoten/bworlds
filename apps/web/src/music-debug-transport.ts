import {
  resolveMusicDebugPlaybackDurationMs,
  type MusicDebugPlaybackRegion,
  type MusicDebugSnapshot,
} from './music-debug.ts';

export type MusicDebugPlaybackVisualState = {
  snapshot: MusicDebugSnapshot;
  region: MusicDebugPlaybackRegion | null;
  startedAtMs: number;
};

export function clampMusicDebugPreviewOffset(
  snapshot: MusicDebugSnapshot,
  offsetMs: number
): number {
  return Math.min(snapshot.durationMs, Math.max(0, Math.round(offsetMs)));
}

export function resolveMusicDebugDisplayedOffsetMs(options: {
  playback: MusicDebugPlaybackVisualState | null;
  snapshot: MusicDebugSnapshot | null;
  previewOffsetMs: number;
  nowMs: number;
}): number {
  if (!options.playback) {
    if (!options.snapshot) {
      return Math.max(0, Math.round(options.previewOffsetMs));
    }
    return clampMusicDebugPreviewOffset(
      options.snapshot,
      options.previewOffsetMs
    );
  }
  return resolveMusicDebugPlaybackOffsetMs(options.playback, options.nowMs);
}

export function resolveMusicDebugPlaybackOffsetMs(
  playback: MusicDebugPlaybackVisualState,
  nowMs: number
): number {
  const baseOffsetMs = playback.region?.startOffsetMs ?? 0;
  const durationMs = resolveMusicDebugPlaybackDurationMs(
    playback.snapshot,
    playback.region
  );
  const elapsedMs = Math.max(0, nowMs - playback.startedAtMs);
  return clampMusicDebugPreviewOffset(
    playback.snapshot,
    baseOffsetMs + Math.min(durationMs, elapsedMs)
  );
}

export function resolveMusicDebugSectionJumpTargets(
  snapshot: MusicDebugSnapshot
): Array<{
  id: string;
  label: string;
  startOffsetMs: number;
}> {
  return [
    {
      id: 'start',
      label: 'Start',
      startOffsetMs: 0,
    },
    ...snapshot.song.sections.map((section, index) => ({
      id: `${section.id}-${index}`,
      label: section.label,
      startOffsetMs: section.startOffsetMs,
    })),
  ];
}
