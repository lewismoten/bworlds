import type { ProceduralMusicNote } from './procedural-music.ts';
import {
  PROCEDURAL_LEAD_RHYTHM_SUBDIVISION_COUNT,
  resolveProceduralLeadRhythmPhraseTemplate,
} from './procedural-music-lead-rhythm-template.ts';
import { PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT } from './procedural-music-phrase-structure.ts';

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
    const measureCapMs =
      nextNote === null
        ? phraseRestEndMs
        : Math.min(phraseRestEndMs, nextNote.startMs - minimumGapMs);
    const phraseEndingSustainMs =
      nextNote === null && phraseEndingMeasure ? phraseRestEndMs : 0;
    const desiredEndMs = Math.min(
      phraseRestEndMs,
      Math.max(
        note.startMs + Math.max(targetDurationMs, note.durationMs),
        phraseEndingSustainMs
      )
    );
    const resolvedEndMs = Math.max(
      note.startMs + minimumDurationMs,
      Math.min(measureEndMs, measureCapMs, desiredEndMs)
    );

    note.durationMs = resolvedEndMs - note.startMs;
    if (
      nextNote !== null &&
      nextNote.startMs - resolvedEndMs <= subdivisionDurationMs * 1.25
    ) {
      note.releaseMs = Math.max(
        note.releaseMs,
        Math.round(note.releaseMs * 1.45)
      );
    }
  }
}
