import {
  resolveMusicThemeById,
  type ProceduralMusicNote,
} from './procedural-music.ts';
import { resolveProceduralMidiNoteFrequency } from './procedural-music-scale.ts';

type SongCadenceKind = 'question' | 'answer' | 'weak';
type SongCadenceSection = {
  id: string;
  startOffsetMs: number;
  durationMs: number;
  measureCount: number;
};

export function resolveSongFinalCadence(options: {
  notes: readonly ProceduralMusicNote[];
  sections: readonly SongCadenceSection[];
  songStartMs: number;
}): ProceduralMusicNote[] {
  const resolvedNotes = [...options.notes];
  const cadencePoints = collectSongCadencePoints(options.sections);

  for (const cadencePoint of cadencePoints) {
    applySongCadenceAtPoint(resolvedNotes, {
      ...cadencePoint,
      songStartMs: options.songStartMs,
    });
  }

  return resolvedNotes;
}

function collectSongCadencePoints(
  sections: readonly SongCadenceSection[]
): Array<{
  kind: SongCadenceKind;
  section: SongCadenceSection;
  boundaryOffsetMs: number;
  windowStartOffsetMs: number;
  windowEndOffsetMs: number;
}> {
  const points: Array<{
    kind: SongCadenceKind;
    section: SongCadenceSection;
    boundaryOffsetMs: number;
    windowStartOffsetMs: number;
    windowEndOffsetMs: number;
  }> = [];

  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index]!;
    const measureDurationMs =
      section.durationMs / Math.max(1, section.measureCount);
    const cadenceWindowMs = Math.max(320, measureDurationMs * 1.5);
    const sectionEndOffsetMs = section.startOffsetMs + section.durationMs;
    const isFinalSection =
      index === sections.length - 1 || section.id === 'outro';

    if (section.measureCount >= 16) {
      const midpointOffsetMs = section.startOffsetMs + section.durationMs / 2;
      points.push({
        kind: 'question',
        section,
        boundaryOffsetMs: midpointOffsetMs,
        windowStartOffsetMs: midpointOffsetMs - cadenceWindowMs,
        windowEndOffsetMs: midpointOffsetMs,
      });
    }

    points.push({
      kind: isFinalSection ? 'answer' : 'weak',
      section,
      boundaryOffsetMs: sectionEndOffsetMs,
      windowStartOffsetMs: sectionEndOffsetMs - cadenceWindowMs,
      windowEndOffsetMs: sectionEndOffsetMs,
    });
  }

  return points;
}

function applySongCadenceAtPoint(
  notes: ProceduralMusicNote[],
  options: {
    kind: SongCadenceKind;
    section: SongCadenceSection;
    boundaryOffsetMs: number;
    windowStartOffsetMs: number;
    windowEndOffsetMs: number;
    songStartMs: number;
  }
): void {
  const leadIndex = findFinalWindowRoleNoteIndex({
    notes,
    role: 'lead',
    songStartMs: options.songStartMs,
    startOffsetMs: options.windowStartOffsetMs,
    endOffsetMs: options.windowEndOffsetMs,
  });
  if (leadIndex !== null) {
    const note = notes[leadIndex]!;
    const previousLeadNote = findPreviousRoleNote(notes, 'lead', leadIndex);
    notes[leadIndex] = resolveCadenceLeadNote({
      kind: options.kind,
      note,
      previousLeadNote,
      boundaryMs: options.songStartMs + options.boundaryOffsetMs,
      finalSection: options.section.id === 'outro',
    });
  }

  const bassIndex = findFinalWindowRoleNoteIndex({
    notes,
    role: 'bass',
    songStartMs: options.songStartMs,
    startOffsetMs: options.windowStartOffsetMs,
    endOffsetMs: options.windowEndOffsetMs,
  });
  if (bassIndex !== null) {
    const note = notes[bassIndex]!;
    const previousBassNote = findPreviousRoleNote(notes, 'bass', bassIndex);
    notes[bassIndex] = resolveCadenceBassNote({
      kind: options.kind,
      note,
      previousBassNote,
      boundaryMs: options.songStartMs + options.boundaryOffsetMs,
      finalSection: options.section.id === 'outro',
    });
  }
}

