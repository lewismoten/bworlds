import type { ProceduralMusicNote } from './procedural-music.ts';
import { isProceduralSemitoneInMode } from './procedural-music-scale.ts';

type ProceduralMusicRole = ProceduralMusicNote['role'];

export type MusicDebugAccidentalReason =
  | 'percussion'
  | 'in-mode'
  | 'lower-approach'
  | 'upper-approach'
  | 'unresolved-chromatic';

export type MusicDebugNotePitchDiagnostic = {
  noteIndex: number;
  role: ProceduralMusicRole;
  frequency: number;
  midiNote: number | null;
  relativeSemitones: number | null;
  scaleDegree: number | null;
  scaleDegreeLabel: string | null;
  isBlackKey: boolean | null;
  inMode: boolean;
  accidentalReason: MusicDebugAccidentalReason;
  accidentalRuleLabel: string | null;
  accidentalExplanation: string | null;
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
  accidentalReasonCounts: Record<MusicDebugAccidentalReason, number>;
  blackKeyNoteCount: number;
  blackKeyNotesByRole: Record<ProceduralMusicRole, number>;
  pitchClassCountsByRole: Record<
    ProceduralMusicRole,
    Partial<Record<MusicDebugPitchClassLabel, number>>
  >;
  dominantPitchClassesByRole: Record<
    ProceduralMusicRole,
    readonly MusicDebugPitchClassLabel[]
  >;
  unexplainedAccidentalCount: number;
  budget: MusicDebugAccidentalBudget;
  isValidForMidiExport: boolean;
  messages: string[];
};

export type MusicDebugPitchClassLabel =
  'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

