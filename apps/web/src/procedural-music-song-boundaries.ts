import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

export function constrainSongSectionNote(
  note: ProceduralMusicNote,
  section: Pick<ProceduralMusicSongSection, 'startOffsetMs' | 'durationMs'>,
  songStartMs: number
): ProceduralMusicNote | null {
  const sectionStartMs = songStartMs + section.startOffsetMs;
  const sectionEndMs = sectionStartMs + section.durationMs;
  const clampedStartMs = Math.max(note.startMs, sectionStartMs);

  if (clampedStartMs >= sectionEndMs) {
    return null;
  }

  const clampedEndMs = Math.min(note.startMs + note.durationMs, sectionEndMs);
  const clampedDurationMs = Math.max(1, clampedEndMs - clampedStartMs);

  return {
    ...note,
    startMs: clampedStartMs,
    durationMs: clampedDurationMs,
  };
}

export function isNoteInsideSongSection(
  note: Pick<ProceduralMusicNote, 'startMs' | 'durationMs'>,
  section: Pick<ProceduralMusicSongSection, 'startOffsetMs' | 'durationMs'>,
  songStartMs: number
): boolean {
  const sectionStartMs = songStartMs + section.startOffsetMs;
  const sectionEndMs = sectionStartMs + section.durationMs;
  return (
    note.startMs >= sectionStartMs &&
    note.startMs < sectionEndMs &&
    note.startMs + note.durationMs <= sectionEndMs
  );
}
