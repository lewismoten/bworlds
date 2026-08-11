import { describe, expect, it } from 'vitest';
import { isNoteInsideSongSection } from './procedural-music-song-boundaries.ts';
import { createProceduralMusicSong } from './procedural-music-song.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import {
  averageCounts,
  averageNoteVelocity,
  averageNoteVolume,
  averageRoleDurationByMeasure,
  countRoleNotesByMeasure,
} from './testing/procedural-music-song-test-support.ts';

describe('procedural music song arrangement', () => {
  it('shares the same song dna across ambient, battle, and boss arrangements', () => {
    const ambient = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'forest',
      contextType: 'overworld',
      encounterMode: 'ambient',
      combatIntensity: 0,
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    });
    const battle = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'forest',
      contextType: 'overworld',
      encounterMode: 'battle',
      combatIntensity: 0.6,
      dayProgress: 0.9,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    });
    const boss = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'forest',
      contextType: 'overworld',
      encounterMode: 'boss',
      combatIntensity: 0.95,
      dayProgress: 0.45,
      yearProgress: 0,
      clusterX: 3,
      clusterY: -2,
    });

    expect(battle.dna.identityId).toBe(ambient.dna.identityId);
    expect(battle.dna.progression).toEqual(ambient.dna.progression);
    expect(battle.dna.sharedMotif).toEqual(ambient.dna.sharedMotif);
    expect(boss.dna.leadContour).toEqual(ambient.dna.leadContour);
  }, 4_000);

  it('recombines section layers so later phrases do not keep the same full stack', () => {
    const song = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    });
    const sectionById = new Map(
      song.sections.map((section) => [section.id, section])
    );

    const countRoles = (sectionId: 'a' | 'intro' | 'variation' | 'outro') => {
      const section = sectionById.get(sectionId)!;
      const endMs = song.startMs + section.startOffsetMs + section.durationMs;
      return song.notes
        .filter(
          (note) =>
            note.startMs >= song.startMs + section.startOffsetMs &&
            note.startMs < endMs
        )
        .reduce<Record<string, number>>((counts, note) => {
          counts[note.role] = (counts[note.role] ?? 0) + 1;
          return counts;
        }, {});
    };

    const intro = countRoles('intro');
    const sectionA = countRoles('a');
    const variation = countRoles('variation');
    const outro = countRoles('outro');

    expect(intro.percussion ?? 0).toBe(0);
    expect(sectionA.percussion ?? 0).toBeGreaterThan(0);
    expect(variation.percussion ?? 0).toBeLessThan(sectionA.percussion ?? 0);
    expect(outro.percussion ?? 0).toBe(0);
  });

  it('keeps each exploration-cycle section aligned with its advertised layer plan', () => {
    const song = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    });
    const sectionById = new Map(
      song.sections.map((section) => [section.id, section])
    );

    const summarizeSection = (
      sectionId:
        'intro' | 'a' | 'a-prime' | 'b' | 'variation' | 'return' | 'outro'
    ) => {
      const section = sectionById.get(sectionId)!;
      const endMs = song.startMs + section.startOffsetMs + section.durationMs;
      const notes = song.notes.filter(
        (note) =>
          note.startMs >= song.startMs + section.startOffsetMs &&
          note.startMs < endMs
      );
      const roleCounts = notes.reduce<Record<string, number>>(
        (counts, note) => {
          counts[note.role] = (counts[note.role] ?? 0) + 1;
          return counts;
        },
        {}
      );
      const averageDurationByRole = notes.reduce<Record<string, number>>(
        (totals, note) => {
          totals[note.role] = (totals[note.role] ?? 0) + note.durationMs;
          return totals;
        },
        {}
      );

      for (const role of Object.keys(averageDurationByRole)) {
        averageDurationByRole[role] =
          averageDurationByRole[role]! / Math.max(1, roleCounts[role] ?? 0);
      }

      const averageLeadVolume =
        notes
          .filter((note) => note.role === 'lead')
          .reduce((total, note) => total + note.volume, 0) /
        Math.max(1, roleCounts.lead ?? 0);
      const averagePercussionVelocity =
        notes
          .filter(
            (note): note is ProceduralMusicNote & { velocity: number } =>
              note.role === 'percussion' && note.velocity !== undefined
          )
          .reduce((total, note) => total + note.velocity, 0) /
        Math.max(1, roleCounts.percussion ?? 0);

      return {
        roleCounts,
        averageDurationByRole,
        averageLeadVolume,
        averagePercussionVelocity,
      };
    };

    const intro = summarizeSection('intro');
    const sectionA = summarizeSection('a');
    const sectionAPrime = summarizeSection('a-prime');
    const sectionB = summarizeSection('b');
    const variation = summarizeSection('variation');
    const sectionReturn = summarizeSection('return');
    const outro = summarizeSection('outro');

    expect(intro.roleCounts.percussion ?? 0).toBe(0);
    expect(intro.roleCounts.bass ?? 0).toBeLessThan(
      sectionA.roleCounts.bass ?? 0
    );
    expect(sectionA.roleCounts.bass ?? 0).toBeGreaterThan(0);
    expect(sectionA.roleCounts.harmony ?? 0).toBeGreaterThan(0);
    expect(sectionA.roleCounts.lead ?? 0).toBeGreaterThan(0);
    expect(sectionA.roleCounts.percussion ?? 0).toBeGreaterThan(0);
    expect(sectionAPrime.averageLeadVolume).toBeGreaterThan(
      sectionA.averageLeadVolume
    );
    expect(sectionB.roleCounts.harmony ?? 0).toBeLessThan(
      sectionA.roleCounts.harmony ?? 0
    );
    expect(sectionB.roleCounts.percussion ?? 0).toBeLessThan(
      sectionA.roleCounts.percussion ?? 0
    );
    expect(sectionAPrime.averagePercussionVelocity).toBeGreaterThan(
      sectionA.averagePercussionVelocity
    );
    expect(sectionB.averagePercussionVelocity).toBeLessThan(
      sectionA.averagePercussionVelocity
    );
    expect(variation.roleCounts.percussion ?? 0).toBeLessThan(
      sectionA.roleCounts.percussion ?? 0
    );
    expect(variation.averagePercussionVelocity).toBeGreaterThan(
      sectionAPrime.averagePercussionVelocity
    );
    expect(variation.averageDurationByRole.lead ?? 0).toBeGreaterThan(
      sectionA.averageDurationByRole.lead ?? 0
    );
    expect(sectionReturn.roleCounts.percussion ?? 0).toBeGreaterThan(0);
    expect(sectionReturn.averagePercussionVelocity).toBeGreaterThan(
      sectionB.averagePercussionVelocity
    );
    expect(sectionReturn.averagePercussionVelocity).toBeLessThan(
      variation.averagePercussionVelocity
    );
    expect(sectionReturn.roleCounts.bass ?? 0).toBeGreaterThan(0);
    expect(sectionReturn.roleCounts.harmony ?? 0).toBeGreaterThan(0);
    expect(sectionReturn.roleCounts.lead ?? 0).toBeGreaterThan(0);
    expect(outro.roleCounts.percussion ?? 0).toBe(0);
    expect(outro.averageLeadVolume).toBeLessThan(sectionA.averageLeadVolume);
  });

  it('reduces intro and outro lead density while building toward the variation climax', () => {
    const song = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    });
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
    const song = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    });
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
    const song = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    });
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
    const song = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    });
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
    const song = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    });
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

  it('keeps transformed notes fully inside their assigned section windows', () => {
    const song = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    });

    for (const section of song.sections) {
      const sectionStartMs = song.startMs + section.startOffsetMs;
      const sectionEndMs = sectionStartMs + section.durationMs;
      const notesInSection = song.notes.filter(
        (note) => note.startMs >= sectionStartMs && note.startMs < sectionEndMs
      );

      expect(notesInSection.length).toBeGreaterThan(0);
      expect(
        notesInSection.every((note) =>
          isNoteInsideSongSection(note, section, song.startMs)
        )
      ).toBe(true);
      expect(
        notesInSection.every(
          (note) => note.startMs + note.durationMs <= sectionEndMs
        )
      ).toBe(true);
    }
  });
});
