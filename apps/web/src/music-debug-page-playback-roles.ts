import {
  normalizeMusicDebugPlaybackVariant,
  resolveMusicDebugPlaybackRoles,
  type MusicDebugPlaybackVariant,
} from './music-debug-playback-variant.ts';
import {
  normalizeMusicDebugDisplayRoles,
  type MusicDebugDisplayRole,
} from './music-debug-role-display.ts';
import type { MusicDebugPlaybackRole } from './music-debug-playback.ts';

export function resolveMusicDebugAudiblePlaybackRoles(options: {
  variant: MusicDebugPlaybackVariant | string | null | undefined;
  hiddenRoles?: readonly MusicDebugDisplayRole[] | null;
}): readonly MusicDebugPlaybackRole[] {
  const hiddenRoles = new Set(
    normalizeMusicDebugDisplayRoles(options.hiddenRoles ?? null)
  );
  return resolveMusicDebugPlaybackRoles(
    normalizeMusicDebugPlaybackVariant(options.variant)
  ).filter((role) => !hiddenRoles.has(role));
}
