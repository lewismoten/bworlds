import { describe, expect, it } from 'vitest';
import { createProceduralMusicSong } from './procedural-music-song.ts';
import { REPRESENTATIVE_FOREST_EXPLORATION_SONG } from './testing/procedural-music-song-test-support.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

describe('procedural music song arrangement identity', () => {
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
    const song = REPRESENTATIVE_FOREST_EXPLORATION_SONG;
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
    const song = REPRESENTATIVE_FOREST_EXPLORATION_SONG;
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
});
