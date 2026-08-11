import { describe, expect, it } from 'vitest';
import { resolveMusicTheme } from './procedural-music.ts';
import { resolveProceduralScaleDegreeMidiNote } from './procedural-music-scale.ts';
import {
  REPRESENTATIVE_FOREST_EXPLORATION_SONG,
  REPRESENTATIVE_PLAINS_EXPLORATION_SONG,
  collectLeadMotifRhythmShape,
  collectLeadPhraseClosing,
  collectLeadPhraseOpening,
  collectLeadSectionPitches,
  expectPhraseRhythmToMatch,
  resolveMidiNote,
} from './testing/procedural-music-song-test-support.ts';

describe('procedural music song structure motifs', () => {
  it('renders the plains 1-3-5-3 motif as scale degrees inside the opening Section A lead phrase', () => {
    const song = REPRESENTATIVE_PLAINS_EXPLORATION_SONG;
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
    const song = REPRESENTATIVE_PLAINS_EXPLORATION_SONG;
    const theme = resolveMusicTheme('plains', 'overworld', undefined, 0, 0);
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
    const song = REPRESENTATIVE_FOREST_EXPLORATION_SONG;
    const theme = resolveMusicTheme('forest', 'overworld', undefined, 3, -2);
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
    const song = REPRESENTATIVE_PLAINS_EXPLORATION_SONG;
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
    const song = REPRESENTATIVE_PLAINS_EXPLORATION_SONG;
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
    const song = REPRESENTATIVE_PLAINS_EXPLORATION_SONG;
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

  it('ends repeated and varied lead phrases with a closing note before the planned boundary rest', () => {
    const song = REPRESENTATIVE_PLAINS_EXPLORATION_SONG;
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

  it('reuses the opening motif pitches again in both Return and Outro', () => {
    const song = REPRESENTATIVE_PLAINS_EXPLORATION_SONG;
    const sectionA = song.sections.find((section) => section.id === 'a')!;
    const sectionReturn = song.sections.find(
      (section) => section.id === 'return'
    )!;
    const sectionOutro = song.sections.find(
      (section) => section.id === 'outro'
    )!;
    const openingPhraseA = collectLeadPhraseOpening(song, sectionA, 0);
    const openingPhraseReturn = collectLeadPhraseOpening(
      song,
      sectionReturn,
      0
    );
    const openingPhraseOutro = collectLeadPhraseOpening(song, sectionOutro, 0);

    expect(openingPhraseReturn.map((note) => note.midiNote)).toEqual(
      openingPhraseA.map((note) => note.midiNote)
    );
    expect(openingPhraseOutro.map((note) => note.midiNote)).toEqual(
      openingPhraseA.map((note) => note.midiNote)
    );
  });
});
