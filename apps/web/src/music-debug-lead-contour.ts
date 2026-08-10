import type { MusicDebugNotePitchDiagnostic } from './music-debug-note-analysis.ts';
import {
  type ProceduralHarmonyTheme,
  resolveProceduralLeadContourTargetRange,
} from './procedural-music-harmony.ts';
import { PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT } from './procedural-music-phrase-structure.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

const LEAD_THEME_STEP_PHASES = new Set([2, 6]);
const LEAD_CONTOUR_SEMITONE_TOLERANCE = 2;

export type MusicDebugLeadContourPoint = {
  stepIndex: number;
  phraseMeasure: number;
  songMeasure: number;
  stage: string;
  cadence: string;
  plannedMinSemitones: number;
  plannedTargetSemitones: number;
  plannedMaxSemitones: number;
  actualRelativeSemitones: number | null;
  actualScaleDegree: number | null;
  actualStartMs: number | null;
  actualNoteLabel: string | null;
  withinPlannedRange: boolean | null;
};

export type MusicDebugLeadContourAnalysis = {
  points: MusicDebugLeadContourPoint[];
  inRangePointCount: number;
  outOfRangePointCount: number;
  missingPointCount: number;
  plannedClimaxStepIndex: number | null;
  actualClimaxStepIndex: number | null;
  climaxNearPlannedPeak: boolean;
  finalResolvesToTonic: boolean;
  matchesPlannedContour: boolean;
  messages: string[];
};