function resolveCadenceLeadNote(options: {
  kind: SongCadenceKind;
  note: ProceduralMusicNote;
  previousLeadNote: ProceduralMusicNote | null;
  boundaryMs: number;
  finalSection: boolean;
}): ProceduralMusicNote {
  const theme = resolveMusicThemeById(options.note.themeId);
  const currentMidiNote = resolveNoteMidi(options.note.frequency);
  const previousMidiNote =
    options.previousLeadNote === null
      ? null
      : resolveNoteMidi(options.previousLeadNote.frequency);
  const cadenceMidiNote =
    options.kind === 'answer'
      ? resolveNearestTonicMidi({
          rootMidiNote: theme.rootMidiNote,
          currentMidiNote,
          previousMidiNote,
        })
      : resolveNearestCadenceDegreeMidi({
          kind: options.kind,
          rootMidiNote: theme.rootMidiNote,
          scale: theme.scale,
          currentMidiNote,
          previousMidiNote,
        });
  const startMs = Math.min(options.note.startMs, options.boundaryMs - 1);
  const maxDurationMs = Math.max(1, options.boundaryMs - startMs);

  return {
    ...options.note,
    frequency: resolveProceduralMidiNoteFrequency(cadenceMidiNote),
    durationMs: Math.min(
      options.kind === 'question'
        ? Math.max(180, Math.round(options.note.durationMs * 0.92))
        : options.kind === 'answer'
          ? Math.max(options.note.durationMs, 420)
          : Math.max(options.note.durationMs, 280),
      maxDurationMs
    ),
    startMs,
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

function resolveNearestCadenceDegreeMidi(options: {
  kind: Exclude<SongCadenceKind, 'answer'>;
  rootMidiNote: number;
  scale: readonly number[];
  currentMidiNote: number;
  previousMidiNote: number | null;
}): number {
  const candidateDegreeIndices = options.kind === 'question' ? [4, 1] : [2, 4];
  const candidates = candidateDegreeIndices.flatMap((degreeIndex) =>
    resolveCadenceMidiCandidates({
      rootMidiNote: options.rootMidiNote,
      scale: options.scale,
      degreeIndex,
      currentMidiNote: options.currentMidiNote,
    })
  );

  return (
    candidates
      .filter((candidate) => candidate % 12 !== options.rootMidiNote % 12)
      .sort((left, right) => {
        const leftPreviousDistance =
          options.previousMidiNote === null
            ? 0
            : Math.abs(left - options.previousMidiNote);
        const rightPreviousDistance =
          options.previousMidiNote === null
            ? 0
            : Math.abs(right - options.previousMidiNote);
        return (
          leftPreviousDistance - rightPreviousDistance ||
          Math.abs(left - options.currentMidiNote) -
            Math.abs(right - options.currentMidiNote)
        );
      })[0] ?? options.currentMidiNote
  );
}

function resolveCadenceMidiCandidates(options: {
  rootMidiNote: number;
  scale: readonly number[];
  degreeIndex: number;
  currentMidiNote: number;
}): number[] {
  const octave = Math.round(
    (options.currentMidiNote - options.rootMidiNote) / 12
  );
  const degreeOffset =
    options.scale[
      mod(options.degreeIndex, Math.max(1, options.scale.length))
    ] ?? 0;
  const candidates: number[] = [];

  for (let octaveOffset = -2; octaveOffset <= 2; octaveOffset += 1) {
    candidates.push(
      options.rootMidiNote + (octave + octaveOffset) * 12 + degreeOffset
    );
  }

  return candidates;
}

function resolveCadenceBassNote(options: {
  kind: SongCadenceKind;
  note: ProceduralMusicNote;
  previousBassNote: ProceduralMusicNote | null;
  boundaryMs: number;
  finalSection: boolean;
}): ProceduralMusicNote {
  const theme = resolveMusicThemeById(options.note.themeId);
  const currentMidiNote = resolveNoteMidi(options.note.frequency);
  const previousMidiNote =
    options.previousBassNote === null
      ? null
      : resolveNoteMidi(options.previousBassNote.frequency);
  const targetMidi =
    options.kind === 'question'
      ? resolveNearestCadenceDegreeMidi({
          kind: 'question',
          rootMidiNote: theme.rootMidiNote - 12,
          scale: theme.scale,
          currentMidiNote,
          previousMidiNote,
        })
      : options.kind === 'weak'
        ? resolveNearestCadenceDegreeMidi({
            kind: 'weak',
            rootMidiNote: theme.rootMidiNote - 12,
            scale: theme.scale,
            currentMidiNote,
            previousMidiNote,
          })
        : resolveNearestTonicMidi({
            rootMidiNote: theme.rootMidiNote - 12,
            currentMidiNote,
            previousMidiNote,
          });
  const startMs = Math.min(options.note.startMs, options.boundaryMs - 1);
  const maxDurationMs = Math.max(1, options.boundaryMs - startMs);

  return {
    ...options.note,
    frequency: resolveProceduralMidiNoteFrequency(targetMidi),
    durationMs: Math.min(
      options.kind === 'answer'
        ? Math.max(options.note.durationMs, 460)
        : Math.max(options.note.durationMs, 260),
      maxDurationMs
    ),
    startMs,
  };
}

function findFinalWindowRoleNoteIndex(options: {
  notes: readonly ProceduralMusicNote[];
  role: ProceduralMusicNote['role'];
  songStartMs: number;
  startOffsetMs: number;
  endOffsetMs: number;
}): number | null {
  const sectionStartMs = options.songStartMs + options.startOffsetMs;
  const sectionEndMs = options.songStartMs + options.endOffsetMs;

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

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
