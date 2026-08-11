import { expect } from 'vitest';
import {
  PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT,
  collectProceduralMusicPhraseNotes,
  repeatProceduralMusicPhraseNotes,
} from '../procedural-music-song-phrase.ts';
import {
  createProceduralMusicSong,
  resolveProceduralMusicSongDurationMs,
} from '../procedural-music-song.ts';
import type { ProceduralMusicNote } from '../procedural-music.ts';
import { buildProceduralMusicSongSections } from '../procedural-music-song-timing.ts';
import { resolveProceduralMusicBlueprint } from '../procedural-music-blueprint.ts';

export { PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT };

export function resolveMidiNote(frequency: number): number {
  return Math.round(69 + 12 * Math.log2(frequency / 440));
}

export function collectLeadMotifRhythmShape(
  song: ReturnType<typeof createProceduralMusicSong>,
  section: ReturnType<typeof createProceduralMusicSong>['sections'][number]
): Array<{ offsetRatio: number; durationRatio: number }> {
  return song.notes
    .filter(
      (note) =>
        note.role === 'lead' &&
        note.startMs >= song.startMs + section.startOffsetMs &&
        note.startMs < song.startMs + section.startOffsetMs + section.durationMs
    )
    .slice(0, 4)
    .map((note) => ({
      offsetRatio: Number(
        (
          (note.startMs - (song.startMs + section.startOffsetMs)) /
          section.durationMs
        ).toFixed(3)
      ),
      durationRatio: Number((note.durationMs / section.durationMs).toFixed(3)),
    }));
}

export function collectLeadPhraseOpening(
  song: ReturnType<typeof createProceduralMusicSong>,
  section: ReturnType<typeof createProceduralMusicSong>['sections'][number],
  phraseIndexWithinSection: number
): Array<{ offsetRatio: number; durationRatio: number; midiNote: number }> {
  const measureDurationMs =
    section.durationMs / Math.max(1, section.measureCount);
  const phraseStartMs =
    song.startMs +
    section.startOffsetMs +
    phraseIndexWithinSection *
      measureDurationMs *
      PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT;
  const phraseDurationMs =
    measureDurationMs * PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT;

  return song.notes
    .filter(
      (note) =>
        note.role === 'lead' &&
        note.startMs >= phraseStartMs &&
        note.startMs < phraseStartMs + phraseDurationMs
    )
    .slice(0, 4)
    .map((note) => ({
      offsetRatio: Number(
        (
          (note.startMs - phraseStartMs) /
          Math.max(1, phraseDurationMs)
        ).toFixed(3)
      ),
      durationRatio: Number(
        (note.durationMs / Math.max(1, phraseDurationMs)).toFixed(3)
      ),
      midiNote: resolveMidiNote(note.frequency),
    }));
}

export function collectLeadPhraseClosing(
  song: ReturnType<typeof createProceduralMusicSong>,
  section: ReturnType<typeof createProceduralMusicSong>['sections'][number],
  phraseIndexWithinSection: number
): {
  startRatio: number;
  durationRatio: number;
  endRatio: number;
  midiNote: number;
} | null {
  const measureDurationMs =
    section.durationMs / Math.max(1, section.measureCount);
  const phraseStartMs =
    song.startMs +
    section.startOffsetMs +
    phraseIndexWithinSection *
      measureDurationMs *
      PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT;
  const phraseDurationMs =
    measureDurationMs * PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT;
  const closingNote = [...song.notes]
    .filter(
      (note) =>
        note.role === 'lead' &&
        note.startMs >= phraseStartMs &&
        note.startMs < phraseStartMs + phraseDurationMs
    )
    .at(-1);

  if (!closingNote) {
    return null;
  }

  const startRatio =
    (closingNote.startMs - phraseStartMs) / Math.max(1, phraseDurationMs);
  const durationRatio = closingNote.durationMs / Math.max(1, phraseDurationMs);

  return {
    startRatio: Number(startRatio.toFixed(3)),
    durationRatio: Number(durationRatio.toFixed(3)),
    endRatio: Number((startRatio + durationRatio).toFixed(3)),
    midiNote: resolveMidiNote(closingNote.frequency),
  };
}

export function expectPhraseRhythmToMatch(
  actual: ReadonlyArray<{ offsetRatio: number; durationRatio: number }>,
  expected: ReadonlyArray<{ offsetRatio: number; durationRatio: number }>
): void {
  expect(actual).toHaveLength(expected.length);

  for (let index = 0; index < expected.length; index += 1) {
    expect(actual[index]?.offsetRatio).toBeCloseTo(
      expected[index]?.offsetRatio ?? 0,
      2
    );
    expect(actual[index]?.durationRatio).toBeCloseTo(
      expected[index]?.durationRatio ?? 0,
      2
    );
  }
}

export function collectLeadSectionPitches(
  song: ReturnType<typeof createProceduralMusicSong>,
  section: ReturnType<typeof createProceduralMusicSong>['sections'][number]
): number[] {
  return song.notes
    .filter(
      (note) =>
        note.role === 'lead' &&
        note.startMs >= song.startMs + section.startOffsetMs &&
        note.startMs < song.startMs + section.startOffsetMs + section.durationMs
    )
    .slice(0, 4)
    .map((note) => resolveMidiNote(note.frequency));
}

