import type {
  ProceduralMusicSongSection,
} from './procedural-music-song.ts';
import type { MusicUpdateOptions, ProceduralMusicNote } from './procedural-music.ts';
import {
  collectProceduralMusicPhraseNotes,
  PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT,
  repeatProceduralMusicPhraseNotes,
} from './procedural-music-song-phrase.ts';

export type ProceduralMusicBasePhrasePlan = {
  phraseDurationMs: number;
  basePhraseNotes: ProceduralMusicNote[];
  repeatedNotes: ProceduralMusicNote[];
};

export function buildProceduralMusicBasePhrasePlan(options: {
  music: MusicUpdateOptions;
  sections: readonly ProceduralMusicSongSection[];
  songStartMs: number;
  songDurationMs: number;
}): ProceduralMusicBasePhrasePlan {
  const phraseDurationMs = resolveProceduralMusicPhraseDurationMs(
    options.sections,
    options.songDurationMs
  );
  const basePhraseNotes = collectProceduralMusicPhraseNotes(
    options.music,
    phraseDurationMs
  );
  const repeatedNotes = repeatProceduralMusicPhraseNotes(basePhraseNotes, {
    phraseStartMs: options.songStartMs,
    phraseDurationMs,
    songStartMs: options.songStartMs,
    songDurationMs: options.songDurationMs,
  });

  return {
    phraseDurationMs,
    basePhraseNotes,
    repeatedNotes,
  };
}

export function resolveProceduralMusicPhraseDurationMs(
  sections: readonly ProceduralMusicSongSection[],
  durationMs: number
): number {
  const totalMeasures = Math.max(
    1,
    sections.reduce((sum, section) => sum + section.measureCount, 0)
  );
  return Math.max(
    1_000,
    Math.round(
      (durationMs / totalMeasures) * PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT
    )
  );
}
