import { describe, expect, it } from 'vitest';
import { isNoteInsideSongSection } from './procedural-music-song-boundaries.ts';
import {
  collectProceduralMusicPhraseNotes,
  PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT,
  repeatProceduralMusicPhraseNotes,
} from './procedural-music-song-phrase.ts';
import {
  createProceduralMusicSong,
  resolveProceduralMusicSongDurationMs,
} from './procedural-music-song.ts';
import { resolvePercussionFamilyFromInstrumentId } from './procedural-music-percussion.ts';
import { resolveMusicTheme } from './procedural-music.ts';
import { buildProceduralMusicSongSections } from './procedural-music-song-timing.ts';
import { resolveProceduralMusicBlueprint } from './procedural-music-blueprint.ts';
import { resolveProceduralScaleDegreeMidiNote } from './procedural-music-scale.ts';

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

  it('renders the plains 1-3-5-3 motif as scale degrees inside the opening Section A lead phrase', () => {
    const song = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 0,
      clusterY: 0,
    });
    const theme = resolveMusicTheme('plains', 'overworld', undefined, 0, 0);
    const sectionA = song.sections.find((section) => section.id === 'a')!;
    const sectionALead = song.notes
      .filter(
        (note) =>
          note.role === 'lead' &&
          note.startMs >= song.startMs + sectionA.startOffsetMs &&
          note.startMs <
            song.startMs + sectionA.startOffsetMs + sectionA.durationMs
      )
      .slice(0, 4)
      .map((note) => resolveMidiNote(note.frequency));

    expect(song.dna.leadMotif.slice(0, 4)).toEqual([0, 2, 4, 2]);
    expect(sectionALead).toEqual(
      [0, 2, 4, 2].map((degreeIndex) =>
        resolveProceduralScaleDegreeMidiNote({
          scaleMap: {
            rootMidiNote: theme.rootMidiNote,
            modePitchOffsets: theme.scale,
          },
          degreeIndex,
        })
      )
    );
  });

  it('renders motif notes through the selected mode instead of treating degrees as semitone offsets', () => {
    const clusterX = 3;
    const clusterY = -2;
    const song = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX,
      clusterY,
    });
    const theme = resolveMusicTheme(
      'forest',
      'overworld',
      undefined,
      clusterX,
      clusterY
    );
    const sectionA = song.sections.find((section) => section.id === 'a')!;
    const sectionALead = song.notes
      .filter(
        (note) =>
          note.role === 'lead' &&
          note.startMs >= song.startMs + sectionA.startOffsetMs &&
          note.startMs <
            song.startMs + sectionA.startOffsetMs + sectionA.durationMs
      )
      .slice(0, 4)
      .map((note) => resolveMidiNote(note.frequency));
    const expectedDegreeMidi = song.dna.leadMotif
      .slice(0, 4)
      .map((degreeIndex) =>
        resolveProceduralScaleDegreeMidiNote({
          scaleMap: {
            rootMidiNote: theme.rootMidiNote,
            modePitchOffsets: theme.scale,
          },
          degreeIndex,
        })
      );
    const semitoneInterpretation = song.dna.leadMotif
      .slice(0, 4)
      .map((degreeIndex) => theme.rootMidiNote + degreeIndex);

    expect(sectionALead).toEqual(expectedDegreeMidi);
    expect(sectionALead).not.toEqual(semitoneInterpretation);
  });

  it('builds an eight-measure phrase before repeating it across the full song', () => {
    const options = {
      nowMs: 1_000,
      tileKind: 'forest' as const,
      contextType: 'overworld' as const,
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    };
    const durationMs = resolveProceduralMusicSongDurationMs(options);
    const blueprint = resolveProceduralMusicBlueprint(options);
    const sections = buildProceduralMusicSongSections(blueprint, durationMs);
    const totalMeasures = sections.reduce(
      (sum, section) => sum + section.measureCount,
      0
    );
    const phraseDurationMs = Math.round(
      (durationMs / totalMeasures) * PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT
    );
    const phraseNotes = collectProceduralMusicPhraseNotes(
      options,
      phraseDurationMs
    );
    const repeatedNotes = repeatProceduralMusicPhraseNotes(phraseNotes, {
      phraseStartMs: options.nowMs,
      phraseDurationMs,
      songStartMs: options.nowMs,
      songDurationMs: durationMs,
    });

    expect(phraseNotes.length).toBeGreaterThan(0);
    expect(
      phraseNotes.every(
        (note) =>
          note.startMs >= options.nowMs &&
          note.startMs < options.nowMs + phraseDurationMs
      )
    ).toBe(true);

    const firstLeadPhrase = phraseNotes
      .filter((note) => note.role === 'lead')
      .slice(0, 8)
      .map((note) => ({
        offsetMs: Number((note.startMs - options.nowMs).toFixed(3)),
        durationMs: Number(note.durationMs.toFixed(3)),
        midiClass: Math.round(69 + 12 * Math.log2(note.frequency / 440)) % 12,
      }));
    const secondLeadPhrase = repeatedNotes
      .filter(
        (note) =>
          note.role === 'lead' &&
          note.startMs >= options.nowMs + phraseDurationMs &&
          note.startMs < options.nowMs + phraseDurationMs * 2
      )
      .slice(0, 8)
      .map((note) => ({
        offsetMs: Number(
          (note.startMs - (options.nowMs + phraseDurationMs)).toFixed(3)
        ),
        durationMs: Number(note.durationMs.toFixed(3)),
        midiClass: Math.round(69 + 12 * Math.log2(note.frequency / 440)) % 12,
      }));

    expect(firstLeadPhrase.length).toBeGreaterThan(0);
    expect(secondLeadPhrase).toEqual(firstLeadPhrase);
  });

  it('keeps the lead out of one-note-per-measure bars by holding two to six attacks per measure', () => {
    const optionSets = [
      {
        nowMs: 1_000,
        tileKind: 'forest' as const,
        contextType: 'overworld' as const,
        dayProgress: 0.45,
        yearProgress: 0.25,
        clusterX: 3,
        clusterY: -2,
      },
      {
        nowMs: 1_000,
        tileKind: 'town' as const,
        contextType: 'town' as const,
        dayProgress: 0.45,
        yearProgress: 0.25,
        clusterX: 7,
        clusterY: 4,
      },
      {
        nowMs: 1_000,
        tileKind: 'cave' as const,
        contextType: 'dungeon' as const,
        dayProgress: 0.45,
        yearProgress: 0.25,
        clusterX: -5,
        clusterY: 9,
      },
    ];

    for (const options of optionSets) {
      const durationMs = resolveProceduralMusicSongDurationMs(options);
      const blueprint = resolveProceduralMusicBlueprint(options);
      const sections = buildProceduralMusicSongSections(blueprint, durationMs);
      const totalMeasures = sections.reduce(
        (sum, section) => sum + section.measureCount,
        0
      );
      const phraseDurationMs = Math.round(
        (durationMs / totalMeasures) * PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT
      );
      const measureDurationMs =
        phraseDurationMs / PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT;
      const phraseNotes = collectProceduralMusicPhraseNotes(
        options,
        phraseDurationMs
      );
      const leadCountsByMeasure = Array.from(
        { length: PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT },
        () => 0
      );

      for (const note of phraseNotes) {
        if (note.role !== 'lead') {
          continue;
        }
        const measureIndex = Math.min(
          PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT - 1,
          Math.max(
            0,
            Math.floor((note.startMs - options.nowMs) / measureDurationMs)
          )
        );
        leadCountsByMeasure[measureIndex] += 1;
      }

      expect(
        leadCountsByMeasure.every((count) => count >= 2 && count <= 6)
      ).toBe(true);
    }
  });

  it('keeps repaired lead phrase attacks within an octave of nearby natural notes', () => {
    const options = {
      nowMs: 1_000,
      tileKind: 'forest' as const,
      contextType: 'overworld' as const,
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    };
    const durationMs = resolveProceduralMusicSongDurationMs(options);
    const blueprint = resolveProceduralMusicBlueprint(options);
    const sections = buildProceduralMusicSongSections(blueprint, durationMs);
    const totalMeasures = sections.reduce(
      (sum, section) => sum + section.measureCount,
      0
    );
    const phraseDurationMs = Math.round(
      (durationMs / totalMeasures) * PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT
    );
    const leadNotes = collectProceduralMusicPhraseNotes(
      options,
      phraseDurationMs
    )
      .filter((note) => note.role === 'lead')
      .map((note) => Math.round(69 + 12 * Math.log2(note.frequency / 440)));

    expect(leadNotes.length).toBeGreaterThan(2);

    for (let index = 1; index < leadNotes.length; index += 1) {
      expect(
        Math.abs(leadNotes[index]! - leadNotes[index - 1]!)
      ).toBeLessThanOrEqual(12);
    }
  });

  it('resolves the final lead cadence to scale degree 1 in the outro', () => {
    const optionSets = [
      {
        nowMs: 1_000,
        tileKind: 'forest' as const,
        contextType: 'overworld' as const,
        dayProgress: 0.45,
        yearProgress: 0.25,
        clusterX: 3,
        clusterY: -2,
      },
      {
        nowMs: 1_000,
        tileKind: 'town' as const,
        contextType: 'town' as const,
        dayProgress: 0.45,
        yearProgress: 0.25,
        clusterX: 7,
        clusterY: 4,
      },
      {
        nowMs: 1_000,
        tileKind: 'cave' as const,
        contextType: 'dungeon' as const,
        dayProgress: 0.45,
        yearProgress: 0.25,
        clusterX: -5,
        clusterY: 9,
      },
    ];

    for (const options of optionSets) {
      const song = createProceduralMusicSong(options);
      const theme = resolveMusicTheme(
        options.tileKind,
        options.contextType,
        undefined,
        options.clusterX,
        options.clusterY
      );
      const outro = song.sections.at(-1)!;
      const finalLead = [...song.notes]
        .reverse()
        .find(
          (note) =>
            note.role === 'lead' &&
            note.startMs >= song.startMs + outro.startOffsetMs &&
            note.startMs < song.startMs + outro.startOffsetMs + outro.durationMs
        );

      expect(finalLead).toBeDefined();
      expect(
        ((Math.round(69 + 12 * Math.log2(finalLead!.frequency / 440)) % 12) +
          12) %
          12
      ).toBe(theme.rootMidiNote % 12);
    }
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

  it('gives forest phrases a repeating multi-instrument percussion pulse', () => {
    const options = {
      nowMs: 1_000,
      tileKind: 'forest' as const,
      contextType: 'overworld' as const,
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    };
    const durationMs = resolveProceduralMusicSongDurationMs(options);
    const blueprint = resolveProceduralMusicBlueprint(options);
    const sections = buildProceduralMusicSongSections(blueprint, durationMs);
    const totalMeasures = sections.reduce(
      (sum, section) => sum + section.measureCount,
      0
    );
    const phraseDurationMs = Math.round(
      (durationMs / totalMeasures) * PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT
    );
    const percussionNotes = collectProceduralMusicPhraseNotes(
      options,
      phraseDurationMs
    ).filter((note) => note.role === 'percussion');

    expect(percussionNotes.length).toBeGreaterThan(6);
    expect(
      new Set(
        percussionNotes
          .map((note) =>
            resolvePercussionFamilyFromInstrumentId(note.instrumentId)
          )
          .filter((family) => family !== null)
      ).size
    ).toBeGreaterThan(1);

    let repeatedPulseClusters = 0;
    for (let index = 1; index < percussionNotes.length; index += 1) {
      if (
        percussionNotes[index]!.startMs - percussionNotes[index - 1]!.startMs <
        220
      ) {
        repeatedPulseClusters += 1;
      }
    }

    expect(repeatedPulseClusters).toBeGreaterThan(3);
    expect(
      percussionNotes.some(
        (note) =>
          resolvePercussionFamilyFromInstrumentId(note.instrumentId) ===
          'shaker'
      )
    ).toBe(true);
    expect(
      percussionNotes.some(
        (note) =>
          resolvePercussionFamilyFromInstrumentId(note.instrumentId) ===
          'hand-percussion'
      )
    ).toBe(true);
  });
});

function resolveMidiNote(frequency: number): number {
  return Math.round(69 + 12 * Math.log2(frequency / 440));
}
