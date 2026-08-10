import type { ProceduralMusicNote } from './procedural-music.ts';
import { isProceduralSemitoneInMode } from './procedural-music-scale.ts';
import {
  createMusicDebugPitchClassCountMapByRole,
  MUSIC_DEBUG_PITCH_CLASS_LABELS,
  normalizeMusicDebugPitchClassSemitone,
  resolveMusicDebugPitchClassLabel,
  type MusicDebugPitchClassLabel,
} from './music-debug-pitch-class.ts';

type ProceduralMusicRole = ProceduralMusicNote['role'];

export type MusicDebugAccidentalReason =
  | 'percussion'
  | 'in-mode'
  | 'chromatic-passing'
  | 'harmonic-color'
  | 'lower-approach'
  | 'upper-approach'
  | 'unsupported-chromatic-leap'
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
  maxChromaticPassingAccidentals: number;
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
      options.notes,
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
  const pitchClassCountsByRole = createMusicDebugPitchClassCountMapByRole();
  let accidentalNoteCount = 0;
  let blackKeyNoteCount = 0;
  let unexplainedAccidentalCount = 0;

  for (let index = 0; index < notePitchDiagnostics.length; index += 1) {
    const diagnostic = notePitchDiagnostics[index]!;
    if (diagnostic.role === 'percussion') {
      continue;
    }
    if (diagnostic.midiNote !== null) {
      const pitchClassLabel = resolveMusicDebugPitchClassLabel(
        diagnostic.midiNote
      );
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
      if (isUnexplainedAccidentalReason(diagnostic.accidentalReason)) {
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
  const chromaticPassingCount = accidentalReasonCounts['chromatic-passing'];
  if (chromaticPassingCount > budget.maxChromaticPassingAccidentals) {
    messages.push(
      `Found ${chromaticPassingCount} chromatic passing notes; MIDI export allows ${budget.maxChromaticPassingAccidentals}.`
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
      maxChromaticPassingAccidentals: 2,
      maxUnexplainedAccidentals: 0,
    };
  }
  if ((options.encounterMode ?? 'ambient') === 'ambient') {
    return {
      maxExplainedAccidentals: 10,
      maxChromaticPassingAccidentals: 4,
      maxUnexplainedAccidentals: 0,
    };
  }
  return {
    maxExplainedAccidentals: 12,
    maxChromaticPassingAccidentals: 6,
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
  notes: readonly ProceduralMusicNote[],
  diagnostics: readonly MusicDebugNotePitchDiagnostic[],
  noteIndex: number
): MusicDebugAccidentalReason {
  const current = diagnostics[noteIndex];
  if (!current) {
    return 'unresolved-chromatic';
  }
  const previous = findPreviousNoteForRole(
    diagnostics,
    noteIndex,
    current.role
  );
  const neighbor = findNextNoteForRole(diagnostics, noteIndex, current.role);
  const harmonicallySupported = hasChromaticHarmonicSupport(
    notes,
    diagnostics,
    noteIndex
  );
  if (
    previous &&
    neighbor &&
    previous.inMode &&
    neighbor.inMode &&
    previous.relativeSemitones !== null &&
    current.relativeSemitones !== null &&
    neighbor.relativeSemitones !== null &&
    Math.abs(current.relativeSemitones - previous.relativeSemitones) === 1 &&
    Math.abs(neighbor.relativeSemitones - current.relativeSemitones) === 1 &&
    previous.relativeSemitones !== neighbor.relativeSemitones &&
    Math.sign(current.relativeSemitones - previous.relativeSemitones) ===
      Math.sign(neighbor.relativeSemitones - current.relativeSemitones)
  ) {
    return 'chromatic-passing';
  }
  if (hasUnsupportedChromaticLeap(previous, current, neighbor)) {
    return harmonicallySupported
      ? 'harmonic-color'
      : 'unsupported-chromatic-leap';
  }
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
  if (harmonicallySupported) {
    return 'harmonic-color';
  }
  return 'unresolved-chromatic';
}

function hasUnsupportedChromaticLeap(
  previous: MusicDebugNotePitchDiagnostic | null,
  current: MusicDebugNotePitchDiagnostic,
  next: MusicDebugNotePitchDiagnostic | null
): boolean {
  if (current.relativeSemitones === null) {
    return false;
  }

  const previousLeap =
    previous?.relativeSemitones === null ||
    previous?.relativeSemitones === undefined
      ? false
      : Math.abs(current.relativeSemitones - previous.relativeSemitones) > 1;
  const nextLeap =
    next?.relativeSemitones === null || next?.relativeSemitones === undefined
      ? false
      : Math.abs(next.relativeSemitones - current.relativeSemitones) > 1;

  return previousLeap || nextLeap;
}

function hasChromaticHarmonicSupport(
  notes: readonly ProceduralMusicNote[],
  diagnostics: readonly MusicDebugNotePitchDiagnostic[],
  noteIndex: number
): boolean {
  const current = diagnostics[noteIndex];
  const currentNote = notes[noteIndex];
  if (
    !current ||
    !currentNote ||
    current.midiNote === null ||
    current.role === 'percussion'
  ) {
    return false;
  }

  const currentPitchClass = normalizeMusicDebugPitchClassSemitone(
    current.midiNote
  );
  const currentEndMs = currentNote.startMs + currentNote.durationMs;

  for (let index = 0; index < diagnostics.length; index += 1) {
    if (index === noteIndex) {
      continue;
    }
    const supportingDiagnostic = diagnostics[index]!;
    const supportingNote = notes[index]!;
    if (
      supportingDiagnostic.role === 'percussion' ||
      supportingDiagnostic.role === current.role ||
      supportingDiagnostic.midiNote === null
    ) {
      continue;
    }
    if (
      !notesOverlap(
        currentNote.startMs,
        currentEndMs,
        supportingNote.startMs,
        supportingNote.startMs + supportingNote.durationMs
      )
    ) {
      continue;
    }
    if (
      normalizeMusicDebugPitchClassSemitone(supportingDiagnostic.midiNote) ===
      currentPitchClass
    ) {
      return true;
    }
  }

  return false;
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
    'chromatic-passing': 0,
    'harmonic-color': 0,
    'lower-approach': 0,
    'upper-approach': 0,
    'unsupported-chromatic-leap': 0,
    'unresolved-chromatic': 0,
  };
}

export function describeMusicDebugAccidentalReason(
  reason: MusicDebugAccidentalReason
): string | null {
  switch (reason) {
    case 'chromatic-passing':
      return 'Chromatic passing tone';
    case 'harmonic-color':
      return 'Harmonic color tone';
    case 'lower-approach':
      return 'Lower chromatic approach';
    case 'upper-approach':
      return 'Upper chromatic approach';
    case 'unsupported-chromatic-leap':
      return 'Unsupported chromatic leap';
    case 'unresolved-chromatic':
      return 'Unresolved chromatic note';
    case 'in-mode':
      return 'In mode';
    case 'percussion':
      return null;
  }
}

function explainMusicDebugAccidentalReason(
  reason: MusicDebugAccidentalReason
): string | null {
  switch (reason) {
    case 'chromatic-passing':
      return 'Between two in-mode notes and connected by one-step motion.';
    case 'harmonic-color':
      return 'Outside the mode, but reinforced by an overlapping pitched harmony.';
    case 'lower-approach':
      return 'One semitone below a nearby in-mode target and resolved by step.';
    case 'upper-approach':
      return 'One semitone above a nearby in-mode target and resolved by step.';
    case 'unsupported-chromatic-leap':
      return 'Outside the mode and reached or left by leap without harmonic support.';
    case 'unresolved-chromatic':
      return 'Outside the current mode without a one-step resolution rule.';
    case 'in-mode':
      return 'Inside the active mode.';
    case 'percussion':
      return null;
  }
}

function isUnexplainedAccidentalReason(
  reason: MusicDebugAccidentalReason
): boolean {
  return (
    reason === 'unresolved-chromatic' || reason === 'unsupported-chromatic-leap'
  );
}

function notesOverlap(
  startMs: number,
  endMs: number,
  otherStartMs: number,
  otherEndMs: number
): boolean {
  return startMs < otherEndMs && otherStartMs < endMs;
}

function isBlackKeyMidiNote(midiNote: number): boolean {
  return [1, 3, 6, 8, 10].includes(((midiNote % 12) + 12) % 12);
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

function normalizePitchClass(semitone: number): number {
  return normalizeMusicDebugPitchClassSemitone(semitone);
}
