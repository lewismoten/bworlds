import { resolveProceduralMusicBlueprintMeasureCount } from './procedural-music-blueprint.ts';
import {
  PROCEDURAL_MUSIC_BEATS_PER_MEASURE,
  PROCEDURAL_MUSIC_TICKS_PER_MEASURE,
} from './procedural-music-song-timing.ts';
import type { MusicDebugSnapshot } from './music-debug.ts';
import { isNoteInsideSongSection } from './procedural-music-song-boundaries.ts';

export type MusicDebugTimingValidation = {
  expectedMeasureCount: number;
  actualMeasureCount: number;
  isValidForMidiExport: boolean;
  messages: string[];
};

export function validateMusicDebugTiming(
  snapshot: Pick<
    MusicDebugSnapshot,
    | 'durationMs'
    | 'measureCount'
    | 'resolvedBpm'
    | 'loopStartOffsetMs'
    | 'loopEndOffsetMs'
    | 'song'
  >
): MusicDebugTimingValidation {
  const expectedMeasureCount = resolveProceduralMusicBlueprintMeasureCount(
    snapshot.song.blueprint
  );
  const actualMeasureCount = snapshot.song.sections.reduce(
    (sum, section) => sum + section.measureCount,
    0
  );
  const messages: string[] = [];

  if (actualMeasureCount !== expectedMeasureCount) {
    messages.push(
      `Section measures sum to ${actualMeasureCount}, but the blueprint requires ${expectedMeasureCount}.`
    );
  }

  if (
    snapshot.loopStartOffsetMs < 0 ||
    snapshot.loopStartOffsetMs >= snapshot.loopEndOffsetMs ||
    snapshot.loopEndOffsetMs > snapshot.durationMs
  ) {
    messages.push('Loop range must stay inside the exported song duration.');
  }

  for (let index = 0; index < snapshot.song.sections.length; index += 1) {
    const section = snapshot.song.sections[index]!;
    const expectedSectionTickSpan =
      section.measureCount * PROCEDURAL_MUSIC_TICKS_PER_MEASURE;
    const actualSectionTickSpan = section.endTick - section.startTick;
    if (actualSectionTickSpan !== expectedSectionTickSpan) {
      messages.push(
        `${section.label} spans ${actualSectionTickSpan} ticks, expected ${expectedSectionTickSpan}.`
      );
    }
    if (
      section.endMeasure - section.startMeasure + 1 !==
      section.measureCount
    ) {
      messages.push(
        `${section.label} measures ${section.startMeasure}-${section.endMeasure} do not match its ${section.measureCount}-measure plan.`
      );
    }
    if (index > 0) {
      const previous = snapshot.song.sections[index - 1]!;
      if (section.startMeasure !== previous.endMeasure + 1) {
        messages.push(
          `${section.label} does not start immediately after ${previous.label}.`
        );
      }
      if (section.startTick !== previous.endTick) {
        messages.push(
          `${section.label} tick boundary does not align with ${previous.label}.`
        );
      }
      if (
        section.startOffsetMs !==
        previous.startOffsetMs + previous.durationMs
      ) {
        messages.push(
          `${section.label} millisecond boundary does not align with ${previous.label}.`
        );
      }
    }
  }

  const noteWindowStartMs = snapshot.song.startMs;
  const noteWindowEndMs = snapshot.song.startMs + snapshot.durationMs;
  for (let index = 0; index < snapshot.song.notes.length; index += 1) {
    const note = snapshot.song.notes[index]!;
    if (note.startMs < noteWindowStartMs || note.startMs >= noteWindowEndMs) {
      messages.push('One or more notes fall outside the song duration window.');
      break;
    }
  }

  for (
    let sectionIndex = 0;
    sectionIndex < snapshot.song.sections.length;
    sectionIndex += 1
  ) {
    const section = snapshot.song.sections[sectionIndex]!;
    const sectionStartMs = snapshot.song.startMs + section.startOffsetMs;
    const sectionEndMs = sectionStartMs + section.durationMs;

    for (
      let noteIndex = 0;
      noteIndex < snapshot.song.notes.length;
      noteIndex += 1
    ) {
      const note = snapshot.song.notes[noteIndex]!;
      if (note.startMs < sectionStartMs || note.startMs >= sectionEndMs) {
        continue;
      }
      if (!isNoteInsideSongSection(note, section, snapshot.song.startMs)) {
        messages.push(
          `${section.label} contains one or more notes that cross its boundary.`
        );
        sectionIndex = snapshot.song.sections.length;
        break;
      }
    }
  }

  const expectedDurationFromTempoMs =
    ((expectedMeasureCount * PROCEDURAL_MUSIC_BEATS_PER_MEASURE) /
      Math.max(1, snapshot.resolvedBpm)) *
    60_000;
  if (Math.abs(expectedDurationFromTempoMs - snapshot.durationMs) > 10) {
    messages.push(
      `Resolved BPM implies ${Math.round(expectedDurationFromTempoMs)} ms, but the song reports ${snapshot.durationMs} ms.`
    );
  }

  return {
    expectedMeasureCount,
    actualMeasureCount,
    isValidForMidiExport: messages.length === 0,
    messages,
  };
}
