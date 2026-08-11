import type { MusicDebugNotePitchDiagnostic } from './music-debug-note-analysis.ts';
import {
  getProceduralScaleDegreeSemitones,
} from './procedural-music-scale.ts';
import type { ProceduralChordTimelineEntry } from './procedural-music-chord-timeline.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

type ChordToneRole = Extract<ProceduralMusicNote['role'], 'bass' | 'harmony' | 'lead'>;

export type MusicDebugChordToneMeasureRoleScore = {
  noteCount: number;
  chordToneNoteCount: number;
  totalDurationMs: number;
  chordToneDurationMs: number;
  score: number | null;
};

export type MusicDebugChordToneMeasureScore = {
  measureNumber: number;
  plannedLabel: string;
  roles: Record<ChordToneRole, MusicDebugChordToneMeasureRoleScore>;
};

export type MusicDebugChordToneTrackScore = {
  noteCount: number;
  chordToneNoteCount: number;
  totalDurationMs: number;
  chordToneDurationMs: number;
  score: number | null;
  weakestMeasureNumber: number | null;
  weakestMeasureScore: number | null;
};

export type MusicDebugChordToneScores = {
  measures: MusicDebugChordToneMeasureScore[];
  tracks: Record<ChordToneRole, MusicDebugChordToneTrackScore>;
};

const CHORD_TONE_ROLES = ['bass', 'harmony', 'lead'] as const satisfies readonly ChordToneRole[];
const CHORD_TONE_DEGREE_OFFSETS = [0, 2, 4] as const;

export function createMusicDebugChordToneScores(options: {
  notes: readonly ProceduralMusicNote[];
  notePitchDiagnostics: readonly MusicDebugNotePitchDiagnostic[];
  sections: readonly ProceduralMusicSongSection[];
  scale: readonly number[];
  rootMidiNote: number;
  chordTimeline: readonly ProceduralChordTimelineEntry[];
}): MusicDebugChordToneScores {
  const measures = collectMeasureScores(options);
  const tracks = createEmptyTrackScores();

  for (const measure of measures) {
    for (const role of CHORD_TONE_ROLES) {
      const measureRole = measure.roles[role];
      const track = tracks[role];
      track.noteCount += measureRole.noteCount;
      track.chordToneNoteCount += measureRole.chordToneNoteCount;
      track.totalDurationMs += measureRole.totalDurationMs;
      track.chordToneDurationMs += measureRole.chordToneDurationMs;
      if (
        measureRole.score !== null &&
        (track.weakestMeasureScore === null ||
          measureRole.score < track.weakestMeasureScore)
      ) {
        track.weakestMeasureScore = measureRole.score;
        track.weakestMeasureNumber = measure.measureNumber;
      }
    }
  }

  for (const role of CHORD_TONE_ROLES) {
    const track = tracks[role];
    track.score =
      track.totalDurationMs > 0
        ? track.chordToneDurationMs / track.totalDurationMs
        : null;
  }

  return {
    measures,
    tracks,
  };
}

export function formatMusicDebugChordToneTrackScores(
  scores: MusicDebugChordToneScores
): string {
  return CHORD_TONE_ROLES.map((role) => {
    const track = scores.tracks[role];
    if (track.score === null) {
      return `${formatChordToneRoleLabel(role)} n/a`;
    }
    const summary = `${formatChordToneRoleLabel(role)} ${formatChordTonePercentage(track.score)}`;
    if (
      track.weakestMeasureNumber === null ||
      track.weakestMeasureScore === null
    ) {
      return summary;
    }
    return `${summary} (worst m${track.weakestMeasureNumber} ${formatChordTonePercentage(track.weakestMeasureScore)})`;
  }).join(' | ');
}

function collectMeasureScores(options: {
  notes: readonly ProceduralMusicNote[];
  notePitchDiagnostics: readonly MusicDebugNotePitchDiagnostic[];
  sections: readonly ProceduralMusicSongSection[];
  scale: readonly number[];
  rootMidiNote: number;
  chordTimeline: readonly ProceduralChordTimelineEntry[];
}): MusicDebugChordToneMeasureScore[] {
  const songStartMs = options.notes[0]?.startMs ?? 0;
  const measures: MusicDebugChordToneMeasureScore[] = [];

  for (const section of options.sections) {
    const sectionStartMs = songStartMs + section.startOffsetMs;
    const measureDurationMs =
      section.measureCount > 0
        ? section.durationMs / section.measureCount
        : section.durationMs;

    for (const window of collectSectionChordWindows(section, options.chordTimeline)) {
      const plannedLabel = createPlannedChordLabel(
        options.scale,
        options.rootMidiNote,
        window.degreeIndex
      );
      const chordToneScaleDegrees = createChordToneScaleDegreeSet(
        options.scale,
        window.degreeIndex
      );

      for (
        let sectionMeasure = window.sectionStartMeasure;
        sectionMeasure <= window.sectionEndMeasure;
        sectionMeasure += 1
      ) {
        const measureStartMs =
          sectionStartMs + (sectionMeasure - 1) * measureDurationMs;
        const measureEndMs = measureStartMs + measureDurationMs;
        const measureNumber = section.startMeasure + sectionMeasure - 1;
        const roles = createEmptyMeasureRoleScores();

        for (let index = 0; index < options.notes.length; index += 1) {
          const note = options.notes[index];
          const diagnostic = options.notePitchDiagnostics[index];
          if (!note || !diagnostic || !CHORD_TONE_ROLES.includes(note.role as ChordToneRole)) {
            continue;
          }

          const clippedDurationMs = resolveOverlapDurationMs(
            note.startMs,
            note.startMs + note.durationMs,
            measureStartMs,
            measureEndMs
          );
          if (clippedDurationMs <= 0) {
            continue;
          }

          const role = note.role as ChordToneRole;
          const roleScore = roles[role];
          roleScore.totalDurationMs += clippedDurationMs;
          if (note.startMs >= measureStartMs && note.startMs < measureEndMs) {
            roleScore.noteCount += 1;
          }

          if (
            diagnostic.scaleDegree !== null &&
            chordToneScaleDegrees.has(mod(diagnostic.scaleDegree - 1, options.scale.length))
          ) {
            roleScore.chordToneDurationMs += clippedDurationMs;
            if (note.startMs >= measureStartMs && note.startMs < measureEndMs) {
              roleScore.chordToneNoteCount += 1;
            }
          }
        }

        for (const role of CHORD_TONE_ROLES) {
          const roleScore = roles[role];
          roleScore.score =
            roleScore.totalDurationMs > 0
              ? roleScore.chordToneDurationMs / roleScore.totalDurationMs
              : null;
        }

        measures.push({
          measureNumber,
          plannedLabel,
          roles,
        });
      }
    }
  }

  return measures;
}

