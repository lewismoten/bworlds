import type { ProceduralMusicNote } from './procedural-music.ts';
import { isProceduralSemitoneInMode } from './procedural-music-scale.ts';

type ProceduralMusicRole = ProceduralMusicNote['role'];

export type MusicDebugNotePitchDiagnostic = {
  noteIndex: number;
  role: ProceduralMusicRole;
  frequency: number;
  midiNote: number | null;
  relativeSemitones: number | null;
  scaleDegree: number | null;
  scaleDegreeLabel: string | null;
  inMode: boolean;
  accidentalReason:
    'percussion' | 'in-mode' | 'chromatic-approach' | 'unexplained-chromatic';
};

export type MusicDebugAccidentalBudget = {
  maxExplainedAccidentals: number;
  maxUnexplainedAccidentals: number;
};

export type MusicDebugPitchValidation = {
  notePitchDiagnostics: MusicDebugNotePitchDiagnostic[];
  accidentalNoteCount: number;
  accidentalsByRole: Record<ProceduralMusicRole, number>;
  outOfModeNotesByRole: Record<ProceduralMusicRole, number>;
  unexplainedAccidentalCount: number;
  budget: MusicDebugAccidentalBudget;
  isValidForMidiExport: boolean;
  messages: string[];
};

export function analyzeMusicDebugPitches(options: {
  notes: readonly ProceduralMusicNote[];
  rootHz: number;
  modePitchOffsets: readonly number[];
  encounterMode?: 'ambient' | 'battle' | 'boss';
  themeId?: string;
}): MusicDebugPitchValidation {
  const notePitchDiagnostics = options.notes.map((note, noteIndex) =>
    createBaseNotePitchDiagnostic({
      note,
      noteIndex,
      rootHz: options.rootHz,
      modePitchOffsets: options.modePitchOffsets,
    })
  );
  for (let index = 0; index < notePitchDiagnostics.length; index += 1) {
    const diagnostic = notePitchDiagnostics[index]!;
    if (diagnostic.role === 'percussion' || diagnostic.inMode) {
      continue;
    }
    diagnostic.accidentalReason = resolveAccidentalReason(
      notePitchDiagnostics,
      index
    );
  }
  const accidentalsByRole = createRoleCountMap();
  const outOfModeNotesByRole = createRoleCountMap();
  let accidentalNoteCount = 0;
  let unexplainedAccidentalCount = 0;

  for (let index = 0; index < notePitchDiagnostics.length; index += 1) {
    const diagnostic = notePitchDiagnostics[index]!;
    if (diagnostic.role === 'percussion') {
      continue;
    }
    if (!diagnostic.inMode) {
      accidentalNoteCount += 1;
      accidentalsByRole[diagnostic.role] += 1;
      outOfModeNotesByRole[diagnostic.role] += 1;
      if (diagnostic.accidentalReason === 'unexplained-chromatic') {
        unexplainedAccidentalCount += 1;
      }
    }
  }

  const budget = resolveMusicDebugAccidentalBudget({
    encounterMode: options.encounterMode,
    themeId: options.themeId,
  });
  const messages: string[] = [];
  if (unexplainedAccidentalCount > budget.maxUnexplainedAccidentals) {
    messages.push(
      `Found ${unexplainedAccidentalCount} unexplained chromatic notes; MIDI export allows ${budget.maxUnexplainedAccidentals}.`
    );
  }
  const explainedAccidentals = accidentalNoteCount - unexplainedAccidentalCount;
  if (explainedAccidentals > budget.maxExplainedAccidentals) {
    messages.push(
      `Found ${explainedAccidentals} explained chromatic notes; MIDI export allows ${budget.maxExplainedAccidentals}.`
    );
  }

  return {
    notePitchDiagnostics,
    accidentalNoteCount,
    accidentalsByRole,
    outOfModeNotesByRole,
    unexplainedAccidentalCount,
    budget,
    isValidForMidiExport: messages.length === 0,
    messages,
  };
}

export function resolveMusicDebugAccidentalBudget(options: {
  encounterMode?: 'ambient' | 'battle' | 'boss';
  themeId?: string;
}): MusicDebugAccidentalBudget {
  if (
    (options.encounterMode ?? 'ambient') === 'ambient' &&
    options.themeId === 'frontier-plains'
  ) {
    return {
      maxExplainedAccidentals: 4,
      maxUnexplainedAccidentals: 4,
    };
  }
  if ((options.encounterMode ?? 'ambient') === 'ambient') {
    return {
      maxExplainedAccidentals: 10,
      maxUnexplainedAccidentals: 10,
    };
  }
  return {
    maxExplainedAccidentals: 12,
    maxUnexplainedAccidentals: 12,
  };
}

