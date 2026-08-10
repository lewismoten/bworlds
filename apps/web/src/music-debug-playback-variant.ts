import {
  MUSIC_DEBUG_MIDI_EXPORT_VARIANTS,
  normalizeMusicDebugMidiExportVariant,
  resolveMusicDebugMidiExportRoles,
  type MusicDebugMidiExportVariant,
} from './music-debug-midi-export-variant.ts';
import type { MusicDebugSnapshot } from './music-debug.ts';

export const MUSIC_DEBUG_PLAYBACK_VARIANTS = MUSIC_DEBUG_MIDI_EXPORT_VARIANTS;

export type MusicDebugPlaybackVariant = MusicDebugMidiExportVariant;

export function formatMusicDebugPlaybackVariantLabel(
  variant: MusicDebugPlaybackVariant
): string {
  switch (variant) {
    case 'melody-only':
      return 'Melody Only';
    case 'harmony-and-bass':
      return 'Harmony + Bass';
    case 'full':
    default:
      return 'Full Song';
  }
}

export function normalizeMusicDebugPlaybackVariant(
  value: string | null | undefined
): MusicDebugPlaybackVariant {
  return normalizeMusicDebugMidiExportVariant(value);
}

export function resolveMusicDebugPlaybackRoles(
  variant: MusicDebugPlaybackVariant
): ReadonlyArray<MusicDebugSnapshot['notes'][number]['role']> {
  return resolveMusicDebugMidiExportRoles(variant);
}