function createEmptyMeasureRoleScores(): Record<
  ChordToneRole,
  MusicDebugChordToneMeasureRoleScore
> {
  return {
    bass: createEmptyMeasureRoleScore(),
    harmony: createEmptyMeasureRoleScore(),
    lead: createEmptyMeasureRoleScore(),
  };
}

function createEmptyMeasureRoleScore(): MusicDebugChordToneMeasureRoleScore {
  return {
    noteCount: 0,
    chordToneNoteCount: 0,
    totalDurationMs: 0,
    chordToneDurationMs: 0,
    score: null,
  };
}

function createEmptyTrackScores(): Record<ChordToneRole, MusicDebugChordToneTrackScore> {
  return {
    bass: createEmptyTrackScore(),
    harmony: createEmptyTrackScore(),
    lead: createEmptyTrackScore(),
  };
}

function createEmptyTrackScore(): MusicDebugChordToneTrackScore {
  return {
    noteCount: 0,
    chordToneNoteCount: 0,
    totalDurationMs: 0,
    chordToneDurationMs: 0,
    score: null,
    weakestMeasureNumber: null,
    weakestMeasureScore: null,
  };
}

function collectSectionChordWindows(
  section: ProceduralMusicSongSection,
  chordTimeline: readonly ProceduralChordTimelineEntry[]
): Array<{
  degreeIndex: number;
  sectionStartMeasure: number;
  sectionEndMeasure: number;
}> {
  if (chordTimeline.length === 0) {
    return [];
  }

  const phraseMeasureCount = Math.max(
    1,
    ...chordTimeline.map((entry) => entry.endMeasure)
  );
  const windows: Array<{
    degreeIndex: number;
    sectionStartMeasure: number;
    sectionEndMeasure: number;
  }> = [];

  for (
    let measure = section.startMeasure;
    measure <= section.endMeasure;
    measure += 1
  ) {
    const normalizedMeasure = ((measure - 1) % phraseMeasureCount) + 1;
    const timelineEntry = chordTimeline.find(
      (entry) =>
        normalizedMeasure >= entry.startMeasure &&
        normalizedMeasure <= entry.endMeasure
    );
    if (!timelineEntry) {
      continue;
    }
    const sectionMeasure = measure - section.startMeasure + 1;
    const previous = windows[windows.length - 1];
    if (
      previous &&
      previous.degreeIndex === timelineEntry.degreeIndex &&
      previous.sectionEndMeasure === sectionMeasure - 1
    ) {
      previous.sectionEndMeasure = sectionMeasure;
      continue;
    }
    windows.push({
      degreeIndex: timelineEntry.degreeIndex,
      sectionStartMeasure: sectionMeasure,
      sectionEndMeasure: sectionMeasure,
    });
  }

  return windows;
}

function createChordToneScaleDegreeSet(
  scale: readonly number[],
  degreeIndex: number
): Set<number> {
  return new Set(
    CHORD_TONE_DEGREE_OFFSETS.map((offset) =>
      mod(degreeIndex + offset, Math.max(1, scale.length))
    )
  );
}

function createPlannedChordLabel(
  scale: readonly number[],
  rootMidiNote: number,
  degreeIndex: number
): string {
  return CHORD_TONE_DEGREE_OFFSETS.map((offset) =>
    resolvePitchClassLabel(
      rootMidiNote + getProceduralScaleDegreeSemitones(scale, degreeIndex + offset)
    )
  ).join('-');
}

function resolveOverlapDurationMs(
  noteStartMs: number,
  noteEndMs: number,
  windowStartMs: number,
  windowEndMs: number
): number {
  return Math.max(
    0,
    Math.min(noteEndMs, windowEndMs) - Math.max(noteStartMs, windowStartMs)
  );
}

function resolvePitchClassLabel(midiNote: number): string {
  return ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][
    mod(Math.round(midiNote), 12)
  ]!;
}

function mod(value: number, divisor: number): number {
  if (divisor <= 0) {
    return value;
  }
  return ((value % divisor) + divisor) % divisor;
}

function formatChordToneRoleLabel(role: ChordToneRole): string {
  if (role === 'lead') {
    return 'Melody';
  }
  return role[0]!.toUpperCase() + role.slice(1);
}

function formatChordTonePercentage(score: number): string {
  return `${Math.round(score * 100)}%`;
}