function createBaseNotePitchDiagnostic(options: {
  note: ProceduralMusicNote;
  noteIndex: number;
  rootHz: number;
  modePitchOffsets: readonly number[];
}): MusicDebugNotePitchDiagnostic {
  const { note } = options;
  if (note.role === 'percussion') {
    return {
      noteIndex: options.noteIndex,
      role: note.role,
      frequency: note.frequency,
      midiNote: null,
      relativeSemitones: null,
      scaleDegree: null,
      scaleDegreeLabel: null,
      inMode: true,
      accidentalReason: 'percussion',
    };
  }

  const midiNote = Math.round(
    69 + 12 * Math.log2(Math.max(note.frequency, 1) / 440)
  );
  const relativeSemitones = Math.round(
    Math.log2(note.frequency / Math.max(options.rootHz, Number.EPSILON)) * 12
  );
  const inMode = isProceduralSemitoneInMode(
    options.modePitchOffsets,
    relativeSemitones
  );
  const scaleDegree = inMode
    ? resolveScaleDegree(relativeSemitones, options.modePitchOffsets)
    : null;

  return {
    noteIndex: options.noteIndex,
    role: note.role,
    frequency: note.frequency,
    midiNote,
    relativeSemitones,
    scaleDegree,
    scaleDegreeLabel:
      scaleDegree === null ? null : `degree ${((scaleDegree - 1) % 7) + 1}`,
    inMode,
    accidentalReason: inMode ? 'in-mode' : 'unexplained-chromatic',
  };
}

function resolveScaleDegree(
  relativeSemitones: number,
  modePitchOffsets: readonly number[]
): number | null {
  const normalizedModeOffsets = modePitchOffsets.filter(
    (offset, index) => index === 0 || offset !== modePitchOffsets[index - 1]
  );
  const octaveDegreeCount = normalizedModeOffsets.filter(
    (offset) => offset < 12
  ).length;
  if (octaveDegreeCount <= 0) {
    return null;
  }
  const octave = Math.floor(relativeSemitones / 12);
  const pitchClass = normalizePitchClass(relativeSemitones);

  for (let index = 0; index < normalizedModeOffsets.length; index += 1) {
    const offset = normalizedModeOffsets[index]!;
    if (normalizePitchClass(offset) !== pitchClass || offset >= 12) {
      continue;
    }
    return octave * octaveDegreeCount + index + 1;
  }

  return null;
}

function resolveAccidentalReason(
  diagnostics: readonly MusicDebugNotePitchDiagnostic[],
  noteIndex: number
): MusicDebugNotePitchDiagnostic['accidentalReason'] {
  const current = diagnostics[noteIndex];
  if (!current) {
    return 'unexplained-chromatic';
  }
  const neighbor = findNextNoteForRole(diagnostics, noteIndex, current.role);
  if (
    neighbor &&
    neighbor.relativeSemitones !== null &&
    neighbor.inMode &&
    current.relativeSemitones !== null &&
    Math.abs(neighbor.relativeSemitones - current.relativeSemitones) === 1
  ) {
    return 'chromatic-approach';
  }
  const previous = findPreviousNoteForRole(
    diagnostics,
    noteIndex,
    current.role
  );
  if (
    previous &&
    previous.relativeSemitones !== null &&
    previous.inMode &&
    current.relativeSemitones !== null &&
    Math.abs(previous.relativeSemitones - current.relativeSemitones) === 1
  ) {
    return 'chromatic-approach';
  }
  return 'unexplained-chromatic';
}

function findNextNoteForRole(
  diagnostics: readonly MusicDebugNotePitchDiagnostic[],
  startIndex: number,
  role: ProceduralMusicRole
): MusicDebugNotePitchDiagnostic | null {
  for (let index = startIndex + 1; index < diagnostics.length; index += 1) {
    const diagnostic = diagnostics[index]!;
    if (diagnostic.role !== role) {
      continue;
    }
    return diagnostic;
  }
  return null;
}

function findPreviousNoteForRole(
  diagnostics: readonly MusicDebugNotePitchDiagnostic[],
  startIndex: number,
  role: ProceduralMusicRole
): MusicDebugNotePitchDiagnostic | null {
  for (let index = startIndex - 1; index >= 0; index -= 1) {
    const diagnostic = diagnostics[index]!;
    if (diagnostic.role !== role) {
      continue;
    }
    return diagnostic;
  }
  return null;
}

function createRoleCountMap(): Record<ProceduralMusicRole, number> {
  return {
    lead: 0,
    harmony: 0,
    bass: 0,
    percussion: 0,
  };
}

function normalizePitchClass(semitone: number): number {
  return ((Math.round(semitone) % 12) + 12) % 12;
}
