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
};

export function createMusicDebugTrackStats(options: {
  notes: readonly ProceduralMusicNote[];
  diagnostics: readonly MusicDebugNotePitchDiagnostic[];
}): Record<ProceduralMusicRole, MusicDebugTrackStats> {
  const stats = createEmptyTrackStatsMap();
  const previousMidiByRole: Partial<Record<ProceduralMusicRole, number>> = {};
  const leapTotalsByRole: Partial<Record<ProceduralMusicRole, number>> = {};
  const leapCountsByRole: Partial<Record<ProceduralMusicRole, number>> = {};
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
    if (!diagnostic.inMode && diagnostic.role !== 'percussion') {
      stat.outOfModeNoteCount += 1;
    }
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
    stat.averageLeapSemitones =
      leapCount > 0 ? (leapTotalsByRole[role] ?? 0) / leapCount : 0;
    stat.rangeLabel =
      role === 'percussion'
        ? 'percussion'
        : formatMusicDebugMidiRange(minMidiByRole[role], maxMidiByRole[role]);
  }

  return stats;
}

export function formatMusicDebugTrackStatsSummary(
  stats: Record<ProceduralMusicRole, MusicDebugTrackStats>,
  formatter = formatMusicDebugRoleLabel
): string[] {
  return MUSIC_DEBUG_TRACK_ROLES.map((role) => {
    const stat = stats[role];
    return `${formatter(role)} ${stat.rangeLabel} | avg leap ${stat.averageLeapSemitones.toFixed(1)} st | max leap ${stat.maxLeapSemitones.toFixed(1)} st | out-of-mode ${stat.outOfModeNoteCount}`;
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
