import type { ProceduralMusicNote } from './procedural-music.ts';
import type { MusicDebugNotePitchDiagnostic } from './music-debug-note-analysis.ts';

type ProceduralMusicRole = ProceduralMusicNote['role'];

export type MusicDebugTrackStats = {
  role: ProceduralMusicRole;
  noteCount: number;
  outOfModeNoteCount: number;
  rangeLabel: string;
  averageLeapSemitones: number;
  maxLeapSemitones: number;
  averageDurationMs: number;
  averageSilenceMs: number;
  maxPolyphony: number;
};

export function createMusicDebugTrackStats(options: {
  notes: readonly ProceduralMusicNote[];
  diagnostics: readonly MusicDebugNotePitchDiagnostic[];
}): Record<ProceduralMusicRole, MusicDebugTrackStats> {
  const stats = createEmptyTrackStatsMap();
  const previousMidiByRole: Partial<Record<ProceduralMusicRole, number>> = {};
  const previousEndMsByRole: Partial<Record<ProceduralMusicRole, number>> = {};
  const leapTotalsByRole: Partial<Record<ProceduralMusicRole, number>> = {};
  const leapCountsByRole: Partial<Record<ProceduralMusicRole, number>> = {};
  const durationTotalsByRole: Partial<Record<ProceduralMusicRole, number>> = {};
  const silenceTotalsByRole: Partial<Record<ProceduralMusicRole, number>> = {};
  const silenceCountsByRole: Partial<Record<ProceduralMusicRole, number>> = {};
  const minMidiByRole: Partial<Record<ProceduralMusicRole, number>> = {};
  const maxMidiByRole: Partial<Record<ProceduralMusicRole, number>> = {};

  for (
    let noteIndex = 0;
    noteIndex < options.notes.length && noteIndex < options.diagnostics.length;
    noteIndex += 1
  ) {
    const note = options.notes[noteIndex]!;
    const diagnostic = options.diagnostics[noteIndex]!;
    const stat = stats[note.role];
    stat.noteCount += 1;
    durationTotalsByRole[note.role] =
      (durationTotalsByRole[note.role] ?? 0) + note.durationMs;
    if (!diagnostic.inMode && diagnostic.role !== 'percussion') {
      stat.outOfModeNoteCount += 1;
    }
    const previousEndMs = previousEndMsByRole[note.role];
    if (previousEndMs !== undefined) {
      const silenceMs = Math.max(0, note.startMs - previousEndMs);
      silenceTotalsByRole[note.role] =
        (silenceTotalsByRole[note.role] ?? 0) + silenceMs;
      silenceCountsByRole[note.role] =
        (silenceCountsByRole[note.role] ?? 0) + 1;
    }
    previousEndMsByRole[note.role] = Math.max(
      previousEndMs ?? 0,
      note.startMs + note.durationMs
    );
    if (diagnostic.midiNote === null) {
      continue;
    }

    const minMidi = minMidiByRole[note.role];
    minMidiByRole[note.role] =
      minMidi === undefined
        ? diagnostic.midiNote
        : Math.min(minMidi, diagnostic.midiNote);
    const maxMidi = maxMidiByRole[note.role];
    maxMidiByRole[note.role] =
      maxMidi === undefined
        ? diagnostic.midiNote
        : Math.max(maxMidi, diagnostic.midiNote);

    const previousMidi = previousMidiByRole[note.role];
    if (previousMidi !== undefined) {
      const leapSemitones = Math.abs(diagnostic.midiNote - previousMidi);
      leapTotalsByRole[note.role] =
        (leapTotalsByRole[note.role] ?? 0) + leapSemitones;
      leapCountsByRole[note.role] = (leapCountsByRole[note.role] ?? 0) + 1;
      stat.maxLeapSemitones = Math.max(stat.maxLeapSemitones, leapSemitones);
    }
    previousMidiByRole[note.role] = diagnostic.midiNote;
  }

  for (const role of MUSIC_DEBUG_TRACK_ROLES) {
    const stat = stats[role];
    const leapCount = leapCountsByRole[role] ?? 0;
    const silenceCount = silenceCountsByRole[role] ?? 0;
    stat.averageLeapSemitones =
      leapCount > 0 ? (leapTotalsByRole[role] ?? 0) / leapCount : 0;
    stat.averageDurationMs =
      stat.noteCount > 0
        ? (durationTotalsByRole[role] ?? 0) / stat.noteCount
        : 0;
    stat.averageSilenceMs =
      silenceCount > 0 ? (silenceTotalsByRole[role] ?? 0) / silenceCount : 0;
    stat.rangeLabel =
      role === 'percussion'
        ? 'percussion'
        : formatMusicDebugMidiRange(minMidiByRole[role], maxMidiByRole[role]);
    stat.maxPolyphony = resolveMusicDebugRoleMaxPolyphony(options.notes, role);
  }

  return stats;
}

