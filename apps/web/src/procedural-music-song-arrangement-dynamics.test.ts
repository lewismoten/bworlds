import { describe, expect, it } from 'vitest';
import type { ProceduralMusicNote } from './procedural-music.ts';
import {
  averageCounts,
  averageNoteVelocity,
  averageNoteVolume,
  averageRoleDurationByMeasure,
  countRoleNotesByMeasure,
  REPRESENTATIVE_FOREST_EXPLORATION_SONG,
} from './testing/procedural-music-song-test-support.ts';

describe('procedural music song arrangement dynamics', () => {
  it('reduces intro and outro lead density while building toward the variation climax', () => {
    const song = REPRESENTATIVE_FOREST_EXPLORATION_SONG;
    const intro = song.sections.find((section) => section.id === 'intro');
    const variation = song.sections.find(
      (section) => section.id === 'variation'
    );
    const sectionA = song.sections.find((section) => section.id === 'a');
    const outro = song.sections.find((section) => section.id === 'outro');

    expect(intro).toBeDefined();
    expect(sectionA).toBeDefined();
    expect(variation).toBeDefined();
    expect(outro).toBeDefined();

    const introLeadAverage = averageCounts(
      countRoleNotesByMeasure(song, intro!, 'lead')
    );
    const sectionALeadAverage = averageCounts(
      countRoleNotesByMeasure(song, sectionA!, 'lead')
    );
    const outroLeadAverage = averageCounts(
      countRoleNotesByMeasure(song, outro!, 'lead')
    );

    const variationLeadCounts = countRoleNotesByMeasure(
      song,
      variation!,
      'lead'
    );
    const earlyVariationAverage = averageCounts(
      variationLeadCounts.slice(0, 4)
    );
    const lateVariationAverage = averageCounts(
      variationLeadCounts.slice(6, 10)
    );

    expect(introLeadAverage).toBeLessThan(sectionALeadAverage);
    expect(outroLeadAverage).toBeLessThan(sectionALeadAverage);
    expect(lateVariationAverage).toBeGreaterThan(earlyVariationAverage);
  });

  it('uses shorter lead notes while the variation section builds toward its climax', () => {
    const song = REPRESENTATIVE_FOREST_EXPLORATION_SONG;
    const variation = song.sections.find(
      (section) => section.id === 'variation'
    );

    expect(variation).toBeDefined();

    const variationLeadDurations = averageRoleDurationByMeasure(
      song,
      variation!,
      'lead'
    );
    const earlyVariationAverage = averageCounts(
      variationLeadDurations.slice(0, 4)
    );
    const climaxApproachAverage = averageCounts(
      variationLeadDurations.slice(6, 10)
    );
    const postClimaxAverage = averageCounts(
      variationLeadDurations.slice(12, 16)
    );

    expect(climaxApproachAverage).toBeLessThan(earlyVariationAverage);
    expect(postClimaxAverage).toBeGreaterThan(climaxApproachAverage);
  });

  it('varies lead note velocity within the opening phrase instead of keeping one flat dynamic level', () => {
    const song = REPRESENTATIVE_FOREST_EXPLORATION_SONG;
    const sectionA = song.sections.find((section) => section.id === 'a');

    expect(sectionA).toBeDefined();

    const openingPhraseLeadVelocities = song.notes
      .filter(
        (note): note is ProceduralMusicNote & { velocity: number } =>
          note.role === 'lead' &&
          note.velocity !== undefined &&
          note.startMs >= song.startMs + sectionA!.startOffsetMs &&
          note.startMs <
            song.startMs + sectionA!.startOffsetMs + sectionA!.durationMs / 2
      )
      .slice(0, 8)
      .map((note) => note.velocity);

    expect(openingPhraseLeadVelocities.length).toBeGreaterThanOrEqual(4);
    expect(new Set(openingPhraseLeadVelocities).size).toBeGreaterThan(1);
  });

  it('keeps opening motif notes more prominent than nearby filler notes in Section A', () => {
    const song = REPRESENTATIVE_FOREST_EXPLORATION_SONG;
    const sectionA = song.sections.find((section) => section.id === 'a');

    expect(sectionA).toBeDefined();

    const phraseEndMs =
      song.startMs + sectionA!.startOffsetMs + sectionA!.durationMs / 2;
    const openingPhraseLeadNotes = song.notes.filter(
      (note): note is ProceduralMusicNote & { velocity: number } =>
        note.role === 'lead' &&
        note.velocity !== undefined &&
        note.startMs >= song.startMs + sectionA!.startOffsetMs &&
        note.startMs < phraseEndMs
    );
    const motifNotes = openingPhraseLeadNotes.slice(0, 4);
    const fillerNotes = openingPhraseLeadNotes.slice(4);

    expect(motifNotes.length).toBe(4);
    expect(fillerNotes.length).toBeGreaterThan(0);
    expect(averageNoteVelocity(motifNotes)).toBeGreaterThan(
      averageNoteVelocity(fillerNotes)
    );
    expect(averageNoteVolume(motifNotes)).toBeGreaterThan(
      averageNoteVolume(fillerNotes)
    );
  });

  it('keeps the first filler note close to the motif cadence in Section A', () => {
    const song = REPRESENTATIVE_FOREST_EXPLORATION_SONG;
    const sectionA = song.sections.find((section) => section.id === 'a');

    expect(sectionA).toBeDefined();

    const phraseEndMs =
      song.startMs + sectionA!.startOffsetMs + sectionA!.durationMs / 2;
    const openingPhraseLeadNotes = song.notes.filter(
      (note) =>
        note.role === 'lead' &&
        note.startMs >= song.startMs + sectionA!.startOffsetMs &&
        note.startMs < phraseEndMs
    );
    const motifEndingNote = openingPhraseLeadNotes[3];
    const firstFillerNote = openingPhraseLeadNotes[4];

    expect(motifEndingNote).toBeDefined();
    expect(firstFillerNote).toBeDefined();
    expect(
      firstFillerNote!.startMs -
        (motifEndingNote!.startMs + motifEndingNote!.durationMs)
    ).toBeLessThanOrEqual(30);
    expect(firstFillerNote!.startMs - motifEndingNote!.startMs).toBeLessThan(
      700
    );
  });
});
