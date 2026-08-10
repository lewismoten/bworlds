import type {
  MusicUpdateOptions,
  ProceduralMusicNote,
} from './procedural-music.ts';
import { resolveProceduralLeadRhythmPhraseTemplate } from './procedural-music-lead-rhythm-template.ts';
import { PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT } from './procedural-music-phrase-structure.ts';
import {
  resolveMusicThemeById,
  scheduleProceduralMusicNotes,
} from './procedural-music.ts';

export { PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT } from './procedural-music-phrase-structure.ts';

export function collectProceduralMusicPhraseNotes(
  options: MusicUpdateOptions,
  phraseDurationMs: number
): ProceduralMusicNote[] {
  const endMs = options.nowMs + phraseDurationMs;
  const notes: ProceduralMusicNote[] = [];
  let previousState:
    ReturnType<typeof scheduleProceduralMusicNotes>['state'] | undefined;
  let cursorNowMs = options.nowMs;

  while (cursorNowMs < endMs) {
    const scheduled = scheduleProceduralMusicNotes(
      {
        ...options,
        nowMs: cursorNowMs,
        allowLeadAccidentals: false,
      },
      previousState
    );
    previousState = scheduled.state;
    for (let index = 0; index < scheduled.notes.length; index += 1) {
      const note = scheduled.notes[index]!;
      if (note.startMs >= endMs) {
        continue;
      }
      const clampedDurationMs = Math.min(
        note.durationMs,
        Math.max(0, endMs - note.startMs)
      );
      if (clampedDurationMs <= 0) {
        continue;
      }
      notes.push({
        ...note,
        durationMs: clampedDurationMs,
      });
    }
    if (scheduled.state.nextNoteAtMs <= cursorNowMs) {
      cursorNowMs += 1;
    } else {
      cursorNowMs = scheduled.state.nextNoteAtMs;
    }
  }

  return ensureLeadMeasureAttackDensity(notes, {
    phraseStartMs: options.nowMs,
    phraseDurationMs,
    clusterX: options.clusterX ?? 0,
    clusterY: options.clusterY ?? 0,
  });
}

export function repeatProceduralMusicPhraseNotes(
  notes: readonly ProceduralMusicNote[],
  options: {
    phraseStartMs: number;
    phraseDurationMs: number;
    songStartMs: number;
    songDurationMs: number;
  }
): ProceduralMusicNote[] {
  const repeatedNotes: ProceduralMusicNote[] = [];
  const phraseDurationMs = Math.max(1, options.phraseDurationMs);
  const songEndMs = options.songStartMs + options.songDurationMs;
  let previousLeadFrequency: number | null = null;

  for (
    let phraseStartMs = options.songStartMs;
    phraseStartMs < songEndMs;
    phraseStartMs += phraseDurationMs
  ) {
    const phraseOffsetMs = phraseStartMs - options.phraseStartMs;
    const leadOctaveShift =
      previousLeadFrequency === null
        ? 0
        : resolveRepeatedLeadPhraseOctaveShift(notes, previousLeadFrequency);
    for (let index = 0; index < notes.length; index += 1) {
      const note = notes[index]!;
      const repeatedStartMs = note.startMs + phraseOffsetMs;
      if (repeatedStartMs >= songEndMs) {
        continue;
      }
      const frequency =
        note.role === 'lead'
          ? note.frequency * 2 ** (leadOctaveShift / 12)
          : note.frequency;
      repeatedNotes.push({
        ...note,
        startMs: repeatedStartMs,
        frequency,
      });
      if (note.role === 'lead') {
        previousLeadFrequency = frequency;
      }
    }
  }

  return repeatedNotes;
}

function resolveRepeatedLeadPhraseOctaveShift(
  notes: readonly ProceduralMusicNote[],
  previousLeadFrequency: number
): number {
  void notes;
  void previousLeadFrequency;
  return 0;
}

function ensureLeadMeasureAttackDensity(
  notes: readonly ProceduralMusicNote[],
  options: {
    phraseStartMs: number;
    phraseDurationMs: number;
    clusterX: number;
    clusterY: number;
  }
): ProceduralMusicNote[] {
  const repairedNotes = [...notes];
  const measureDurationMs =
    options.phraseDurationMs / PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT;
  const leadThemeId =
    repairedNotes.find((note) => note.role === 'lead')?.themeId ??
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
    const leadNotes = repairedNotes.filter(
      (note) =>
        note.role === 'lead' &&
        note.startMs >= measureStartMs &&
        note.startMs < measureEndMs
    );

    if (leadNotes.length >= 2) {
      continue;
    }

    const measureTemplate =
      phraseTemplate.measures[measureIndex] ?? phraseTemplate.measures[0];
    const targetAttacks = measureTemplate?.attacks ?? [];
    const templateNote =
      leadNotes[0] ??
      findLeadMeasureTemplate(repairedNotes, measureStartMs, measureEndMs);
    if (!templateNote) {
      continue;
    }
    const theme = resolveMusicThemeById(templateNote.themeId);
    for (
      let attackIndex = leadNotes.length;
      attackIndex < Math.max(2, targetAttacks.length);
      attackIndex += 1
    ) {
      const attackTemplate = targetAttacks[attackIndex] ?? targetAttacks.at(-1);
      const repairedStartMs = Math.round(
        measureStartMs +
          measureDurationMs * (attackTemplate?.offsetRatio ?? 0.58)
      );
      const previousLeadNoteInMeasure = findPreviousLeadNote(
        leadNotes,
        repairedStartMs
      );
      const nextLeadNoteInMeasure = findNextLeadNote(
        leadNotes,
        repairedStartMs
      );
      const previousLeadNote =
        previousLeadNoteInMeasure ??
        findPreviousLeadNote(repairedNotes, repairedStartMs);
      const nextLeadNote =
        nextLeadNoteInMeasure ??
        findNextLeadNote(repairedNotes, repairedStartMs);
      const repairedFrequency = resolveRepairedLeadFrequency({
        templateFrequency: templateNote.frequency,
        previousFrequency: previousLeadNote?.frequency ?? null,
        nextFrequency: nextLeadNote?.frequency ?? null,
      });
      repairedNotes.push({
        ...templateNote,
        instrumentId: `${templateNote.instrumentId}:measure-${measureIndex}-${attackIndex}`,
        startMs: repairedStartMs,
        durationMs: Math.max(
          48,
          Math.round(
            Math.min(
              theme.noteDurationMs * 0.72,
              measureDurationMs * (attackTemplate?.durationRatio ?? 0.24)
            )
          )
        ),
        frequency: repairedFrequency,
        volume:
          templateNote.volume * (attackTemplate?.volumeMultiplier ?? 0.76),
      });
    }
  }

  repairedNotes.sort((left, right) => {
    if (left.startMs !== right.startMs) {
      return left.startMs - right.startMs;
    }
    return left.durationMs - right.durationMs;
  });

  return repairedNotes;
}