export function countRoleNotesByMeasure(
  song: ReturnType<typeof createProceduralMusicSong>,
  section: ReturnType<typeof createProceduralMusicSong>['sections'][number],
  role: 'lead' | 'harmony' | 'bass' | 'percussion'
): number[] {
  const sectionStartMs = song.startMs + section.startOffsetMs;
  const measureDurationMs =
    section.durationMs / Math.max(1, section.measureCount);

  return Array.from(
    { length: section.measureCount },
    (_, measureIndex) =>
      song.notes.filter(
        (note) =>
          note.role === role &&
          note.startMs >= sectionStartMs + measureIndex * measureDurationMs &&
          note.startMs < sectionStartMs + (measureIndex + 1) * measureDurationMs
      ).length
  );
}

export function averageRoleDurationByMeasure(
  song: ReturnType<typeof createProceduralMusicSong>,
  section: ReturnType<typeof createProceduralMusicSong>['sections'][number],
  role: 'lead' | 'harmony' | 'bass' | 'percussion'
): number[] {
  const sectionStartMs = song.startMs + section.startOffsetMs;
  const measureDurationMs =
    section.durationMs / Math.max(1, section.measureCount);

  return Array.from({ length: section.measureCount }, (_, measureIndex) => {
    const measureNotes = song.notes.filter(
      (note) =>
        note.role === role &&
        note.startMs >= sectionStartMs + measureIndex * measureDurationMs &&
        note.startMs < sectionStartMs + (measureIndex + 1) * measureDurationMs
    );

    return (
      measureNotes.reduce((sum, note) => sum + note.durationMs, 0) /
      Math.max(1, measureNotes.length)
    );
  });
}

export function collectMeasurePulseInWindow(
  notes: readonly ProceduralMusicNote[],
  role: 'lead' | 'harmony' | 'bass' | 'percussion',
  windowStartMs: number,
  windowDurationMs: number,
  measureCount: number
): Array<{ attackCount: number; firstAttackOffsetRatio: number | null }> {
  const measureDurationMs = windowDurationMs / Math.max(1, measureCount);

  return Array.from(
    { length: Math.max(0, measureCount) },
    (_, measureIndex) => {
      const measureStartMs = windowStartMs + measureIndex * measureDurationMs;
      const measureEndMs = measureStartMs + measureDurationMs;
      const measureNotes = notes
        .filter(
          (note) =>
            note.role === role &&
            note.startMs >= measureStartMs &&
            note.startMs < measureEndMs
        )
        .sort((left, right) => left.startMs - right.startMs);
      const firstAttack = measureNotes[0];

      return {
        attackCount: measureNotes.length,
        firstAttackOffsetRatio:
          firstAttack === undefined
            ? null
            : Number(
                (
                  (firstAttack.startMs - measureStartMs) /
                  Math.max(1, measureDurationMs)
                ).toFixed(3)
              ),
      };
    }
  );
}

export function averageNoteVelocity(
  notes: ReadonlyArray<ProceduralMusicNote & { velocity: number }>
): number {
  return averageCounts(notes.map((note) => note.velocity));
}

export function averageNoteVolume(notes: readonly ProceduralMusicNote[]): number {
  return averageCounts(notes.map((note) => note.volume));
}

export function averageCounts(values: readonly number[]): number {
  return (
    values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
  );
}

export function resolvePhraseDurationMs(options: {
  nowMs: number;
  tileKind: 'forest' | 'town' | 'cave';
  contextType: 'overworld' | 'town' | 'dungeon';
  dayProgress: number;
  yearProgress: number;
  clusterX: number;
  clusterY: number;
}): number {
  const durationMs = resolveProceduralMusicSongDurationMs(options);
  const blueprint = resolveProceduralMusicBlueprint(options);
  const sections = buildProceduralMusicSongSections(blueprint, durationMs);
  const totalMeasures = sections.reduce(
    (sum, section) => sum + section.measureCount,
    0
  );

  return Math.round(
    (durationMs / totalMeasures) * PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT
  );
}

export function collectPhraseNotes(
  options: {
    nowMs: number;
    tileKind: 'forest' | 'town' | 'cave';
    contextType: 'overworld' | 'town' | 'dungeon';
    dayProgress: number;
    yearProgress: number;
    clusterX: number;
    clusterY: number;
  },
  phraseDurationMs = resolvePhraseDurationMs(options)
): readonly ProceduralMusicNote[] {
  return collectProceduralMusicPhraseNotes(options, phraseDurationMs);
}

export function repeatPhraseNotes(
  phraseNotes: readonly ProceduralMusicNote[],
  options: {
    phraseStartMs: number;
    phraseDurationMs: number;
    songStartMs: number;
    songDurationMs: number;
  }
): readonly ProceduralMusicNote[] {
  return repeatProceduralMusicPhraseNotes(phraseNotes, options);
}
