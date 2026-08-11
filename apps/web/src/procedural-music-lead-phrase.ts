import { hash2DWithSeed, registerHashLabel } from '@bworlds/core/hash';
import type { ProceduralMusicNote } from './procedural-music.ts';
import {
  PROCEDURAL_LEAD_RHYTHM_SUBDIVISION_COUNT,
  resolveProceduralLeadRhythmPhraseTemplate,
} from './procedural-music-lead-rhythm-template.ts';
import { PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT } from './procedural-music-phrase-structure.ts';

const LEAD_TIMING_HUMANIZATION_SEED = registerHashLabel(
  'music-lead-timing-humanization'
);

export function shapeProceduralPhraseLeadNotes(
  notes: readonly ProceduralMusicNote[],
  options: {
    phraseStartMs: number;
    phraseDurationMs: number;
    clusterX: number;
    clusterY: number;
  }
): ProceduralMusicNote[] {
  const shapedNotes = notes.map((note) => ({ ...note }));
  const measureDurationMs =
    options.phraseDurationMs / PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT;
  const subdivisionDurationMs =
    measureDurationMs / PROCEDURAL_LEAD_RHYTHM_SUBDIVISION_COUNT;
  const leadThemeId =
    shapedNotes.find((note) => note.role === 'lead')?.themeId ??
    'frontier-plains';
  const phraseTemplate = resolveProceduralLeadRhythmPhraseTemplate({
    themeId: leadThemeId,
    clusterX: options.clusterX,
    clusterY: options.clusterY,
    measureCount: PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT,
  });

  for (
    let measureIndex = 0;
    measureIndex < PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT;
    measureIndex += 1
  ) {
    const measureStartMs =
      options.phraseStartMs + measureIndex * measureDurationMs;
    const measureEndMs = measureStartMs + measureDurationMs;
    const leadNoteIndexes = collectLeadMeasureIndexes(
      shapedNotes,
      measureStartMs,
      measureEndMs
    );
    if (leadNoteIndexes.length === 0) {
      continue;
    }

    const measureTemplate =
      phraseTemplate.measures[measureIndex] ?? phraseTemplate.measures[0];
    const phraseRestEndMs =
      measureTemplate && measureTemplate.tailRestSubdivisionCount > 0
        ? Math.round(
            measureEndMs -
              subdivisionDurationMs * measureTemplate.tailRestSubdivisionCount
          )
        : measureEndMs;

    quantizeLeadMeasureStarts(
      shapedNotes,
      leadNoteIndexes,
      measureStartMs,
      measureEndMs,
      subdivisionDurationMs,
      measureTemplate?.attacks ?? []
    );
    humanizeLeadMeasureStarts(
      shapedNotes,
      leadNoteIndexes,
      measureStartMs,
      measureEndMs,
      options.clusterX,
      options.clusterY,
      subdivisionDurationMs,
      measureTemplate?.attacks ?? []
    );
    rebalancePhraseEndingLeadStart(
      shapedNotes,
      leadNoteIndexes,
      measureStartMs,
      phraseRestEndMs,
      phraseRestEndMs < measureEndMs,
      subdivisionDurationMs
    );
    connectLeadMeasureDurations(
      shapedNotes,
      leadNoteIndexes,
      measureEndMs,
      phraseRestEndMs,
      phraseRestEndMs < measureEndMs,
      subdivisionDurationMs,
      measureTemplate?.attacks ?? []
    );
  }

  shapedNotes.sort((left, right) => {
    if (left.startMs !== right.startMs) {
      return left.startMs - right.startMs;
    }
    return left.durationMs - right.durationMs;
  });

  return shapedNotes;
}

function collectLeadMeasureIndexes(
  notes: readonly ProceduralMusicNote[],
  measureStartMs: number,
  measureEndMs: number
): number[] {
  const indexes: number[] = [];
  for (let index = 0; index < notes.length; index += 1) {
    const note = notes[index]!;
    if (
      note.role === 'lead' &&
      note.startMs >= measureStartMs &&
      note.startMs < measureEndMs
    ) {
      indexes.push(index);
    }
  }

  indexes.sort((left, right) => notes[left]!.startMs - notes[right]!.startMs);
  return indexes;
}

function quantizeLeadMeasureStarts(
  notes: ProceduralMusicNote[],
  leadNoteIndexes: readonly number[],
  measureStartMs: number,
  measureEndMs: number,
  subdivisionDurationMs: number,
  attackTemplates: readonly {
    subdivisionStep: number;
    offsetRatio: number;
  }[]
): void {
  for (
    let attackIndex = 0;
    attackIndex < leadNoteIndexes.length;
    attackIndex += 1
  ) {
    const noteIndex = leadNoteIndexes[attackIndex]!;
    const note = notes[noteIndex]!;
    const currentOffsetMs = note.startMs - measureStartMs;
    const quantizedSubdivision = Math.max(
      0,
      Math.round(currentOffsetMs / Math.max(1, subdivisionDurationMs))
    );
    const targetSubdivision =
      attackTemplates[attackIndex]?.subdivisionStep ?? quantizedSubdivision;
    const targetStartMs = Math.min(
      measureEndMs - 1,
      Math.max(
        measureStartMs,
        Math.round(measureStartMs + targetSubdivision * subdivisionDurationMs)
      )
    );

    note.startMs = targetStartMs;
  }
}

