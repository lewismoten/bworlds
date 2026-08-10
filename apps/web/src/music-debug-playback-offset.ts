export type MusicDebugPlaybackSnapshotLike = {
  durationMs: number;
};

export function clampMusicDebugPreviewOffset(
  snapshot: MusicDebugPlaybackSnapshotLike,
  offsetMs: number
): number {
  return Math.min(snapshot.durationMs, Math.max(0, Math.round(offsetMs)));
}

export function resolveMusicDebugPlaybackResumeOffset(options: {
  snapshot: MusicDebugPlaybackSnapshotLike;
  previewOffsetMs: number;
}): number {
  const clampedOffsetMs = clampMusicDebugPreviewOffset(
    options.snapshot,
    options.previewOffsetMs
  );
  if (clampedOffsetMs >= options.snapshot.durationMs) {
    return 0;
  }
  return clampedOffsetMs;
}
