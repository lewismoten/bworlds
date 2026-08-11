import { describe, expect, it } from 'vitest';
import { isNoteInsideSongSection } from './procedural-music-song-boundaries.ts';
import { REPRESENTATIVE_FOREST_EXPLORATION_SONG } from './testing/procedural-music-song-test-support.ts';

describe('procedural music song arrangement boundaries', () => {
  it('keeps transformed notes fully inside their assigned section windows', () => {
    const song = REPRESENTATIVE_FOREST_EXPLORATION_SONG;

    for (const section of song.sections) {
      const sectionStartMs = song.startMs + section.startOffsetMs;
      const sectionEndMs = sectionStartMs + section.durationMs;
      const notesInSection = song.notes.filter(
        (note) => note.startMs >= sectionStartMs && note.startMs < sectionEndMs
      );

      expect(notesInSection.length).toBeGreaterThan(0);
      expect(
        notesInSection.every((note) =>
          isNoteInsideSongSection(note, section, song.startMs)
        )
      ).toBe(true);
      expect(
        notesInSection.every(
          (note) => note.startMs + note.durationMs <= sectionEndMs
        )
      ).toBe(true);
    }
  });
});