function humanizeLeadMeasureStarts(
  notes: ProceduralMusicNote[],
  leadNoteIndexes: readonly number[],
  measureStartMs: number,
  measureEndMs: number,
  clusterX: number,
  clusterY: number,
  subdivisionDurationMs: number,
  attackTemplates: readonly {
    subdivisionStep: number;
  }[]
): void {
  if (leadNoteIndexes.length === 0) {
    return;
  }

  const maximumHumanizationMs = Math.max(
    4,
    Math.min(14, Math.round(subdivisionDurationMs * 0.12))
  );
  const minimumAttackGapMs = Math.max(
    12,
    Math.round(subdivisionDurationMs * 0.16)
  );

  for (
    let attackIndex = 0;
    attackIndex < leadNoteIndexes.length;
    attackIndex += 1
  ) {
    const noteIndex = leadNoteIndexes[attackIndex]!;
    const note = notes[noteIndex]!;
    const priorNote =
      attackIndex > 0 ? notes[leadNoteIndexes[attackIndex - 1]!]! : null;
    const nextNote =
      attackIndex + 1 < leadNoteIndexes.length
        ? notes[leadNoteIndexes[attackIndex + 1]!]!
        : null;
    const attackTemplate = attackTemplates[attackIndex];
    const quantizedStartMs = note.startMs;
    const humanizationSignal =
      hash2DWithSeed(
        LEAD_TIMING_HUMANIZATION_SEED,
        clusterX * 97 + measureStartMs + attackIndex * 17,
        clusterY * 89 +
          (attackTemplate?.subdivisionStep ?? attackIndex) * 31 +
          leadNoteIndexes.length
      ) *
        2 -
      1;
    const offsetMs = Math.round(humanizationSignal * maximumHumanizationMs);
    const earliestStartMs =
      priorNote === null
        ? measureStartMs
        : priorNote.startMs + minimumAttackGapMs;
    const latestStartMs =
      nextNote === null
        ? measureEndMs - 1
        : nextNote.startMs - minimumAttackGapMs;

    note.startMs = Math.max(
      earliestStartMs,
      Math.min(latestStartMs, quantizedStartMs + offsetMs)
    );
  }
}

function rebalancePhraseEndingLeadStart(
  notes: ProceduralMusicNote[],
  leadNoteIndexes: readonly number[],
  measureStartMs: number,
  phraseRestEndMs: number,
  phraseEndingMeasure: boolean,
  subdivisionDurationMs: number
): void {
  if (!phraseEndingMeasure || leadNoteIndexes.length === 0) {
    return;
  }

  const finalNoteIndex = leadNoteIndexes[leadNoteIndexes.length - 1]!;
  const finalNote = notes[finalNoteIndex]!;
  const priorNote =
    leadNoteIndexes.length > 1
      ? notes[leadNoteIndexes[leadNoteIndexes.length - 2]!]!
      : null;
  const minimumGapMs = Math.max(24, Math.round(subdivisionDurationMs * 0.24));
  const minimumPhraseEndingDurationMs = Math.max(
    160,
    Math.round(subdivisionDurationMs * 2.6)
  );
  const latestAllowedStartMs = phraseRestEndMs - minimumPhraseEndingDurationMs;

  if (finalNote.startMs <= latestAllowedStartMs) {
    return;
  }

  finalNote.startMs = Math.max(
    measureStartMs,
    priorNote === null
      ? latestAllowedStartMs
      : Math.max(latestAllowedStartMs, priorNote.startMs + minimumGapMs)
  );
}

function connectLeadMeasureDurations(
  notes: ProceduralMusicNote[],
  leadNoteIndexes: readonly number[],
  measureEndMs: number,
  phraseRestEndMs: number,
  phraseEndingMeasure: boolean,
  subdivisionDurationMs: number,
  attackTemplates: readonly {
    subdivisionLength: number;
  }[]
): void {
  const minimumGapMs = Math.max(24, Math.round(subdivisionDurationMs * 0.24));
  const connectedSentenceGapMs = Math.max(
    12,
    Math.round(subdivisionDurationMs * 0.12)
  );
  const minimumDurationMs = Math.max(
    48,
    Math.round(subdivisionDurationMs * 1.35)
  );

  for (
    let attackIndex = 0;
    attackIndex < leadNoteIndexes.length;
    attackIndex += 1
  ) {
    const noteIndex = leadNoteIndexes[attackIndex]!;
    const note = notes[noteIndex]!;
    const nextNote =
      attackIndex + 1 < leadNoteIndexes.length
        ? notes[leadNoteIndexes[attackIndex + 1]!]!
        : null;
    const attackTemplate =
      attackTemplates[attackIndex] ??
      attackTemplates[attackTemplates.length - 1];
    const targetDurationMs = Math.max(
      minimumDurationMs,
      Math.round(
        subdivisionDurationMs * (attackTemplate?.subdivisionLength ?? 3) * 0.54
      )
    );
    const connectsIntoSentence =
      nextNote !== null &&
      nextNote.startMs - note.startMs <= subdivisionDurationMs * 6;
    const measureCapMs =
      nextNote === null
        ? phraseRestEndMs
        : Math.min(
            phraseRestEndMs,
            nextNote.startMs -
              (connectsIntoSentence ? connectedSentenceGapMs : minimumGapMs)
          );
    const phraseEndingSustainMs =
      nextNote === null && phraseEndingMeasure ? phraseRestEndMs : 0;
    const sentenceConnectionEndMs = connectsIntoSentence ? measureCapMs : 0;
    const desiredEndMs = Math.min(
      phraseRestEndMs,
      Math.max(
        note.startMs + Math.max(targetDurationMs, note.durationMs),
        sentenceConnectionEndMs,
        phraseEndingSustainMs
      )
    );
    const resolvedEndMs = Math.max(
      note.startMs + minimumDurationMs,
      Math.min(measureEndMs, measureCapMs, desiredEndMs)
    );

    note.durationMs = resolvedEndMs - note.startMs;
    if (connectsIntoSentence) {
      note.releaseMs = Math.max(
        note.releaseMs,
        Math.round(note.releaseMs * 1.75)
      );
    }
  }
}
