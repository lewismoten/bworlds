import {
  normalizeMusicDebugPlaybackVariant,
  resolveMusicDebugPlaybackRoles,
  type MusicDebugPlaybackVariant,
} from './music-debug-playback-variant.ts';
import type { MusicDebugPlaybackRole } from './music-debug-playback.ts';
import {
  normalizeMusicDebugTrackPlaybackState,
  resolveMusicDebugAudibleTrackRoles,
  type MusicDebugTrackPlaybackState,
} from './music-debug-track-playback.ts';

export function resolveMusicDebugAudiblePlaybackRoles(options: {
  variant: MusicDebugPlaybackVariant | string | null | undefined;
  trackPlaybackState?: Partial<MusicDebugTrackPlaybackState> | null;
}): readonly MusicDebugPlaybackRole[] {
  const variantRoles = resolveMusicDebugPlaybackRoles(
    normalizeMusicDebugPlaybackVariant(options.variant)
  );
  return resolveMusicDebugAudibleTrackRoles(
    normalizeMusicDebugTrackPlaybackState(options.trackPlaybackState),
    variantRoles
  );
}
