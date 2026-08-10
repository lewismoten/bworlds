import type { MusicDebugNotePitchDiagnostic } from './music-debug-note-analysis.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

type ProceduralMusicRole = ProceduralMusicNote['role'];

export type MusicDebugIntervalCount = {
  intervalSemitones: number;
  count: number;
};

export type MusicDebugIntervalComparison = {
  role: ProceduralMusicRole;
  intendedIntervals: readonly number[];
  actualIntervalCounts: readonly MusicDebugIntervalCount[];
  preferredIntervalCounts: readonly MusicDebugIntervalCount[];
  totalIntervalCount: number;
  preferredMatchCount: number;
  preferredMatchPercentage: number;
};

export function createMusicDebugIntervalComparison(options: {
  notes: readonly ProceduralMusicNote[];
  diagnostics: readonly MusicDebugNotePitchDiagnostic[];
  preferredIntervals: readonly number[];
  role?: ProceduralMusicRole;
}): MusicDebugIntervalComparison {
  const role = options.role ?? 'lead';
  const intervalCounts = new Map<number, number>();
  let previousMidiNote: number | null = null;
  let totalIntervalCount = 0;
  let preferredMatchCount = 0;

  for (
    let noteIndex = 0;
    noteIndex < options.notes.length && noteIndex < options.diagnostics.length;
    noteIndex += 1
  ) {
    const note = options.notes[noteIndex]!;
    const diagnostic = options.diagnostics[noteIndex]!;
    if (note.role !== role || diagnostic.midiNote === null) {
      continue;
    }

    if (previousMidiNote !== null) {
      const intervalSemitones = Math.abs(
        diagnostic.midiNote - previousMidiNote
      );
      intervalCounts.set(
        intervalSemitones,
        (intervalCounts.get(intervalSemitones) ?? 0) + 1
      );
      totalIntervalCount += 1;
      if (options.preferredIntervals.includes(intervalSemitones)) {
        preferredMatchCount += 1;
      }
    }

    previousMidiNote = diagnostic.midiNote;
  }

  const actualIntervalCounts = [...intervalCounts.entries()]
    .map(([intervalSemitones, count]) => ({ intervalSemitones, count }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.intervalSemitones - right.intervalSemitones
    );
  const preferredSet = new Set(options.preferredIntervals);
  const preferredIntervalCounts = actualIntervalCounts.filter((entry) =>
    preferredSet.has(entry.intervalSemitones)
  );

  return {
    role,
    intendedIntervals: [...new Set(options.preferredIntervals)].sort(
      (left, right) => left - right
    ),
    actualIntervalCounts,
    preferredIntervalCounts,
    totalIntervalCount,
    preferredMatchCount,
    preferredMatchPercentage:
      totalIntervalCount > 0
        ? (preferredMatchCount / totalIntervalCount) * 100
        : 0,
  };
}

export function formatMusicDebugIntervalComparison(
  comparison: MusicDebugIntervalComparison
): string {
  if (comparison.totalIntervalCount === 0) {
    return `${formatRoleLabel(comparison.role)} none`;
  }

  const actualIntervals =
    comparison.actualIntervalCounts.length > 0
      ? comparison.actualIntervalCounts
          .map((entry) => `${entry.intervalSemitones}x${entry.count}`)
          .join(', ')
      : 'none';

  return `${formatRoleLabel(comparison.role)} prefer ${comparison.intendedIntervals.join(', ')} st | matched ${comparison.preferredMatchCount}/${comparison.totalIntervalCount} (${Math.round(comparison.preferredMatchPercentage)}%) | actual ${actualIntervals}`;
}

function formatRoleLabel(role: ProceduralMusicRole): string {
  return role[0]?.toUpperCase() + role.slice(1);
}