export function createMusicDebugLeadContourAnalysis(options: {
  theme: ProceduralHarmonyTheme;
  clusterX: number;
  clusterY: number;
  songStartMs: number;
  sections: readonly ProceduralMusicSongSection[];
  notes: readonly ProceduralMusicNote[];
  diagnostics: readonly MusicDebugNotePitchDiagnostic[];
}): MusicDebugLeadContourAnalysis {
  const sectionA = options.sections.find((section) => section.id === 'a');
  if (!sectionA) {
    return {
      points: [],
      inRangePointCount: 0,
      outOfRangePointCount: 0,
      missingPointCount: 0,
      plannedClimaxStepIndex: null,
      actualClimaxStepIndex: null,
      climaxNearPlannedPeak: false,
      finalResolvesToTonic: false,
      matchesPlannedContour: false,
      messages: ['Missing Section A for lead contour analysis.'],
    };
  }

  const phraseStartMs = options.songStartMs + sectionA.startOffsetMs;
  const phraseDurationMs = Math.max(1, Math.round(sectionA.durationMs / 2));
  const phraseEndMs = phraseStartMs + phraseDurationMs;
  const phraseStepCount =
    Math.max(1, options.theme.stepPattern.length) *
    PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT;
  const stepDurationMs = phraseDurationMs / phraseStepCount;
  const leadEntries = options.notes
    .map((note, index) => ({
      note,
      diagnostic: options.diagnostics[index] ?? null,
    }))
    .filter(
      (entry) =>
        entry.note.role === 'lead' &&
        entry.note.startMs >= phraseStartMs &&
        entry.note.startMs < phraseEndMs
    )
    .sort((left, right) => left.note.startMs - right.note.startMs);
  const points: MusicDebugLeadContourPoint[] = [];
  let leadEntryIndex = 0;

  for (let stepIndex = 0; stepIndex < phraseStepCount; stepIndex += 1) {
    if (!LEAD_THEME_STEP_PHASES.has(stepIndex % 8)) {
      continue;
    }
    const planned = resolveProceduralLeadContourTargetRange(
      options.theme,
      stepIndex,
      options.clusterX,
      options.clusterY
    );
    const bucketStartMs = phraseStartMs + stepIndex * stepDurationMs;
    const bucketEndMs = phraseStartMs + (stepIndex + 1) * stepDurationMs;

    while (
      leadEntries[leadEntryIndex] &&
      leadEntries[leadEntryIndex]!.note.startMs < bucketStartMs
    ) {
      leadEntryIndex += 1;
    }

    const matchedEntry =
      leadEntries[leadEntryIndex] &&
      leadEntries[leadEntryIndex]!.note.startMs < bucketEndMs
        ? leadEntries[leadEntryIndex++]!
        : null;
    const actualRelativeSemitones =
      matchedEntry?.diagnostic?.relativeSemitones ?? null;

    points.push({
      stepIndex,
      phraseMeasure:
        Math.floor(stepIndex / Math.max(1, options.theme.stepPattern.length)) +
        1,
      songMeasure:
        sectionA.startMeasure +
        Math.floor(stepIndex / Math.max(1, options.theme.stepPattern.length)),
      stage: planned.stage,
      cadence: planned.cadence,
      plannedMinSemitones: planned.minSemitones,
      plannedTargetSemitones: planned.targetSemitones,
      plannedMaxSemitones: planned.maxSemitones,
      actualRelativeSemitones,
      actualScaleDegree: matchedEntry?.diagnostic?.scaleDegree ?? null,
      actualStartMs: matchedEntry?.note.startMs ?? null,
      actualNoteLabel:
        matchedEntry?.diagnostic?.midiNote === null ||
        matchedEntry?.diagnostic?.midiNote === undefined
          ? null
          : formatMidiNoteLabel(matchedEntry.diagnostic.midiNote),
      withinPlannedRange:
        actualRelativeSemitones === null
          ? null
          : actualRelativeSemitones >=
              planned.minSemitones - LEAD_CONTOUR_SEMITONE_TOLERANCE &&
            actualRelativeSemitones <=
              planned.maxSemitones + LEAD_CONTOUR_SEMITONE_TOLERANCE,
    });
  }

  const inRangePointCount = points.filter(
    (point) => point.withinPlannedRange === true
  ).length;
  const outOfRangePointCount = points.filter(
    (point) => point.withinPlannedRange === false
  ).length;
  const missingPointCount = points.filter(
    (point) => point.withinPlannedRange === null
  ).length;
  const plannedClimaxStepIndex =
    points.find((point) => point.stage === 'climax')?.stepIndex ?? null;
  const actualClimaxPoint = [...points]
    .filter((point) => point.actualRelativeSemitones !== null)
    .sort((left, right) => {
      const leftSemitones =
        left.actualRelativeSemitones ?? Number.NEGATIVE_INFINITY;
      const rightSemitones =
        right.actualRelativeSemitones ?? Number.NEGATIVE_INFINITY;
      return rightSemitones - leftSemitones || left.stepIndex - right.stepIndex;
    })[0];
  const actualClimaxStepIndex = actualClimaxPoint?.stepIndex ?? null;
  const climaxNearPlannedPeak =
    plannedClimaxStepIndex !== null &&
    actualClimaxStepIndex !== null &&
    Math.abs(actualClimaxStepIndex - plannedClimaxStepIndex) <=
      Math.max(2, options.theme.stepPattern.length);
  const finalResolvedPoint = [...points]
    .reverse()
    .find((point) => point.actualScaleDegree !== null);
  const finalResolvesToTonic =
    finalResolvedPoint !== undefined &&
    finalResolvedPoint.actualScaleDegree !== null &&
    (((finalResolvedPoint.actualScaleDegree - 1) % 7) + 7) % 7 === 0;
  const matchesPlannedContour =
    inRangePointCount >= Math.max(1, outOfRangePointCount) &&
    finalResolvesToTonic;
  const messages: string[] = [];

  for (const point of points) {
    if (point.withinPlannedRange !== false) {
      continue;
    }
    messages.push(
      `Lead contour checkpoint at measure ${point.songMeasure} expected ${point.plannedMinSemitones}-${point.plannedMaxSemitones} semitones but observed ${point.actualNoteLabel ?? 'missing'}${point.actualRelativeSemitones === null ? '' : ` (${point.actualRelativeSemitones} semitones)`}.`
    );
  }
  if (!climaxNearPlannedPeak) {
    const plannedClimaxMeasure =
      points.find((point) => point.stepIndex === plannedClimaxStepIndex)
        ?.songMeasure ?? null;
    const actualClimaxMeasure = actualClimaxPoint?.songMeasure ?? null;
    messages.push(
      `Lead contour climax peaked at ${formatLeadContourMeasureAndNote(actualClimaxMeasure, actualClimaxPoint?.actualNoteLabel ?? null)} instead of the planned peak near measure ${plannedClimaxMeasure ?? 'unknown'}.`
    );
  }
  if (!finalResolvesToTonic) {
    messages.push(
      `Lead contour ending at ${formatLeadContourMeasureAndNote(finalResolvedPoint?.songMeasure ?? null, finalResolvedPoint?.actualNoteLabel ?? null)} resolved to scale degree ${finalResolvedPoint?.actualScaleDegree ?? 'unknown'} instead of tonic.`
    );
  }

  return {
    points,
    inRangePointCount,
    outOfRangePointCount,
    missingPointCount,
    plannedClimaxStepIndex,
    actualClimaxStepIndex,
    climaxNearPlannedPeak,
    finalResolvesToTonic,
    matchesPlannedContour,
    messages,
  };
}

function formatLeadContourMeasureAndNote(
  measure: number | null,
  noteLabel: string | null
): string {
  const measureLabel = measure === null ? 'an unknown measure' : `measure ${measure}`;
  return noteLabel === null ? measureLabel : `${measureLabel} on ${noteLabel}`;
}

function formatMidiNoteLabel(midiNote: number): string {
  const pitchClass = mod(midiNote, 12);
  const pitchLabel =
    ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][
      pitchClass
    ] ?? 'C';
  const octave = Math.floor(midiNote / 12) - 1;
  return `${pitchLabel}${octave}`;
}

function mod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}
