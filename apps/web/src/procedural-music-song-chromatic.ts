import { resolveProceduralMidiNoteFrequency } from './procedural-music-scale.ts';
import { isProceduralSemitoneInMode } from './procedural-music-scale.ts';
import { resolveMusicThemeById } from './procedural-music.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

export function regeneratePhrasesContainingUnresolvedChromaticNotes(
  notes: readonly ProceduralMusicNote[],
  options: {
    songStartMs: number;
    phraseDurationMs: number;
  }
): ProceduralMusicNote[] {
  const repairedNotes = notes.map((note) => ({ ...note }));
  const affectedPhraseIndexes = collectAffectedPhraseIndexes(
    repairedNotes,
    options
  );

  if (affectedPhraseIndexes.size === 0) {
    return repairedNotes;
  }

  for (const phraseIndex of affectedPhraseIndexes) {
    const phraseStartMs =
      options.songStartMs + phraseIndex * Math.max(1, options.phraseDurationMs);
    const phraseEndMs = phraseStartMs + Math.max(1, options.phraseDurationMs);

    for (let noteIndex = 0; noteIndex < repairedNotes.length; noteIndex += 1) {
      const note = repairedNotes[noteIndex]!;
      if (
        note.role === 'percussion' ||
        note.startMs < phraseStartMs ||
        note.startMs >= phraseEndMs ||
        isNoteResolvedChromaticStep(repairedNotes, noteIndex)
      ) {
        continue;
      }

      const repairedFrequency = resolveNearestInModeFrequency(
        repairedNotes,
        noteIndex
      );
      if (repairedFrequency === null || repairedFrequency === note.frequency) {
        continue;
      }

      repairedNotes[noteIndex] = {
        ...note,
        instrumentId: `${note.instrumentId}:chromatic-repair`,
        frequency: repairedFrequency,
      };
    }
  }

  return repairedNotes;
}

function collectAffectedPhraseIndexes(
  notes: readonly ProceduralMusicNote[],
  options: {
    songStartMs: number;
    phraseDurationMs: number;
  }
): Set<number> {
  const affectedPhraseIndexes = new Set<number>();
  const phraseDurationMs = Math.max(1, options.phraseDurationMs);

  for (let noteIndex = 0; noteIndex < notes.length; noteIndex += 1) {
    if (isNoteResolvedChromaticStep(notes, noteIndex)) {
      continue;
    }
    const note = notes[noteIndex]!;
    if (note.role === 'percussion') {
      continue;
    }
    affectedPhraseIndexes.add(
      Math.max(
        0,
        Math.floor((note.startMs - options.songStartMs) / phraseDurationMs)
      )
    );
  }

  return affectedPhraseIndexes;
}

function isNoteResolvedChromaticStep(
  notes: readonly ProceduralMusicNote[],
  noteIndex: number
): boolean {
  const note = notes[noteIndex];
  if (!note || note.role === 'percussion') {
    return true;
  }

  const currentSemitones = resolveRelativeSemitones(note);
  const theme = resolveMusicThemeById(note.themeId);
  if (isProceduralSemitoneInMode(theme.scale, currentSemitones)) {
    return true;
  }

  const next = findAdjacentRoleNote(notes, noteIndex, 1);
  if (isInModeNeighborStep(note, next)) {
    return true;
  }
  const previous = findAdjacentRoleNote(notes, noteIndex, -1);
  if (isInModeNeighborStep(note, previous)) {
    return true;
  }

  return false;
}

function findAdjacentRoleNote(
  notes: readonly ProceduralMusicNote[],
  startIndex: number,
  direction: 1 | -1
): ProceduralMusicNote | null {
  const role = notes[startIndex]?.role;
  if (!role) {
    return null;
  }

  for (
    let noteIndex = startIndex + direction;
    noteIndex >= 0 && noteIndex < notes.length;
    noteIndex += direction
  ) {
    const note = notes[noteIndex];
    if (note?.role === role) {
      return note;
    }
  }

  return null;
}

function isInModeNeighborStep(
  note: ProceduralMusicNote,
  neighbor: ProceduralMusicNote | null
): boolean {
  if (!neighbor || neighbor.themeId !== note.themeId) {
    return false;
  }

  const theme = resolveMusicThemeById(note.themeId);
  const noteSemitones = resolveRelativeSemitones(note);
  const neighborSemitones = resolveRelativeSemitones(neighbor);
  return (
    isProceduralSemitoneInMode(theme.scale, neighborSemitones) &&
    Math.abs(neighborSemitones - noteSemitones) === 1
  );
}

function resolveNearestInModeFrequency(
  notes: readonly ProceduralMusicNote[],
  noteIndex: number
): number | null {
  const note = notes[noteIndex];
  if (!note || note.role === 'percussion') {
    return null;
  }

  const theme = resolveMusicThemeById(note.themeId);
  const targetSemitones = resolveRelativeSemitones(note);
  let bestSemitones: number | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let distance = 1; distance <= 12; distance += 1) {
    const candidates = [targetSemitones - distance, targetSemitones + distance];
    for (
      let candidateIndex = 0;
      candidateIndex < candidates.length;
      candidateIndex += 1
    ) {
      const candidate = candidates[candidateIndex]!;
      if (!isProceduralSemitoneInMode(theme.scale, candidate)) {
        continue;
      }
      const score = scoreInModeRepairCandidate(notes, noteIndex, candidate);
      if (score < bestScore) {
        bestScore = score;
        bestSemitones = candidate;
      }
    }
    if (bestSemitones !== null) {
      break;
    }
  }

  return bestSemitones === null
    ? null
    : resolveProceduralMidiNoteFrequency(theme.rootMidiNote + bestSemitones);
}

function scoreInModeRepairCandidate(
  notes: readonly ProceduralMusicNote[],
  noteIndex: number,
  candidateSemitones: number
): number {
  const note = notes[noteIndex]!;
  const targetSemitones = resolveRelativeSemitones(note);
  const previous = findAdjacentRoleNote(notes, noteIndex, -1);
  const next = findAdjacentRoleNote(notes, noteIndex, 1);
  const previousPenalty =
    previous === null
      ? 0
      : Math.abs(candidateSemitones - resolveRelativeSemitones(previous));
  const nextPenalty =
    next === null
      ? 0
      : Math.abs(candidateSemitones - resolveRelativeSemitones(next));

  return (
    Math.abs(candidateSemitones - targetSemitones) * 10 +
    previousPenalty +
    nextPenalty
  );
}

function resolveRelativeSemitones(note: ProceduralMusicNote): number {
  const theme = resolveMusicThemeById(note.themeId);
  const midiNote = Math.round(
    69 + 12 * Math.log2(Math.max(note.frequency, 1) / 440)
  );
  return midiNote - theme.rootMidiNote;
}
