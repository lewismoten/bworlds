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
import type { ProceduralMusicNote } from './procedural-music.ts';
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

  it("states a clear transposed motif at the opening of Section A'", () => {
    const clusterX = 0;
    const clusterY = 0;
    const song = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX,
      clusterY,
    });
    const theme = resolveMusicTheme(
      'plains',
      'overworld',
      undefined,
      clusterX,
      clusterY
    );
    const sectionAPrime = song.sections.find(
      (section) => section.id === 'a-prime'
    )!;
    const sectionAPrimeLead = song.notes
      .filter(
        (note) =>
          note.role === 'lead' &&
          note.startMs >= song.startMs + sectionAPrime.startOffsetMs &&
          note.startMs <
            song.startMs +
              sectionAPrime.startOffsetMs +
              sectionAPrime.durationMs
      )
      .slice(0, 4)
      .map((note) => resolveMidiNote(note.frequency));

    expect(sectionAPrimeLead).toEqual(
      [1, 3, 5, 3].map((degreeIndex) =>
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

    expect(sectionALead.map((midiNote) => midiNote % 12)).toEqual(
      expectedDegreeMidi.map((midiNote) => midiNote % 12)
    );
    expect(sectionALead.map((midiNote) => midiNote % 12)).not.toEqual(
      semitoneInterpretation.map((midiNote) => midiNote % 12)
    );
  });

  it("keeps the motif rhythm recognizable between Section A and Section A'", () => {
    const clusterX = 0;
    const clusterY = 0;
    const song = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX,
      clusterY,
    });
    const sectionA = song.sections.find((section) => section.id === 'a')!;
    const sectionAPrime = song.sections.find(
      (section) => section.id === 'a-prime'
    )!;
    const sectionARhythm = collectLeadMotifRhythmShape(song, sectionA).slice(
      0,
      4
    );
    const sectionAPrimeRhythm = collectLeadMotifRhythmShape(
      song,
      sectionAPrime
    ).slice(0, 4);

    expect(sectionARhythm).toEqual([
      { offsetRatio: 0, durationRatio: 0.021 },
      { offsetRatio: 0.031, durationRatio: 0.017 },
      { offsetRatio: 0.062, durationRatio: 0.024 },
      { offsetRatio: 0.109, durationRatio: 0.032 },
    ]);
    expect(sectionAPrimeRhythm).toEqual(sectionARhythm);
  });

  it("varies only motif pitch content between Section A and Section A'", () => {
    const clusterX = 0;
    const clusterY = 0;
    const song = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX,
      clusterY,
    });
    const sectionA = song.sections.find((section) => section.id === 'a')!;
    const sectionAPrime = song.sections.find(
      (section) => section.id === 'a-prime'
    )!;
    const sectionAPitches = collectLeadSectionPitches(song, sectionA).slice(
      0,
      4
    );
    const sectionAPrimePitches = collectLeadSectionPitches(
      song,
      sectionAPrime
    ).slice(0, 4);
    const sectionARhythm = collectLeadMotifRhythmShape(song, sectionA).slice(
      0,
      4
    );
    const sectionAPrimeRhythm = collectLeadMotifRhythmShape(
      song,
      sectionAPrime
    ).slice(0, 4);

    expect(sectionAPrimeRhythm).toEqual(sectionARhythm);
    expect(sectionAPrimePitches).not.toEqual(sectionAPitches);
    expect(sectionAPrimePitches).toHaveLength(sectionAPitches.length);
  });

  it("repeats Section A's opening phrase before introducing the A' variation", () => {
    const song = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 0,
      clusterY: 0,
    });
    const sectionA = song.sections.find((section) => section.id === 'a')!;
    const sectionAPrime = song.sections.find(
      (section) => section.id === 'a-prime'
    )!;
    const openingPhraseA1 = collectLeadPhraseOpening(song, sectionA, 0);
    const openingPhraseA2 = collectLeadPhraseOpening(song, sectionA, 1);
    const openingPhraseAPrime = collectLeadPhraseOpening(
      song,
      sectionAPrime,
      0
    );

    expect(openingPhraseA1.length).toBe(4);
    expect(openingPhraseA2.map((note) => note.midiNote)).toEqual(
      openingPhraseA1.map((note) => note.midiNote)
    );
    expectPhraseRhythmToMatch(openingPhraseA2, openingPhraseA1);
    expectPhraseRhythmToMatch(openingPhraseAPrime, openingPhraseA1);
    expect(openingPhraseAPrime.map((note) => note.midiNote)).not.toEqual(
      openingPhraseA1.map((note) => note.midiNote)
    );
  });

  it('makes the variation section audibly distinct through changed lead rhythm', () => {
    const song = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    });
    const sectionA = song.sections.find((section) => section.id === 'a')!;
    const variation = song.sections.find(
      (section) => section.id === 'variation'
    )!;
    const sectionARhythm = collectLeadMotifRhythmShape(song, sectionA).slice(
      0,
      4
    );
    const variationRhythm = collectLeadMotifRhythmShape(song, variation).slice(
      0,
      4
    );

    expect(sectionARhythm).toHaveLength(4);
    expect(variationRhythm).toHaveLength(4);
    expect(variationRhythm).not.toEqual(sectionARhythm);
  });

  it('assigns a stable lead rhythm identity to each song section', () => {
    const song = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'forest',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 3,
      clusterY: -2,
    });
    const intro = song.sections.find((section) => section.id === 'intro')!;
    const sectionA = song.sections.find((section) => section.id === 'a')!;
    const sectionAPrime = song.sections.find(
      (section) => section.id === 'a-prime'
    )!;
    const sectionB = song.sections.find((section) => section.id === 'b')!;
    const variation = song.sections.find(
      (section) => section.id === 'variation'
    )!;
    const sectionReturn = song.sections.find(
      (section) => section.id === 'return'
    )!;
    const outro = song.sections.find((section) => section.id === 'outro')!;

    const introRhythm = collectLeadMotifRhythmShape(song, intro).slice(0, 4);
    const sectionARhythm = collectLeadMotifRhythmShape(song, sectionA).slice(
      0,
      4
    );
    const sectionAPrimeRhythm = collectLeadMotifRhythmShape(
      song,
      sectionAPrime
    ).slice(0, 4);
    const sectionBRhythm = collectLeadMotifRhythmShape(song, sectionB).slice(
      0,
      4
    );
    const variationRhythm = collectLeadMotifRhythmShape(song, variation).slice(
      0,
      4
    );
    const returnRhythm = collectLeadMotifRhythmShape(song, sectionReturn).slice(
      0,
      4
    );
    const outroRhythm = collectLeadMotifRhythmShape(song, outro).slice(0, 4);

    expect(introRhythm).toHaveLength(4);
    expect(sectionARhythm).toHaveLength(4);
    expect(sectionAPrimeRhythm).toEqual(sectionARhythm);
    expect(sectionBRhythm).toHaveLength(4);
    expect(variationRhythm).toHaveLength(4);
    expect(returnRhythm).toHaveLength(4);
    expect(outroRhythm).toHaveLength(4);
    expect(introRhythm).not.toEqual(sectionARhythm);
    expect(sectionBRhythm).not.toEqual(sectionARhythm);
    expect(variationRhythm).not.toEqual(sectionARhythm);
    expect(returnRhythm).not.toEqual(sectionARhythm);
    expect(outroRhythm).not.toEqual(sectionARhythm);
  });

  it('ends repeated and varied lead phrases with a closing note before the planned boundary rest', () => {
    const song = createProceduralMusicSong({
      nowMs: 1_000,
      tileKind: 'plains',
      contextType: 'overworld',
      dayProgress: 0.45,
      yearProgress: 0.25,
      clusterX: 0,
      clusterY: 0,
    });
    const sectionA = song.sections.find((section) => section.id === 'a')!;
    const sectionAPrime = song.sections.find(
      (section) => section.id === 'a-prime'
    )!;
    const phraseClosings = [
      collectLeadPhraseClosing(song, sectionA, 0),
      collectLeadPhraseClosing(song, sectionA, 1),
      collectLeadPhraseClosing(song, sectionAPrime, 0),
    ];

    for (const closing of phraseClosings) {
      expect(closing).not.toBeNull();
      expect(closing!.startRatio).toBeGreaterThanOrEqual(0.84);
      expect(closing!.durationRatio).toBeGreaterThanOrEqual(0.01);
      expect(closing!.endRatio).toBeLessThan(1);
    }
  });

  it('keeps a stable recurring bass pulse when the generated phrase repeats', () => {
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
      songDurationMs: phraseDurationMs * 2,
    });
    const firstCycle = collectMeasurePulseInWindow(
      repeatedNotes,
      'bass',
      options.nowMs,
      phraseDurationMs,
      8
    );
    const secondCycle = collectMeasurePulseInWindow(
      repeatedNotes,
      'bass',
      options.nowMs + phraseDurationMs,
      phraseDurationMs,
      8
    );

    expect(firstCycle).toHaveLength(8);
    expect(secondCycle).toEqual(firstCycle);
    expect(
      firstCycle.filter((measure) => measure.attackCount > 0).length
    ).toBeGreaterThanOrEqual(6);
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

  it('keeps repeated phrase boundaries from restarting the lead more than a fifth away', () => {
    const phraseDurationMs = 16_000;
    const phraseNotes = collectProceduralMusicPhraseNotes(
      {
        nowMs: 1_000,
        tileKind: 'forest',
        contextType: 'overworld',
        dayProgress: 0.45,
        yearProgress: 0.25,
        clusterX: 3,
        clusterY: -2,
      },
      phraseDurationMs
    );
    const repeated = repeatProceduralMusicPhraseNotes(phraseNotes, {
      phraseStartMs: 1_000,
      phraseDurationMs,
      songStartMs: 1_000,
      songDurationMs: phraseDurationMs * 3,
    });
    const leadStarts = repeated.filter((note) => note.role === 'lead');
    const firstLeadByPhrase = [0, 1, 2]
      .map((phraseIndex) =>
        leadStarts.find(
          (note) =>
            note.startMs >= 1_000 + phraseIndex * phraseDurationMs &&
            note.startMs < 1_000 + (phraseIndex + 1) * phraseDurationMs
        )
      )
      .filter(
        (note): note is (typeof leadStarts)[number] => note !== undefined
      );

    expect(firstLeadByPhrase).toHaveLength(3);

    for (let index = 1; index < firstLeadByPhrase.length; index += 1) {
      const previous = firstLeadByPhrase[index - 1]!;
      const current = firstLeadByPhrase[index]!;
      const boundaryLeap = Math.abs(
        12 * Math.log2(current.frequency / previous.frequency)
      );

      expect(boundaryLeap).toBeLessThanOrEqual(7);
    }
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
          resolvePercussionFamilyFromInstrumentId(note.instrumentId) === 'kick'
      )
    ).toBe(true);
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

function collectLeadMotifRhythmShape(
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

function collectLeadPhraseOpening(
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

function collectLeadPhraseClosing(
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

function expectPhraseRhythmToMatch(
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

function collectLeadSectionPitches(
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

function countRoleNotesByMeasure(
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

function averageRoleDurationByMeasure(
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

function collectMeasurePulseInWindow(
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

function averageNoteVelocity(
  notes: ReadonlyArray<ProceduralMusicNote & { velocity: number }>
): number {
  return averageCounts(notes.map((note) => note.velocity));
}

function averageNoteVolume(notes: readonly ProceduralMusicNote[]): number {
  return averageCounts(notes.map((note) => note.volume));
}

function averageCounts(values: readonly number[]): number {
  return (
    values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
  );
}
