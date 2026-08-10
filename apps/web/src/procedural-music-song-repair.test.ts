import { describe, expect, it } from 'vitest';
import { buildProceduralMusicBasePhrasePlan } from './procedural-music-song-base.ts';
import { resolveProceduralMusicBlueprint } from './procedural-music-blueprint.ts';
import {
  regenerateProceduralMusicSongPhrases,
} from './procedural-music-song-repair.ts';
import { buildProceduralMusicSongSections } from './procedural-music-song-timing.ts';
import { resolveProceduralMusicSongDurationMs } from './procedural-music-song.ts';

describe('procedural music song repair', () => {
  it('regenerates only the failed phrase window before rebuilding the song', () => {
    const music = {
      nowMs: 1_000,
      tileKind: 'forest' as const,
      contextType: 'overworld' as const,
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    };
    const durationMs = resolveProceduralMusicSongDurationMs(music);
    const blueprint = resolveProceduralMusicBlueprint(music);
    const sections = buildProceduralMusicSongSections(blueprint, durationMs);
    const basePhrasePlan = buildProceduralMusicBasePhrasePlan({
      music,
      sections,
      songStartMs: music.nowMs,
      songDurationMs: durationMs,
    });
    const phraseIndex = 2;
    const phraseStartMs =
      music.nowMs + phraseIndex * basePhrasePlan.phraseDurationMs;
    const phraseEndMs = phraseStartMs + basePhrasePlan.phraseDurationMs;
    const damagedNotes = basePhrasePlan.repeatedNotes
      .filter(
        (note) => note.startMs < phraseStartMs || note.startMs >= phraseEndMs
      )
      .concat(
        basePhrasePlan.repeatedNotes
          .filter(
            (note) =>
              note.startMs >= phraseStartMs && note.startMs < phraseEndMs
          )
          .map((note) => ({
            ...note,
            instrumentId: `${note.instrumentId}:damaged`,
            frequency: note.frequency * 0.5,
          }))
      )
      .sort((left, right) => left.startMs - right.startMs);

    const repairedNotes = regenerateProceduralMusicSongPhrases(damagedNotes, {
      affectedPhraseIndexes: new Set([phraseIndex]),
      music,
      phraseDurationMs: basePhrasePlan.phraseDurationMs,
      songStartMs: music.nowMs,
      songDurationMs: durationMs,
    });

    expect(
      repairedNotes.filter(
        (note) => note.startMs < phraseStartMs || note.startMs >= phraseEndMs
      )
    ).toEqual(
      damagedNotes.filter(
        (note) => note.startMs < phraseStartMs || note.startMs >= phraseEndMs
      )
    );
    expect(
      repairedNotes.filter(
        (note) => note.startMs >= phraseStartMs && note.startMs < phraseEndMs
      )
    ).not.toEqual(
      damagedNotes.filter(
        (note) => note.startMs >= phraseStartMs && note.startMs < phraseEndMs
      )
    );
    expect(
      repairedNotes
        .filter(
          (note) => note.startMs >= phraseStartMs && note.startMs < phraseEndMs
        )
        .every((note) => !note.instrumentId.includes(':damaged'))
    ).toBe(true);
  });
});
