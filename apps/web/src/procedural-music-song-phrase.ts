import type {
  MusicUpdateOptions,
  ProceduralMusicNote,
} from './procedural-music.ts';
import { scheduleProceduralMusicNotes } from './procedural-music.ts';

export const PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT = 8;

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

  return notes;
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
  const firstLeadNote = notes.find((note) => note.role === 'lead');
  if (!firstLeadNote) {
    return 0;
  }

  const candidateShifts = [-24, -12, 0, 12, 24];
  let bestShift = 0;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let index = 0; index < candidateShifts.length; index += 1) {
    const shift = candidateShifts[index]!;
    const shiftedFrequency = firstLeadNote.frequency * 2 ** (shift / 12);
    const leapSemitones = Math.abs(
      12 * Math.log2(shiftedFrequency / previousLeadFrequency)
    );
    const score = leapSemitones + Math.abs(shift) * 0.05;
    if (score < bestScore) {
      bestScore = score;
      bestShift = shift;
    }
  }

  return bestShift;
}
