import {
  createMusicDebugBassProgressionDetections,
  createMusicDebugHarmonyChordDetections,
} from './music-debug-section-analysis.ts';
import { createMusicDebugLeadContourAnalysis } from './music-debug-lead-contour.ts';
import { analyzeMusicDebugPitches } from './music-debug-note-analysis.ts';
import { validateMusicDebugCadences } from './music-debug-cadence-validation.ts';
import { resolveProceduralChordTimeline } from './procedural-music-chord-timeline.ts';
import { PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT } from './procedural-music-song-phrase.ts';
import { collectProceduralMusicPhraseNotes } from './procedural-music-song-phrase.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';
import {
  resolveMusicTheme,
  type MusicUpdateOptions,
  type ProceduralMusicNote,
} from './procedural-music.ts';

export function regenerateProceduralMusicSongPhrases(
  notes: readonly ProceduralMusicNote[],
  options: {
    affectedPhraseIndexes: ReadonlySet<number>;
    music: MusicUpdateOptions;
    phraseDurationMs: number;
    songStartMs: number;
    songDurationMs: number;
  }
): ProceduralMusicNote[] {
  if (options.affectedPhraseIndexes.size === 0) {
    return [...notes];
  }

  const repairedNotes = notes.filter((note) => {
    const phraseIndex = resolvePhraseIndexForStartMs(
      note.startMs,
      options.songStartMs,
      options.phraseDurationMs
    );
    return !options.affectedPhraseIndexes.has(phraseIndex);
  });
  const songEndMs = options.songStartMs + options.songDurationMs;

  for (const phraseIndex of options.affectedPhraseIndexes) {
    const phraseStartMs =
      options.songStartMs + phraseIndex * Math.max(1, options.phraseDurationMs);
    if (phraseStartMs >= songEndMs) {
      continue;
    }
    const phraseEndMs = Math.min(
      songEndMs,
      phraseStartMs + Math.max(1, options.phraseDurationMs)
    );
    const regeneratedPhrase = collectProceduralMusicPhraseNotes(
      {
        ...options.music,
        nowMs: phraseStartMs,
      },
      options.phraseDurationMs
    )
      .filter(
        (note) => note.startMs >= phraseStartMs && note.startMs < phraseEndMs
      )
      .map((note) => ({
        ...note,
        durationMs: Math.min(note.durationMs, Math.max(1, phraseEndMs - note.startMs)),
      }));

    repairedNotes.push(...regeneratedPhrase);
  }

  repairedNotes.sort((left, right) => {
    if (left.startMs !== right.startMs) {
      return left.startMs - right.startMs;
    }
    return left.durationMs - right.durationMs;
  });
  return repairedNotes;
}

