import { describe, expect, it } from 'vitest';
import {
  createProceduralMusicSong,
  resolveProceduralMusicSongDurationMs,
} from './procedural-music-song.ts';
import { resolveMusicTheme } from './procedural-music.ts';
import { resolveProceduralScaleDegreeMidiNote } from './procedural-music-scale.ts';
import {
  collectLeadMotifRhythmShape,
  collectLeadPhraseClosing,
  collectLeadPhraseOpening,
  collectLeadSectionPitches,
  expectPhraseRhythmToMatch,
  resolveMidiNote,
} from './testing/procedural-music-song-test-support.ts';

describe('procedural music song structure', () => {
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
      expect.objectContaining({ startMeasure: 1, endMeasure: 8 })
    );
    expect(first.sections[1]).toEqual(
      expect.objectContaining({ startMeasure: 9, endMeasure: 24 })
    );
    expect(first.sections[2]).toEqual(
      expect.objectContaining({ startMeasure: 25, endMeasure: 40 })
    );
    expect(first.sections[3]).toEqual(
      expect.objectContaining({ startMeasure: 41, endMeasure: 56 })
    );
    expect(first.sections[4]).toEqual(
      expect.objectContaining({ startMeasure: 57, endMeasure: 72 })
    );
    expect(first.sections[5]).toEqual(
      expect.objectContaining({ startMeasure: 73, endMeasure: 80 })
    );
    expect(first.sections.at(-1)).toEqual(
      expect.objectContaining({ startMeasure: 81, endMeasure: 88 })
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
});
