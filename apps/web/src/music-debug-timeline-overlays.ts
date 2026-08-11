export const MUSIC_DEBUG_TIMELINE_OVERLAY_KINDS = [
  'note-warnings',
  'cadence',
  'harmony-drift',
  'bass-drift',
  'motif',
  'climax',
] as const;

export type MusicDebugTimelineOverlayKind =
  (typeof MUSIC_DEBUG_TIMELINE_OVERLAY_KINDS)[number];

export function normalizeMusicDebugTimelineHiddenOverlayKinds(
  value: readonly string[] | null | undefined
): MusicDebugTimelineOverlayKind[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const visible = new Set<MusicDebugTimelineOverlayKind>();
  for (const entry of value) {
    if (
      typeof entry === 'string' &&
      MUSIC_DEBUG_TIMELINE_OVERLAY_KINDS.includes(
        entry as MusicDebugTimelineOverlayKind
      )
    ) {
      visible.add(entry as MusicDebugTimelineOverlayKind);
    }
  }
  return [...visible];
}

export function isMusicDebugTimelineOverlayVisible(
  hiddenKinds: readonly MusicDebugTimelineOverlayKind[] | null | undefined,
  kind: MusicDebugTimelineOverlayKind
): boolean {
  return !(hiddenKinds ?? []).includes(kind);
}

export function toggleMusicDebugTimelineHiddenOverlayKind(
  hiddenKinds: readonly MusicDebugTimelineOverlayKind[] | null | undefined,
  kind: MusicDebugTimelineOverlayKind
): MusicDebugTimelineOverlayKind[] {
  const normalized = normalizeMusicDebugTimelineHiddenOverlayKinds(hiddenKinds);
  return normalized.includes(kind)
    ? normalized.filter((entry) => entry !== kind)
    : [...normalized, kind];
}
