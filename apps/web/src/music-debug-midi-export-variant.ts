import type { MusicDebugSnapshot } from './music-debug.ts';

export const MUSIC_DEBUG_MIDI_EXPORT_VARIANTS = [
  'full',
  'melody-only',
  'harmony-and-bass',
] as const;

export type MusicDebugMidiExportVariant =
  (typeof MUSIC_DEBUG_MIDI_EXPORT_VARIANTS)[number];

export function resolveMusicDebugMidiExportRoles(
  variant: MusicDebugMidiExportVariant
): ReadonlyArray<MusicDebugSnapshot['notes'][number]['role']> {
  switch (variant) {
    case 'melody-only':
      return ['lead'];
    case 'harmony-and-bass':
      return ['bass', 'harmony'];
    case 'full':
    default:
      return ['bass', 'harmony', 'lead', 'percussion'];
  }
}

export function formatMusicDebugMidiExportVariantLabel(
  variant: MusicDebugMidiExportVariant
): string {
  switch (variant) {
    case 'melody-only':
      return 'Melody Only MIDI';
    case 'harmony-and-bass':
      return 'Harmony + Bass MIDI';
    case 'full':
    default:
      return 'Full Song MIDI';
  }
}

export function formatMusicDebugMidiExportVariantSuffix(
  variant: MusicDebugMidiExportVariant
): string {
  switch (variant) {
    case 'melody-only':
      return 'melody';
    case 'harmony-and-bass':
      return 'harmony-bass';
    case 'full':
    default:
      return '';
  }
}

export function normalizeMusicDebugMidiExportVariant(
  value: string | null | undefined
): MusicDebugMidiExportVariant {
  return MUSIC_DEBUG_MIDI_EXPORT_VARIANTS.includes(
    value as MusicDebugMidiExportVariant
  )
    ? (value as MusicDebugMidiExportVariant)
    : 'full';
}