export function collectCriticalFailurePhraseIndexes(options: {
  notes: readonly ProceduralMusicNote[];
  sections: readonly ProceduralMusicSongSection[];
  phraseDurationMs: number;
  songStartMs: number;
  music: MusicUpdateOptions;
}): Set<number> {
  const affectedPhraseIndexes = new Set<number>();
  const theme = resolveMusicTheme(
    options.music.tileKind,
    options.music.contextType,
    undefined,
    options.music.clusterX ?? 0,
    options.music.clusterY ?? 0
  );
  const diagnostics = analyzeMusicDebugPitches({
    notes: options.notes,
    rootHz: theme.rootHz,
    modePitchOffsets: theme.scale,
    encounterMode: options.music.encounterMode,
    themeId: theme.id,
  }).notePitchDiagnostics;
  const chordTimeline = resolveProceduralChordTimeline({
    themeId: theme.id,
    themeStepCount: theme.stepPattern.length,
    clusterX: options.music.clusterX,
    clusterY: options.music.clusterY,
  });
  const harmonyDetections = createMusicDebugHarmonyChordDetections({
    notes: options.notes,
    notePitchDiagnostics: diagnostics,
    sections: options.sections,
    scale: theme.scale,
    rootMidiNote: theme.rootMidiNote,
    chordTimeline,
  });
  const bassDetections = createMusicDebugBassProgressionDetections({
    notes: options.notes,
    notePitchDiagnostics: diagnostics,
    sections: options.sections,
    scale: theme.scale,
    rootMidiNote: theme.rootMidiNote,
    chordTimeline,
  });
  const cadenceValidation = validateMusicDebugCadences({
    notes: options.notes,
    sections: options.sections,
    songStartMs: options.songStartMs,
    rootMidiNote: theme.rootMidiNote,
    scale: theme.scale,
  });
  const leadContourAnalysis = createMusicDebugLeadContourAnalysis({
    theme,
    clusterX: options.music.clusterX ?? 0,
    clusterY: options.music.clusterY ?? 0,
    songStartMs: options.songStartMs,
    sections: options.sections,
    notes: options.notes,
    diagnostics,
  });

  for (const detection of harmonyDetections) {
    if (!requiresStrictProgressionAudit(detection.sectionId)) {
      continue;
    }
    for (const window of detection.driftWindows) {
      addMeasureRangeToPhraseSet(
        affectedPhraseIndexes,
        window.startMeasure,
        window.endMeasure
      );
    }
  }

  for (const detection of bassDetections) {
    if (!requiresStrictProgressionAudit(detection.sectionId)) {
      continue;
    }
    for (const window of detection.driftWindows) {
      addMeasureRangeToPhraseSet(
        affectedPhraseIndexes,
        window.startMeasure,
        window.endMeasure
      );
    }
  }

  for (const detection of cadenceValidation.detections) {
    if (!detection.matchesCadenceTarget || !detection.matchesHarmony) {
      addMeasureRangeToPhraseSet(
        affectedPhraseIndexes,
        detection.measureNumber,
        detection.measureNumber
      );
    }
  }

  for (const point of leadContourAnalysis.points) {
    if (point.withinPlannedRange === false) {
      addMeasureRangeToPhraseSet(
        affectedPhraseIndexes,
        point.songMeasure,
        point.songMeasure
      );
    }
  }

  if (!leadContourAnalysis.climaxNearPlannedPeak) {
    const actualClimaxPoint = leadContourAnalysis.points.find(
      (point) => point.stepIndex === leadContourAnalysis.actualClimaxStepIndex
    );
    addMeasureRangeToPhraseSet(
      affectedPhraseIndexes,
      actualClimaxPoint?.songMeasure ?? null,
      actualClimaxPoint?.songMeasure ?? null
    );
  }

  if (!leadContourAnalysis.finalResolvesToTonic) {
    const finalPoint = [...leadContourAnalysis.points]
      .reverse()
      .find((point) => point.actualScaleDegree !== null);
    addMeasureRangeToPhraseSet(
      affectedPhraseIndexes,
      finalPoint?.songMeasure ?? null,
      finalPoint?.songMeasure ?? null
    );
  }

  return affectedPhraseIndexes;
}

function addMeasureRangeToPhraseSet(
  phraseIndexes: Set<number>,
  startMeasure: number | null,
  endMeasure: number | null
): void {
  if (startMeasure === null || endMeasure === null) {
    return;
  }

  const normalizedStart = Math.max(1, Math.min(startMeasure, endMeasure));
  const normalizedEnd = Math.max(startMeasure, endMeasure);
  for (
    let measureNumber = normalizedStart;
    measureNumber <= normalizedEnd;
    measureNumber += 1
  ) {
    phraseIndexes.add(
      Math.floor((measureNumber - 1) / PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT)
    );
  }
}

function resolvePhraseIndexForStartMs(
  startMs: number,
  songStartMs: number,
  phraseDurationMs: number
): number {
  return Math.max(
    0,
    Math.floor((startMs - songStartMs) / Math.max(1, phraseDurationMs))
  );
}

function requiresStrictProgressionAudit(sectionId: string): boolean {
  return (
    sectionId === 'intro' ||
    sectionId === 'a' ||
    sectionId === 'return' ||
    sectionId === 'outro'
  );
}
