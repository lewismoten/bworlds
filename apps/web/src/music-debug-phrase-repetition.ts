import type { MusicDebugNotePitchDiagnostic } from './music-debug-note-analysis.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';
import { PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT } from './procedural-music-phrase-structure.ts';

type ProceduralMusicRole = ProceduralMusicNote['role'];

type MusicDebugPhraseSignatureNote = {
  offsetRatio: number;
  durationRatio: number;
  scaleDegree: number | null;
};

export type MusicDebugPhraseRepetitionEntry = {
  phraseIndex: number;
  phraseLabel: string;
  sectionId: string;
  sectionLabel: string;
  leadAttackCount: number;
  exactMatchPhraseIndex: number | null;
  strongestSimilarPhraseIndex: number | null;
  strongestSimilarityPercentage: number;
};

export type MusicDebugPhraseRepetitionAnalysis = {
  phraseCount: number;
  repeatedPhraseCount: number;
  similarPhraseCount: number;
  averageSimilarityPercentage: number;
  strongestPair: {
    sourcePhraseIndex: number;
    targetPhraseIndex: number;
    similarityPercentage: number;
  } | null;
  phrases: MusicDebugPhraseRepetitionEntry[];
};

export function createMusicDebugPhraseRepetitionAnalysis(options: {
  notes: readonly ProceduralMusicNote[];
  notePitchDiagnostics: readonly MusicDebugNotePitchDiagnostic[];
  sections: readonly ProceduralMusicSongSection[];
  songDurationMs: number;
  role?: ProceduralMusicRole;
}): MusicDebugPhraseRepetitionAnalysis {
  const role = options.role ?? 'lead';
  const totalMeasures = Math.max(
    1,
    options.sections.reduce((sum, section) => sum + section.measureCount, 0)
  );
  const phraseCount = Math.max(
    1,
    Math.ceil(totalMeasures / PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT)
  );
  const phraseDurationMs = Math.max(1, options.songDurationMs / phraseCount);
  const songStartMs = options.notes[0]?.startMs ?? 0;
  const signatures = Array.from({ length: phraseCount }, (_, phraseIndex) =>
    collectPhraseSignature({
      notes: options.notes,
      diagnostics: options.notePitchDiagnostics,
      role,
      songStartMs,
      phraseIndex,
      phraseDurationMs,
    })
  );
  const phrases: MusicDebugPhraseRepetitionEntry[] = [];
  let strongestPair: MusicDebugPhraseRepetitionAnalysis['strongestPair'] = null;
  let repeatedPhraseCount = 0;
  let similarPhraseCount = 0;
  let similarityTotal = 0;
  let similarityCount = 0;

  for (let phraseIndex = 0; phraseIndex < phraseCount; phraseIndex += 1) {
    const signature = signatures[phraseIndex]!;
    const phraseSection =
      findPhraseSection(options.sections, phraseIndex) ?? options.sections[0];
    let exactMatchPhraseIndex: number | null = null;
    let strongestSimilarPhraseIndex: number | null = null;
    let strongestSimilarityPercentage = 0;

    for (
      let comparisonPhraseIndex = 0;
      comparisonPhraseIndex < phraseIndex;
      comparisonPhraseIndex += 1
    ) {
      const similarityPercentage = Math.round(
        scorePhraseSimilarity(signature, signatures[comparisonPhraseIndex]!) *
          100
      );
      if (
        exactMatchPhraseIndex === null &&
        similarityPercentage === 100 &&
        signature.length > 0
      ) {
        exactMatchPhraseIndex = comparisonPhraseIndex;
      }
      if (similarityPercentage > strongestSimilarityPercentage) {
        strongestSimilarityPercentage = similarityPercentage;
        strongestSimilarPhraseIndex = comparisonPhraseIndex;
      }
    }

    if (strongestSimilarPhraseIndex !== null) {
      similarityTotal += strongestSimilarityPercentage;
      similarityCount += 1;
      if (strongestSimilarityPercentage >= 75) {
        similarPhraseCount += 1;
      }
      if (exactMatchPhraseIndex !== null) {
        repeatedPhraseCount += 1;
      }
      if (
        strongestPair === null ||
        strongestSimilarityPercentage > strongestPair.similarityPercentage
      ) {
        strongestPair = {
          sourcePhraseIndex: strongestSimilarPhraseIndex,
          targetPhraseIndex: phraseIndex,
          similarityPercentage: strongestSimilarityPercentage,
        };
      }
    }

    phrases.push({
      phraseIndex,
      phraseLabel: `${phraseSection?.label ?? 'Phrase'} ${phraseIndex + 1}`,
      sectionId: phraseSection?.id ?? 'unknown',
      sectionLabel: phraseSection?.label ?? 'Unknown',
      leadAttackCount: signature.length,
      exactMatchPhraseIndex,
      strongestSimilarPhraseIndex,
      strongestSimilarityPercentage,
    });
  }

  return {
    phraseCount,
    repeatedPhraseCount,
    similarPhraseCount,
    averageSimilarityPercentage:
      similarityCount > 0 ? similarityTotal / similarityCount : 0,
    strongestPair,
    phrases,
  };
}

