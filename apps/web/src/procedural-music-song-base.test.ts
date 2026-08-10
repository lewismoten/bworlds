import { describe, expect, it } from 'vitest';
import {
  buildProceduralMusicBasePhrasePlan,
  resolveProceduralMusicPhraseDurationMs,
} from './procedural-music-song-base.ts';
import { buildProceduralMusicSongSections } from './procedural-music-song-timing.ts';
import { resolveProceduralMusicBlueprint } from './procedural-music-blueprint.ts';
import { resolveProceduralMusicSongDurationMs } from './procedural-music-song.ts';

describe('procedural music song base phrase plan', () => {
  it('tests the first eight measures before expanding them across the song', () => {
    const music = {
      nowMs: 1_000,
      tileKind: 'forest' as const,
      contextType: 'overworld' as const,
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    };
    const songDurationMs = resolveProceduralMusicSongDurationMs(music);
    const blueprint = resolveProceduralMusicBlueprint(music);
    const sections = buildProceduralMusicSongSections(
      blueprint,
      songDurationMs
    );
    const phraseDurationMs = resolveProceduralMusicPhraseDurationMs(
      sections,
      songDurationMs
    );
    const plan = buildProceduralMusicBasePhrasePlan({
      music,
      sections,
      songStartMs: music.nowMs,
      songDurationMs,
    });

    expect(plan.phraseDurationMs).toBe(phraseDurationMs);
    expect(plan.basePhraseNotes.length).toBeGreaterThan(0);
    expect(
      plan.basePhraseNotes.every(
        (note) =>
          note.startMs >= music.nowMs &&
          note.startMs < music.nowMs + phraseDurationMs
      )
    ).toBe(true);
    expect(
      plan.repeatedNotes.every(
        (note) =>
          note.startMs >= music.nowMs &&
          note.startMs < music.nowMs + songDurationMs
      )
    ).toBe(true);

    for (const role of ['lead', 'harmony', 'bass', 'percussion'] as const) {
      const firstPhrase = readPhraseSignature(
        plan.repeatedNotes,
        role,
        music.nowMs,
        phraseDurationMs
      );
      const secondPhrase = readPhraseSignature(
        plan.repeatedNotes,
        role,
        music.nowMs + phraseDurationMs,
        phraseDurationMs
      );

      expect(firstPhrase.length).toBeGreaterThan(0);
      expect(secondPhrase).toEqual(firstPhrase);
    }
  });
});

function readPhraseSignature(
  notes: ReturnType<typeof buildProceduralMusicBasePhrasePlan>['repeatedNotes'],
  role: 'lead' | 'harmony' | 'bass' | 'percussion',
  phraseStartMs: number,
  phraseDurationMs: number
) {
  return notes
    .filter(
      (note) =>
        note.role === role &&
        note.startMs >= phraseStartMs &&
        note.startMs < phraseStartMs + phraseDurationMs
    )
    .slice(0, 12)
    .map((note) => ({
      instrumentId: note.instrumentId,
      offsetMs: Number((note.startMs - phraseStartMs).toFixed(3)),
      durationMs: Number(note.durationMs.toFixed(3)),
      frequency: Number(note.frequency.toFixed(3)),
      volume: Number(note.volume.toFixed(6)),
    }));
}