export function formatMusicDebugTrackPitchSummary(
  stats: Record<ProceduralMusicRole, MusicDebugTrackStats>,
  formatter = formatMusicDebugRoleLabel
): string[] {
  return MUSIC_DEBUG_TRACK_ROLES.map((role) => {
    const stat = stats[role];
    return `${formatter(role)} ${stat.rangeLabel} | avg leap ${stat.averageLeapSemitones.toFixed(1)} st | max leap ${stat.maxLeapSemitones.toFixed(1)} st | out-of-mode ${stat.outOfModeNoteCount}`;
  });
}

export function formatMusicDebugTrackTimingSummary(
  stats: Record<ProceduralMusicRole, MusicDebugTrackStats>,
  formatter = formatMusicDebugRoleLabel
): string[] {
  return MUSIC_DEBUG_TRACK_ROLES.map((role) => {
    const stat = stats[role];
    return `${formatter(role)} avg dur ${Math.round(stat.averageDurationMs)} ms | avg gap ${Math.round(stat.averageSilenceMs)} ms | peak poly ${stat.maxPolyphony}`;
  });
}

const MUSIC_DEBUG_TRACK_ROLES: readonly ProceduralMusicRole[] = [
  'bass',
  'harmony',
  'lead',
  'percussion',
];

function createEmptyTrackStatsMap(): Record<
  ProceduralMusicRole,
  MusicDebugTrackStats
> {
  return {
    lead: createEmptyTrackStats('lead'),
    harmony: createEmptyTrackStats('harmony'),
    bass: createEmptyTrackStats('bass'),
    percussion: createEmptyTrackStats('percussion'),
  };
}

function createEmptyTrackStats(
  role: ProceduralMusicRole
): MusicDebugTrackStats {
  return {
    role,
    noteCount: 0,
    outOfModeNoteCount: 0,
    rangeLabel: role === 'percussion' ? 'percussion' : 'n/a',
    averageLeapSemitones: 0,
    maxLeapSemitones: 0,
    averageDurationMs: 0,
    averageSilenceMs: 0,
    maxPolyphony: 0,
  };
}

function formatMusicDebugMidiRange(
  minMidiNote: number | undefined,
  maxMidiNote: number | undefined
): string {
  if (minMidiNote === undefined || maxMidiNote === undefined) {
    return 'n/a';
  }
  return `${formatMusicDebugMidiNote(minMidiNote)}-${formatMusicDebugMidiNote(maxMidiNote)}`;
}

function formatMusicDebugMidiNote(midiNote: number): string {
  const pitchClass = MUSIC_DEBUG_PITCH_CLASS_NAMES[mod(midiNote, 12)] ?? 'C';
  const octave = Math.floor(midiNote / 12) - 1;
  return `${pitchClass}${octave}`;
}

function formatMusicDebugRoleLabel(role: ProceduralMusicRole): string {
  switch (role) {
    case 'bass':
      return 'Bass';
    case 'harmony':
      return 'Harmony';
    case 'lead':
      return 'Lead';
    case 'percussion':
      return 'Percussion';
    default:
      return role;
  }
}

function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function resolveMusicDebugRoleMaxPolyphony(
  notes: readonly ProceduralMusicNote[],
  role: ProceduralMusicRole
): number {
  const boundaries: Array<{ atMs: number; delta: number }> = [];
  for (const note of notes) {
    if (note.role !== role) {
      continue;
    }
    boundaries.push(
      { atMs: note.startMs, delta: 1 },
      { atMs: note.startMs + note.durationMs, delta: -1 }
    );
  }
  boundaries.sort((left, right) => {
    if (left.atMs === right.atMs) {
      return right.delta - left.delta;
    }
    return left.atMs - right.atMs;
  });

  let activeCount = 0;
  let maxPolyphony = 0;
  for (const boundary of boundaries) {
    activeCount += boundary.delta;
    maxPolyphony = Math.max(maxPolyphony, activeCount);
  }
  return maxPolyphony;
}

const MUSIC_DEBUG_PITCH_CLASS_NAMES = [
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
] as const;