export function formatMusicDebugPhraseRepetitionAnalysis(
  analysis: MusicDebugPhraseRepetitionAnalysis
): string {
  const strongestPair = analysis.strongestPair
    ? `best P${analysis.strongestPair.sourcePhraseIndex + 1}->P${analysis.strongestPair.targetPhraseIndex + 1} ${analysis.strongestPair.similarityPercentage}%`
    : 'best none';

  return `${analysis.repeatedPhraseCount}/${analysis.phraseCount} exact repeats | ${analysis.similarPhraseCount}/${analysis.phraseCount} similar phrases | avg ${Math.round(analysis.averageSimilarityPercentage)}% | ${strongestPair}`;
}

function collectPhraseSignature(options: {
  notes: readonly ProceduralMusicNote[];
  diagnostics: readonly MusicDebugNotePitchDiagnostic[];
  role: ProceduralMusicRole;
  songStartMs: number;
  phraseIndex: number;
  phraseDurationMs: number;
}): MusicDebugPhraseSignatureNote[] {
  const phraseStartMs =
    options.songStartMs + options.phraseIndex * options.phraseDurationMs;
  const phraseEndMs = phraseStartMs + options.phraseDurationMs;
  const signature: MusicDebugPhraseSignatureNote[] = [];

  for (
    let noteIndex = 0;
    noteIndex < options.notes.length && noteIndex < options.diagnostics.length;
    noteIndex += 1
  ) {
    const note = options.notes[noteIndex]!;
    const diagnostic = options.diagnostics[noteIndex]!;
    if (
      note.role !== options.role ||
      note.startMs < phraseStartMs ||
      note.startMs >= phraseEndMs
    ) {
      continue;
    }
    signature.push({
      offsetRatio: roundRatio(
        (note.startMs - phraseStartMs) / options.phraseDurationMs
      ),
      durationRatio: roundRatio(note.durationMs / options.phraseDurationMs),
      scaleDegree: diagnostic.scaleDegree,
    });
  }

  return signature;
}

function scorePhraseSimilarity(
  left: readonly MusicDebugPhraseSignatureNote[],
  right: readonly MusicDebugPhraseSignatureNote[]
): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }
  if (phrasesMatchExactly(left, right)) {
    return 1;
  }

  const attackCountSimilarity =
    1 -
    Math.abs(left.length - right.length) / Math.max(left.length, right.length);
  const rhythmSimilarity = scorePhraseRhythmSimilarity(left, right);
  const intervalSimilarity = scorePhraseIntervalSimilarity(left, right);

  return clamp01(
    attackCountSimilarity * 0.2 +
      rhythmSimilarity * 0.45 +
      intervalSimilarity * 0.35
  );
}

function phrasesMatchExactly(
  left: readonly MusicDebugPhraseSignatureNote[],
  right: readonly MusicDebugPhraseSignatureNote[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (
      left[index]!.offsetRatio !== right[index]!.offsetRatio ||
      left[index]!.durationRatio !== right[index]!.durationRatio ||
      left[index]!.scaleDegree !== right[index]!.scaleDegree
    ) {
      return false;
    }
  }
  return true;
}

function scorePhraseRhythmSimilarity(
  left: readonly MusicDebugPhraseSignatureNote[],
  right: readonly MusicDebugPhraseSignatureNote[]
): number {
  const sharedCount = Math.min(left.length, right.length);
  if (sharedCount === 0) {
    return 0;
  }

  let totalScore = 0;
  for (let index = 0; index < sharedCount; index += 1) {
    const offsetScore =
      1 -
      Math.min(
        1,
        Math.abs(left[index]!.offsetRatio - right[index]!.offsetRatio) / 0.25
      );
    const durationScore =
      1 -
      Math.min(
        1,
        Math.abs(left[index]!.durationRatio - right[index]!.durationRatio) /
          0.25
      );
    totalScore += (offsetScore + durationScore) / 2;
  }

  return totalScore / sharedCount;
}

function scorePhraseIntervalSimilarity(
  left: readonly MusicDebugPhraseSignatureNote[],
  right: readonly MusicDebugPhraseSignatureNote[]
): number {
  const leftIntervals = createIntervalPattern(left);
  const rightIntervals = createIntervalPattern(right);
  const sharedCount = Math.min(leftIntervals.length, rightIntervals.length);

  if (sharedCount === 0) {
    const leftDegree = left[0]?.scaleDegree;
    const rightDegree = right[0]?.scaleDegree;
    return leftDegree !== null && leftDegree === rightDegree ? 1 : 0;
  }

  let matchedCount = 0;
  for (let index = 0; index < sharedCount; index += 1) {
    if (leftIntervals[index] === rightIntervals[index]) {
      matchedCount += 1;
    }
  }

  return matchedCount / Math.max(leftIntervals.length, rightIntervals.length);
}

function createIntervalPattern(
  notes: readonly MusicDebugPhraseSignatureNote[]
): number[] {
  const pattern: number[] = [];
  for (let index = 1; index < notes.length; index += 1) {
    const previous = notes[index - 1]!.scaleDegree;
    const current = notes[index]!.scaleDegree;
    if (previous === null || current === null) {
      continue;
    }
    pattern.push(current - previous);
  }
  return pattern;
}

function findPhraseSection(
  sections: readonly ProceduralMusicSongSection[],
  phraseIndex: number
): ProceduralMusicSongSection | null {
  const phraseStartMeasure =
    phraseIndex * PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT + 1;

  for (const section of sections) {
    if (
      phraseStartMeasure >= section.startMeasure &&
      phraseStartMeasure <= section.endMeasure
    ) {
      return section;
    }
  }

  return null;
}

function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
