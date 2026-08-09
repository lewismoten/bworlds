import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

const SEMITONE_RATIO = 2 ** (1 / 12);

export function transformSongSectionNote(
  note: ProceduralMusicNote,
  section: ProceduralMusicSongSection,
  noteIndexInSection: number
): ProceduralMusicNote | null {
  switch (section.id) {
    case 'intro':
      if (note.role === 'percussion') {
        return null;
      }
      if (note.role === 'bass' && noteIndexInSection % 2 === 1) {
        return null;
      }
      return scaleSongNote(note, {
        volumeMultiplier: note.role === 'lead' ? 0.84 : 0.68,
        durationMultiplier: note.role === 'harmony' ? 1.14 : 1,
        releaseMultiplier: 1.12,
      });
    case 'a-prime':
      return transformAprimeSectionNote(note, noteIndexInSection);
    case 'b':
      if (note.role === 'harmony' && noteIndexInSection % 5 === 0) {
        return null;
      }
      return scaleSongNote(note, {
        volumeMultiplier:
          note.role === 'lead' ? 1.08 : note.role === 'percussion' ? 0.9 : 1,
        durationMultiplier: note.role === 'bass' ? 1.1 : 1,
      });
    case 'variation':
      return transformVariationSectionNote(note, noteIndexInSection);
    case 'return':
      return scaleSongNote(note, {
        volumeMultiplier: note.role === 'lead' ? 0.94 : 0.98,
      });
    case 'outro':
      if (note.role === 'percussion') {
        return null;
      }
      if (note.role === 'lead' && noteIndexInSection % 2 === 1) {
        return null;
      }
      return scaleSongNote(note, {
        volumeMultiplier: 0.72,
        durationMultiplier: note.role === 'harmony' ? 1.2 : 1.08,
        releaseMultiplier: 1.24,
      });
    case 'a':
    default:
      return note;
  }
}

function transformAprimeSectionNote(
  note: ProceduralMusicNote,
  noteIndexInSection: number
): ProceduralMusicNote {
  const phrasePosition = noteIndexInSection % 8;
  const endingOffsetSemitones =
    note.role === 'lead' && phrasePosition >= 6
      ? phrasePosition === 6
        ? 2
        : 5
      : note.role === 'harmony' && phrasePosition === 7
        ? 2
        : 0;
  const rhythmShiftMs =
    note.role === 'lead' && phrasePosition >= 4 ? (phrasePosition - 3) * 18 : 0;

  return scaleSongNote(note, {
    volumeMultiplier: note.role === 'lead' ? 1.06 : 1,
    durationMultiplier: note.role === 'harmony' ? 1.08 : 1,
    startOffsetMs: rhythmShiftMs,
    transposeSemitones: endingOffsetSemitones,
  });
}

function transformVariationSectionNote(
  note: ProceduralMusicNote,
  noteIndexInSection: number
): ProceduralMusicNote | null {
  if (note.role === 'percussion' && noteIndexInSection % 4 === 0) {
    return null;
  }

  const phrasePosition = noteIndexInSection % 8;
  const transposeSemitones =
    note.role === 'lead'
      ? ([0, 0, 2, 0, 5, 2, 0, -2][phrasePosition] ?? 0)
      : note.role === 'harmony' && phrasePosition >= 6
        ? -2
        : 0;
  const rhythmShiftMs =
    note.role === 'lead'
      ? ([0, 24, 48, 72, 0, 24, 48, 96][phrasePosition] ?? 0)
      : note.role === 'harmony'
        ? ([0, 0, 22, 22, 0, 0, 44, 44][phrasePosition] ?? 0)
        : 0;

  return scaleSongNote(note, {
    volumeMultiplier: note.role === 'harmony' ? 0.92 : 1,
    durationMultiplier:
      note.role === 'lead' ? 1.24 : note.role === 'harmony' ? 1.1 : 1,
    releaseMultiplier: note.role === 'lead' ? 1.18 : 1,
    startOffsetMs: rhythmShiftMs,
    transposeSemitones,
  });
}

function scaleSongNote(
  note: ProceduralMusicNote,
  options: {
    volumeMultiplier?: number;
    durationMultiplier?: number;
    releaseMultiplier?: number;
    startOffsetMs?: number;
    transposeSemitones?: number;
  }
): ProceduralMusicNote {
  const durationMultiplier = options.durationMultiplier ?? 1;
  const releaseMultiplier = options.releaseMultiplier ?? 1;
  const transposeSemitones = options.transposeSemitones ?? 0;
  return {
    ...note,
    startMs: note.startMs + (options.startOffsetMs ?? 0),
    durationMs: Math.max(24, Math.round(note.durationMs * durationMultiplier)),
    frequency:
      transposeSemitones === 0
        ? note.frequency
        : note.frequency * SEMITONE_RATIO ** transposeSemitones,
    volume: note.volume * (options.volumeMultiplier ?? 1),
    releaseMs: Math.max(12, Math.round(note.releaseMs * releaseMultiplier)),
  };
}
