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

  it('keeps a harmony anchor active through long lead rests in the base phrase', () => {
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
    const longLeadRests = collectLongLeadRests(
      plan.basePhraseNotes,
      music.nowMs,
      music.nowMs + phraseDurationMs,
      240
    );
    const supportAnchors = plan.basePhraseNotes.filter((note) =>
      note.instrumentId.includes(':anchor-')
    );

    expect(longLeadRests.length).toBeGreaterThan(0);
    expect(supportAnchors.length).toBeGreaterThan(0);
    expect(
      supportAnchors.every((anchor) =>
        longLeadRests.some(
          (gap) => anchor.startMs >= gap.startMs && anchor.startMs < gap.endMs
        )
      )
    ).toBe(true);
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

function collectLongLeadRests(
  notes: ReturnType<
    typeof buildProceduralMusicBasePhrasePlan
  >['basePhraseNotes'],
  phraseStartMs: number,
  phraseEndMs: number,
  minimumGapMs: number
) {
  const leadNotes = notes
    .filter((note) => note.role === 'lead')
    .sort((left, right) => left.startMs - right.startMs);
  const gaps: Array<{ startMs: number; endMs: number; midpointMs: number }> =
    [];
  let cursorMs = phraseStartMs;

  for (const note of leadNotes) {
    if (note.startMs - cursorMs >= minimumGapMs) {
      gaps.push({
        startMs: cursorMs,
        endMs: note.startMs,
        midpointMs: cursorMs + (note.startMs - cursorMs) / 2,
      });
    }
    cursorMs = Math.max(cursorMs, note.startMs + note.durationMs);
  }

  if (phraseEndMs - cursorMs >= minimumGapMs) {
    gaps.push({
      startMs: cursorMs,
      endMs: phraseEndMs,
      midpointMs: cursorMs + (phraseEndMs - cursorMs) / 2,
    });
  }

  return gaps;
}
