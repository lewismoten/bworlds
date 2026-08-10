import {
  resolveMusicThemeById,
  type ProceduralMusicNote,
} from './procedural-music.ts';
import { resolveProceduralMidiNoteFrequency } from './procedural-music-scale.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

export function resolveSongFinalCadence(options: {
  notes: readonly ProceduralMusicNote[];
  sections: readonly ProceduralMusicSongSection[];
  songStartMs: number;
}): ProceduralMusicNote[] {
  const finalSection =
    [...options.sections].reverse().find((section) => section.id === 'outro') ??
    options.sections[options.sections.length - 1];
  if (!finalSection) {
    return [...options.notes];
  }

  const finalLeadIndex = findFinalSectionRoleNoteIndex({
    notes: options.notes,
    role: 'lead',
    section: finalSection,
    songStartMs: options.songStartMs,
  });
  if (finalLeadIndex === null) {
    return [...options.notes];
  }

  const resolvedNotes = [...options.notes];
  const finalLeadNote = resolvedNotes[finalLeadIndex]!;
  const previousLeadNote =
    findPreviousRoleNote(resolvedNotes, 'lead', finalLeadIndex) ?? null;
  resolvedNotes[finalLeadIndex] = resolveFinalLeadTonicNote({
    note: finalLeadNote,
    previousLeadNote,
  });
  return resolvedNotes;
}

function resolveFinalLeadTonicNote(options: {
  note: ProceduralMusicNote;
  previousLeadNote: ProceduralMusicNote | null;
}): ProceduralMusicNote {
  const theme = resolveMusicThemeById(options.note.themeId);
  const currentMidiNote = resolveNoteMidi(options.note.frequency);
  const previousMidiNote =
    options.previousLeadNote === null
      ? null
      : resolveNoteMidi(options.previousLeadNote.frequency);
  const tonicMidiNote = resolveNearestTonicMidi({
    rootMidiNote: theme.rootMidiNote,
    currentMidiNote,
    previousMidiNote,
  });

  if (tonicMidiNote === currentMidiNote) {
    return options.note;
  }

  return {
    ...options.note,
    frequency: resolveProceduralMidiNoteFrequency(tonicMidiNote),
  };
}

function resolveNearestTonicMidi(options: {
  rootMidiNote: number;
  currentMidiNote: number;
  previousMidiNote: number | null;
}): number {
  const currentOctave = Math.round(
    (options.currentMidiNote - options.rootMidiNote) / 12
  );
  const candidates: number[] = [];

  for (let octaveOffset = -3; octaveOffset <= 3; octaveOffset += 1) {
    candidates.push(options.rootMidiNote + (currentOctave + octaveOffset) * 12);
  }

  const preferredCandidate = candidates.find((candidate) => {
    if (options.previousMidiNote === null) {
      return false;
    }
    return Math.abs(candidate - options.previousMidiNote) <= 12;
  });
  if (preferredCandidate !== undefined) {
    return preferredCandidate;
  }

  return (
    candidates.sort(
      (left, right) =>
        Math.abs(left - options.currentMidiNote) -
        Math.abs(right - options.currentMidiNote)
    )[0] ?? options.rootMidiNote
  );
}

function findFinalSectionRoleNoteIndex(options: {
  notes: readonly ProceduralMusicNote[];
  role: ProceduralMusicNote['role'];
  section: Pick<ProceduralMusicSongSection, 'startOffsetMs' | 'durationMs'>;
  songStartMs: number;
}): number | null {
  const sectionStartMs = options.songStartMs + options.section.startOffsetMs;
  const sectionEndMs = sectionStartMs + options.section.durationMs;

  for (let index = options.notes.length - 1; index >= 0; index -= 1) {
    const note = options.notes[index];
    if (
      note?.role === options.role &&
      note.startMs >= sectionStartMs &&
      note.startMs < sectionEndMs
    ) {
      return index;
    }
  }

  return null;
}

function findPreviousRoleNote(
  notes: readonly ProceduralMusicNote[],
  role: ProceduralMusicNote['role'],
  beforeIndex: number
): ProceduralMusicNote | null {
  for (let index = beforeIndex - 1; index >= 0; index -= 1) {
    const note = notes[index];
    if (note?.role === role) {
      return note;
    }
  }

  return null;
}

function resolveNoteMidi(frequency: number): number {
  return Math.round(69 + 12 * Math.log2(Math.max(frequency, 1) / 440));
}
