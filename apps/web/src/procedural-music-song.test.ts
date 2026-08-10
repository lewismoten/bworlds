import { describe, expect, it } from 'vitest';
import { isNoteInsideSongSection } from './procedural-music-song-boundaries.ts';
import {
  createProceduralMusicSong,
  resolveProceduralMusicSongDurationMs,
} from './procedural-music-song.ts';

describe('procedural music song', () => {
  it('keeps overworld and town songs in the two-to-three-minute range', () => {
    const durationMs = resolveProceduralMusicSongDurationMs({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
    });
    const townDurationMs = resolveProceduralMusicSongDurationMs({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 7,
      clusterY: 4,
    });

    expect(durationMs).toBeGreaterThanOrEqual(120_000);
    expect(durationMs).toBeLessThanOrEqual(180_000);
    expect(townDurationMs).toBeGreaterThanOrEqual(120_000);
    expect(townDurationMs).toBeLessThanOrEqual(180_000);
  });

  it('keeps battle tracks in the one-to-two-minute range', () => {
    const durationMs = resolveProceduralMusicSongDurationMs({
      tileKind: 'forest',
      contextType: 'overworld',
      encounterMode: 'battle',
      combatIntensity: 0.6,
      clusterX: 3,
      clusterY: -2,
    });

    expect(durationMs).toBeGreaterThanOrEqual(60_000);
    expect(durationMs).toBeLessThanOrEqual(120_000);
  });

  it('lets boss or cinematic tracks run in the three-to-six-minute range', () => {
    const durationMs = resolveProceduralMusicSongDurationMs({
      tileKind: 'cave',
      contextType: 'dungeon',
      encounterMode: 'boss',
      combatIntensity: 0.95,
      clusterX: 7,
      clusterY: 4,
    });

    expect(durationMs).toBeGreaterThanOrEqual(180_000);
    expect(durationMs).toBeLessThanOrEqual(360_000);
  });

  it('builds deterministic full-song structures with loopable middle sections', () => {
    const first = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    });
    const second = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    });

    expect(first.sections.map((section) => section.id)).toEqual([
      'intro',
      'a',
      'a-prime',
      'b',
      'variation',
      'return',
      'outro',
    ]);
    expect(first.blueprint.id).toBe('exploration-cycle');
    expect(first.dna.identityId).toBe(second.dna.identityId);
    expect(first.dna.progression).toEqual(second.dna.progression);
    expect(first.dna.leadMotif).toEqual(second.dna.leadMotif);
    expect(first.loopStartOffsetMs).toBe(first.sections[1]?.startOffsetMs);
    expect(first.loopEndOffsetMs).toBe(
      first.sections[first.sections.length - 1]!.startOffsetMs
    );
    expect(first.sections[0]).toEqual(
      expect.objectContaining({
        startMeasure: 1,
        endMeasure: 8,
      })
    );
    expect(first.sections[1]).toEqual(
      expect.objectContaining({
        startMeasure: 9,
        endMeasure: 24,
      })
    );
    expect(first.sections[2]).toEqual(
      expect.objectContaining({
        startMeasure: 25,
        endMeasure: 40,
      })
    );
    expect(first.sections[3]).toEqual(
      expect.objectContaining({
        startMeasure: 41,
        endMeasure: 56,
      })
    );
    expect(first.sections[4]).toEqual(
      expect.objectContaining({
        startMeasure: 57,
        endMeasure: 72,
      })
    );
    expect(first.sections[5]).toEqual(
      expect.objectContaining({
        startMeasure: 73,
        endMeasure: 80,
      })
    );
    expect(first.sections.at(-1)).toEqual(
      expect.objectContaining({
        startMeasure: 81,
        endMeasure: 88,
      })
    );
    expect(first.durationMs).toBeGreaterThan(100_000);
    expect(first.durationMs).toBe(second.durationMs);
    expect(first.notes).toEqual(second.notes);
  });

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

  it('repeats song sections with deterministic melodic and rhythmic variation', () => {
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
    const sectionA = sectionById.get('a');
    const sectionAPrime = sectionById.get('a-prime');
    const sectionVariation = sectionById.get('variation');

    expect(sectionA).toBeDefined();
    expect(sectionAPrime).toBeDefined();
    expect(sectionVariation).toBeDefined();
    expect(song.blueprint.label).toContain('A16');

    const extractLeadSignature = (sectionId: 'a' | 'a-prime' | 'variation') => {
      const section = sectionById.get(sectionId)!;
      const endMs = song.startMs + section.startOffsetMs + section.durationMs;
      return song.notes
        .filter(
          (note) =>
            note.role === 'lead' &&
            note.startMs >= song.startMs + section.startOffsetMs &&
            note.startMs < endMs
        )
        .slice(0, 8)
        .map((note) => ({
          startMs: note.startMs,
          durationMs: note.durationMs,
          frequency: Number(note.frequency.toFixed(3)),
        }));
    };

    const aLead = extractLeadSignature('a');
    const aPrimeLead = extractLeadSignature('a-prime');
    const variationLead = extractLeadSignature('variation');

    expect(aLead.length).toBeGreaterThan(0);
    expect(aPrimeLead.length).toBeGreaterThan(0);
    expect(variationLead.length).toBeGreaterThan(0);
    expect(aPrimeLead).not.toEqual(aLead);
    expect(variationLead).not.toEqual(aLead);
  });

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
      sectionId: 'intro' | 'a' | 'b' | 'variation' | 'return' | 'outro'
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

      return {
        roleCounts,
        averageDurationByRole,
        averageLeadVolume,
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
    expect(variation.roleCounts.percussion ?? 0).toBeLessThan(
      sectionA.roleCounts.percussion ?? 0
    );
    expect(variation.averageDurationByRole.lead ?? 0).toBeGreaterThan(
      sectionA.averageDurationByRole.lead ?? 0
    );
    expect(sectionReturn.roleCounts.percussion ?? 0).toBeGreaterThan(0);
    expect(sectionReturn.roleCounts.bass ?? 0).toBeGreaterThan(0);
    expect(sectionReturn.roleCounts.harmony ?? 0).toBeGreaterThan(0);
    expect(sectionReturn.roleCounts.lead ?? 0).toBeGreaterThan(0);
    expect(outro.roleCounts.percussion ?? 0).toBe(0);
    expect(outro.averageLeadVolume).toBeLessThan(sectionA.averageLeadVolume);
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
