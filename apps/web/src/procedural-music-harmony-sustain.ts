import type { ProceduralMusicSongSectionContext } from './procedural-music-song-section-context.ts';

export function resolveSongHarmonySustainMultiplier(
  context: Pick<
    ProceduralMusicSongSectionContext,
    'section' | 'noteIndexInSection'
  >
): number {
  const chordIndexInSection = Math.floor(context.noteIndexInSection / 3);
  const phrasePulse = chordIndexInSection % 4;
  const base =
    context.section.id === 'intro' || context.section.id === 'outro'
      ? 3.1
      : context.section.id === 'b'
        ? 2.5
        : context.section.id === 'variation'
          ? 2.7
          : 2.85;

  if (phrasePulse === 3) {
    return Math.max(2.2, base - 0.35);
  }
  return base;
}