function findLeadMeasureTemplate(
  notes: readonly ProceduralMusicNote[],
  measureStartMs: number,
  measureEndMs: number
): ProceduralMusicNote | null {
  for (let index = notes.length - 1; index >= 0; index -= 1) {
    const note = notes[index];
    if (
      note?.role === 'lead' &&
      note.startMs < measureStartMs &&
      !isGeneratedLeadRepairNote(note)
    ) {
      return note;
    }
  }

  for (const note of notes) {
    if (
      note.role === 'lead' &&
      note.startMs >= measureEndMs &&
      !isGeneratedLeadRepairNote(note)
    ) {
      return note;
    }
  }

  return null;
}

function findPreviousLeadNote(
  notes: readonly ProceduralMusicNote[],
  beforeStartMs: number
): ProceduralMusicNote | null {
  for (let index = notes.length - 1; index >= 0; index -= 1) {
    const note = notes[index];
    if (
      note?.role === 'lead' &&
      note.startMs < beforeStartMs &&
      !isGeneratedLeadRepairNote(note)
    ) {
      return note;
    }
  }

  return null;
}

function findNextLeadNote(
  notes: readonly ProceduralMusicNote[],
  afterStartMs: number
): ProceduralMusicNote | null {
  for (const note of notes) {
    if (
      note.role === 'lead' &&
      note.startMs >= afterStartMs &&
      !isGeneratedLeadRepairNote(note)
    ) {
      return note;
    }
  }

  return null;
}

function resolveRepairedLeadFrequency(options: {
  templateFrequency: number;
  previousFrequency: number | null;
  nextFrequency: number | null;
}): number {
  const octaveCandidates = [-24, -12, 0, 12, 24].map(
    (shift) => options.templateFrequency * 2 ** (shift / 12)
  );
  let bestFrequency = options.templateFrequency;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidateFrequency of octaveCandidates) {
    const previousLeap =
      options.previousFrequency === null
        ? null
        : Math.abs(
            12 * Math.log2(candidateFrequency / options.previousFrequency)
          );
    const nextLeap =
      options.nextFrequency === null
        ? null
        : Math.abs(12 * Math.log2(options.nextFrequency / candidateFrequency));
    if (previousLeap === null && nextLeap === null) {
      return candidateFrequency;
    }

    const previousOverflowPenalty =
      previousLeap === null ? 0 : Math.max(0, previousLeap - 12) * 4;
    const nextOverflowPenalty =
      nextLeap === null ? 0 : Math.max(0, nextLeap - 12) * 3;
    const continuityScore = (previousLeap ?? 0) * 1.15 + (nextLeap ?? 0) * 0.95;
    const totalScore =
      (previousOverflowPenalty + nextOverflowPenalty) * 100 + continuityScore;

    if (totalScore < bestScore) {
      bestScore = totalScore;
      bestFrequency = candidateFrequency;
    }
  }

  return clampRepairedLeadFrequencyToNeighborLeap({
    frequency: bestFrequency,
    previousFrequency: options.previousFrequency,
    nextFrequency: options.nextFrequency,
  });
}

function clampRepairedLeadFrequencyToNeighborLeap(options: {
  frequency: number;
  previousFrequency: number | null;
  nextFrequency: number | null;
}): number {
  const previousLeap =
    options.previousFrequency === null
      ? null
      : Math.abs(12 * Math.log2(options.frequency / options.previousFrequency));
  const nextLeap =
    options.nextFrequency === null
      ? null
      : Math.abs(12 * Math.log2(options.nextFrequency / options.frequency));

  if (
    previousLeap !== null &&
    previousLeap > 12 &&
    (nextLeap === null || nextLeap <= 12)
  ) {
    return options.previousFrequency!;
  }
  if (
    nextLeap !== null &&
    nextLeap > 12 &&
    (previousLeap === null || previousLeap <= 12)
  ) {
    return options.nextFrequency!;
  }

  return options.frequency;
}

function isGeneratedLeadRepairNote(
  note: Pick<ProceduralMusicNote, 'instrumentId'>
): boolean {
  return note.instrumentId.includes(':measure-');
}
