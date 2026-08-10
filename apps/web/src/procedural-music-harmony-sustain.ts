import type { ProceduralMusicSongSectionId } from './procedural-music-song.ts';

export function resolveSongHarmonySustainMultiplier(options: {
  sectionId: ProceduralMusicSongSectionId;
  noteIndexInSection: number;
}): number {
  const chordIndexInSection = Math.floor(options.noteIndexInSection / 3);
  const phrasePulse = chordIndexInSection % 4;
  const base =
    options.sectionId === 'intro' || options.sectionId === 'outro'
      ? 3.1
      : options.sectionId === 'b'
        ? 2.5
        : options.sectionId === 'variation'
          ? 2.7
          : 2.85;

  if (phrasePulse === 3) {
    return Math.max(2.2, base - 0.35);
  }
  return base;
}
