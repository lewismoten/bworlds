import {
  resolveMusicThemeById,
  type ProceduralMusicNote,
} from './procedural-music.ts';
import { resolveProceduralMidiNoteFrequency } from './procedural-music-scale.ts';
import {
  collectSongCadencePoints,
  type SongCadenceKind,
  type SongCadenceSection,
} from './procedural-music-song-cadence-plan.ts';

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

  if (options.kind === 'answer') {
    alignAnswerCadenceHarmony(notes, {
      section: options.section,
      songStartMs: options.songStartMs,
      startOffsetMs: options.windowStartOffsetMs,
      endOffsetMs: options.windowEndOffsetMs,
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
  const startMs = Math.max(
    0,
    Math.min(
      options.note.startMs -
        (options.kind === 'answer' || options.kind === 'loop' ? 120 : 0),
      options.boundaryMs - 1
    )
  );
  const maxDurationMs = Math.max(1, options.boundaryMs - startMs);

  return {
    ...options.note,
    frequency: resolveProceduralMidiNoteFrequency(cadenceMidiNote),
    durationMs: Math.min(
      resolveCadenceMinimumDurationMs(options.kind, options.note.durationMs),
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
  const candidateDegreeIndices = resolveCadenceLeadDegreeIndices(options.kind);
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
    options.kind === 'answer'
      ? resolveNearestTonicMidi({
          rootMidiNote: theme.rootMidiNote - 12,
          currentMidiNote,
          previousMidiNote,
        })
      : resolveNearestCadenceDegreeMidi({
          kind: options.kind,
          rootMidiNote: theme.rootMidiNote - 12,
          scale: theme.scale,
          currentMidiNote,
          previousMidiNote,
        });
  const startMs = Math.max(
    0,
    Math.min(
      options.note.startMs -
        (options.kind === 'answer' || options.kind === 'loop' ? 120 : 0),
      options.boundaryMs - 1
    )
  );
  const maxDurationMs = Math.max(1, options.boundaryMs - startMs);

  return {
    ...options.note,
    frequency: resolveProceduralMidiNoteFrequency(targetMidi),
    durationMs: Math.min(
      resolveCadenceMinimumDurationMs(options.kind, options.note.durationMs),
      maxDurationMs
    ),
    startMs,
  };
}

function resolveCadenceLeadDegreeIndices(
  kind: Exclude<SongCadenceKind, 'answer'>
): number[] {
  if (kind === 'weak') {
    return [2, 4];
  }
  return [1, 4];
}

function resolveCadenceMinimumDurationMs(
  kind: SongCadenceKind,
  currentDurationMs: number
): number {
  if (kind === 'question') {
    return Math.max(180, Math.round(currentDurationMs * 0.92));
  }
  if (kind === 'weak') {
    return Math.max(currentDurationMs, 280);
  }
  if (kind === 'loop') {
    return Math.max(currentDurationMs, 520);
  }
  return Math.max(currentDurationMs, 640);
}

function alignAnswerCadenceHarmony(
  notes: ProceduralMusicNote[],
  options: {
    section: SongCadenceSection;
    songStartMs: number;
    startOffsetMs: number;
    endOffsetMs: number;
  }
): void {
  const harmonyIndices = findFinalWindowRoleNoteIndices({
    notes,
    role: 'harmony',
    songStartMs: options.songStartMs,
    startOffsetMs: options.startOffsetMs,
    endOffsetMs: options.endOffsetMs,
    limit: 3,
  });

  for (let order = 0; order < harmonyIndices.length; order += 1) {
    const harmonyIndex = harmonyIndices[order]!;
    const note = notes[harmonyIndex]!;
    const theme = resolveMusicThemeById(note.themeId);
    const currentMidiNote = resolveNoteMidi(note.frequency);
    const targetDegreeIndex = ([0, 2, 4][order] ?? 0) % theme.scale.length;
    const targetMidiNote = resolveNearestCadenceDegreeMidiByIndex({
      rootMidiNote: theme.rootMidiNote,
      scale: theme.scale,
      degreeIndex: targetDegreeIndex,
      currentMidiNote,
    });
    notes[harmonyIndex] = {
      ...note,
      frequency: resolveProceduralMidiNoteFrequency(targetMidiNote),
    };
  }
}

function findFinalWindowRoleNoteIndex(options: {
  notes: readonly ProceduralMusicNote[];
  role: ProceduralMusicNote['role'];
  songStartMs: number;
  startOffsetMs: number;
  endOffsetMs: number;
}): number | null {
  return (
    findFinalWindowRoleNoteIndices({
      ...options,
      limit: 1,
    })[0] ?? null
  );
}

function findFinalWindowRoleNoteIndices(options: {
  notes: readonly ProceduralMusicNote[];
  role: ProceduralMusicNote['role'];
  songStartMs: number;
  startOffsetMs: number;
  endOffsetMs: number;
  limit: number;
}): number[] {
  const sectionStartMs = options.songStartMs + options.startOffsetMs;
  const sectionEndMs = options.songStartMs + options.endOffsetMs;
  const indices: number[] = [];

  for (let index = options.notes.length - 1; index >= 0; index -= 1) {
    const note = options.notes[index];
    if (
      note?.role === options.role &&
      note.startMs >= sectionStartMs &&
      note.startMs < sectionEndMs
    ) {
      indices.push(index);
      if (indices.length >= options.limit) {
        break;
      }
    }
  }

  return indices.reverse();
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

function resolveNearestCadenceDegreeMidiByIndex(options: {
  rootMidiNote: number;
  scale: readonly number[];
  degreeIndex: number;
  currentMidiNote: number;
}): number {
  return (
    resolveCadenceMidiCandidates({
      rootMidiNote: options.rootMidiNote,
      scale: options.scale,
      degreeIndex: options.degreeIndex,
      currentMidiNote: options.currentMidiNote,
    }).sort(
      (left, right) =>
        Math.abs(left - options.currentMidiNote) -
        Math.abs(right - options.currentMidiNote)
    )[0] ?? options.currentMidiNote
  );
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
