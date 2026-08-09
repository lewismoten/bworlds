import type { ProceduralMusicNote } from './procedural-music.ts';
import { resolveSongSectionLayerTreatment } from './procedural-music-song-layers.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

const SEMITONE_RATIO = 2 ** (1 / 12);

export function transformSongSectionNote(
  note: ProceduralMusicNote,
  section: ProceduralMusicSongSection,
  noteIndexInSection: number
): ProceduralMusicNote | null {
  const layerTreatment = resolveSongSectionLayerTreatment(
    section,
    note,
    noteIndexInSection
  );
  if (layerTreatment.muted) {
    return null;
  }

  switch (section.id) {
    case 'intro':
      return scaleSongNote(note, {
        volumeMultiplier: layerTreatment.volumeMultiplier,
        durationMultiplier: layerTreatment.durationMultiplier,
        releaseMultiplier: layerTreatment.releaseMultiplier,
      });
    case 'a-prime':
      return transformAprimeSectionNote(
        note,
        noteIndexInSection,
        layerTreatment
      );
    case 'b':
      return scaleSongNote(note, {
        volumeMultiplier: layerTreatment.volumeMultiplier,
        durationMultiplier: layerTreatment.durationMultiplier,
      });
    case 'variation':
      return transformVariationSectionNote(
        note,
        noteIndexInSection,
        layerTreatment
      );
    case 'return':
      return scaleSongNote(note, {
        volumeMultiplier: layerTreatment.volumeMultiplier,
      });
    case 'outro':
      return scaleSongNote(note, {
        volumeMultiplier: layerTreatment.volumeMultiplier,
        durationMultiplier: layerTreatment.durationMultiplier,
        releaseMultiplier: layerTreatment.releaseMultiplier,
      });
    case 'a':
    default:
      return note;
  }
}

function transformAprimeSectionNote(
  note: ProceduralMusicNote,
  noteIndexInSection: number,
  layerTreatment: ReturnType<typeof resolveSongSectionLayerTreatment>
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
    volumeMultiplier: layerTreatment.volumeMultiplier,
    durationMultiplier: layerTreatment.durationMultiplier,
    startOffsetMs: rhythmShiftMs,
    transposeSemitones: endingOffsetSemitones,
  });
}

function transformVariationSectionNote(
  note: ProceduralMusicNote,
  noteIndexInSection: number,
  layerTreatment: ReturnType<typeof resolveSongSectionLayerTreatment>
): ProceduralMusicNote {
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
    volumeMultiplier: layerTreatment.volumeMultiplier,
    durationMultiplier: layerTreatment.durationMultiplier,
    releaseMultiplier: layerTreatment.releaseMultiplier,
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