const MUSIC_DEBUG_PITCH_CLASS_LABELS: readonly MusicDebugPitchClassLabel[] = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

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
    const accidentalReason = resolveAccidentalReason(
      notePitchDiagnostics,
      index
    );
    diagnostic.accidentalReason = accidentalReason;
    diagnostic.accidentalRuleLabel =
      describeMusicDebugAccidentalReason(accidentalReason);
    diagnostic.accidentalExplanation =
      explainMusicDebugAccidentalReason(accidentalReason);
  }
  const accidentalsByRole = createRoleCountMap();
  const outOfModeNotesByRole = createRoleCountMap();
  const blackKeyNotesByRole = createRoleCountMap();
  const accidentalReasonCounts = createAccidentalReasonCountMap();
  const pitchClassCountsByRole = createPitchClassCountMapByRole();
  let accidentalNoteCount = 0;
  let blackKeyNoteCount = 0;
  let unexplainedAccidentalCount = 0;

  for (let index = 0; index < notePitchDiagnostics.length; index += 1) {
    const diagnostic = notePitchDiagnostics[index]!;
    if (diagnostic.role === 'percussion') {
      continue;
    }
    if (diagnostic.midiNote !== null) {
      const pitchClassLabel = resolvePitchClassLabel(diagnostic.midiNote);
      const currentPitchClassCount =
        pitchClassCountsByRole[diagnostic.role][pitchClassLabel] ?? 0;
      pitchClassCountsByRole[diagnostic.role][pitchClassLabel] =
        currentPitchClassCount + 1;
    }
    if (diagnostic.isBlackKey) {
      blackKeyNoteCount += 1;
      blackKeyNotesByRole[diagnostic.role] += 1;
    }
    if (!diagnostic.inMode) {
      accidentalNoteCount += 1;
      accidentalsByRole[diagnostic.role] += 1;
      outOfModeNotesByRole[diagnostic.role] += 1;
      accidentalReasonCounts[diagnostic.accidentalReason] += 1;
      if (diagnostic.accidentalReason === 'unresolved-chromatic') {
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
    accidentalReasonCounts,
    blackKeyNoteCount,
    blackKeyNotesByRole,
    pitchClassCountsByRole,
    dominantPitchClassesByRole: resolveDominantPitchClassesByRole(
      pitchClassCountsByRole
    ),
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
      maxUnexplainedAccidentals: 0,
    };
  }
  if ((options.encounterMode ?? 'ambient') === 'ambient') {
    return {
      maxExplainedAccidentals: 10,
      maxUnexplainedAccidentals: 0,
    };
  }
  return {
    maxExplainedAccidentals: 12,
    maxUnexplainedAccidentals: 0,
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
      isBlackKey: null,
      inMode: true,
      accidentalReason: 'percussion',
      accidentalRuleLabel: null,
      accidentalExplanation: null,
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
  const accidentalReason = inMode ? 'in-mode' : 'unresolved-chromatic';

  return {
    noteIndex: options.noteIndex,
    role: note.role,
    frequency: note.frequency,
    midiNote,
    relativeSemitones,
    scaleDegree,
    scaleDegreeLabel:
      scaleDegree === null ? null : `degree ${((scaleDegree - 1) % 7) + 1}`,
    isBlackKey: isBlackKeyMidiNote(midiNote),
    inMode,
    accidentalReason,
    accidentalRuleLabel: describeMusicDebugAccidentalReason(accidentalReason),
    accidentalExplanation: explainMusicDebugAccidentalReason(accidentalReason),
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
): MusicDebugAccidentalReason {
  const current = diagnostics[noteIndex];
  if (!current) {
    return 'unresolved-chromatic';
  }
  const neighbor = findNextNoteForRole(diagnostics, noteIndex, current.role);
  if (
    neighbor &&
    neighbor.relativeSemitones !== null &&
    neighbor.inMode &&
    current.relativeSemitones !== null &&
    Math.abs(neighbor.relativeSemitones - current.relativeSemitones) === 1
  ) {
    return current.relativeSemitones < neighbor.relativeSemitones
      ? 'lower-approach'
      : 'upper-approach';
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
    return current.relativeSemitones < previous.relativeSemitones
      ? 'lower-approach'
      : 'upper-approach';
  }
  return 'unresolved-chromatic';
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

function createAccidentalReasonCountMap(): Record<
  MusicDebugAccidentalReason,
  number
> {
  return {
    percussion: 0,
    'in-mode': 0,
    'lower-approach': 0,
    'upper-approach': 0,
    'unresolved-chromatic': 0,
  };
}

export function describeMusicDebugAccidentalReason(
  reason: MusicDebugAccidentalReason
): string | null {
  switch (reason) {
    case 'lower-approach':
      return 'Lower chromatic approach';
    case 'upper-approach':
      return 'Upper chromatic approach';
    case 'unresolved-chromatic':
      return 'Unresolved chromatic note';
    case 'in-mode':
      return 'In mode';
    case 'percussion':
      return null;
  }
}

export function explainMusicDebugAccidentalReason(
  reason: MusicDebugAccidentalReason
): string | null {
  switch (reason) {
    case 'lower-approach':
      return 'One semitone below a nearby in-mode target and resolved by step.';
    case 'upper-approach':
      return 'One semitone above a nearby in-mode target and resolved by step.';
    case 'unresolved-chromatic':
      return 'Outside the current mode without a one-step resolution rule.';
    case 'in-mode':
      return 'Inside the active mode.';
    case 'percussion':
      return null;
  }
}

function isBlackKeyMidiNote(midiNote: number): boolean {
  return [1, 3, 6, 8, 10].includes(((midiNote % 12) + 12) % 12);
}

function createPitchClassCountMapByRole(): Record<
  ProceduralMusicRole,
  Partial<Record<MusicDebugPitchClassLabel, number>>
> {
  return {
    lead: {},
    harmony: {},
    bass: {},
    percussion: {},
  };
}

function resolveDominantPitchClassesByRole(
  pitchClassCountsByRole: Record<
    ProceduralMusicRole,
    Partial<Record<MusicDebugPitchClassLabel, number>>
  >
): Record<ProceduralMusicRole, readonly MusicDebugPitchClassLabel[]> {
  return {
    lead: resolveDominantPitchClasses(pitchClassCountsByRole.lead),
    harmony: resolveDominantPitchClasses(pitchClassCountsByRole.harmony),
    bass: resolveDominantPitchClasses(pitchClassCountsByRole.bass),
    percussion: resolveDominantPitchClasses(pitchClassCountsByRole.percussion),
  };
}

function resolveDominantPitchClasses(
  pitchClassCounts: Partial<Record<MusicDebugPitchClassLabel, number>>
): readonly MusicDebugPitchClassLabel[] {
  const rankedPitchClasses = MUSIC_DEBUG_PITCH_CLASS_LABELS.map((label) => ({
    label,
    count: pitchClassCounts[label] ?? 0,
  }))
    .filter((entry) => entry.count > 0)
    .sort(
      (left, right) =>
        right.count - left.count || left.label.localeCompare(right.label)
    );
  const topCount = rankedPitchClasses[0]?.count ?? 0;
  if (topCount <= 0) {
    return [];
  }
  return rankedPitchClasses
    .filter((entry) => entry.count === topCount)
    .map((entry) => entry.label);
}

function resolvePitchClassLabel(midiNote: number): MusicDebugPitchClassLabel {
  return (
    MUSIC_DEBUG_PITCH_CLASS_LABELS[((midiNote % 12) + 12) % 12] ??
    MUSIC_DEBUG_PITCH_CLASS_LABELS[0]
  );
}

function normalizePitchClass(semitone: number): number {
  return ((Math.round(semitone) % 12) + 12) % 12;
}
