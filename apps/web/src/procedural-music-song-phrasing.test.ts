import { describe, expect, it } from 'vitest';
import { resolvePercussionFamilyFromInstrumentId } from './procedural-music-percussion.ts';
import { createProceduralMusicSong } from './procedural-music-song.ts';
import { resolveMusicTheme } from './procedural-music.ts';
import {
  PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT,
  collectMeasurePulseInWindow,
  collectPhraseNotes,
  repeatPhraseNotes,
  resolveMidiNote,
  resolvePhraseDurationMs,
} from './testing/procedural-music-song-test-support.ts';

describe('procedural music song phrasing', () => {
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
    const phraseDurationMs = resolvePhraseDurationMs(options);
    const phraseNotes = collectPhraseNotes(options, phraseDurationMs);
    const repeatedNotes = repeatPhraseNotes(phraseNotes, {
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
    const phraseDurationMs = resolvePhraseDurationMs(options);
    const phraseNotes = collectPhraseNotes(options, phraseDurationMs);
    const repeatedNotes = repeatPhraseNotes(phraseNotes, {
      phraseStartMs: options.nowMs,
      phraseDurationMs,
      songStartMs: options.nowMs,
      songDurationMs: resolvePhraseDurationMs(options) * 11,
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
        midiClass: resolveMidiNote(note.frequency) % 12,
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
        midiClass: resolveMidiNote(note.frequency) % 12,
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
      const phraseDurationMs = resolvePhraseDurationMs(options);
      const measureDurationMs =
        phraseDurationMs / PROCEDURAL_MUSIC_PHRASE_MEASURE_COUNT;
      const phraseNotes = collectPhraseNotes(options, phraseDurationMs);
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
    const phraseDurationMs = resolvePhraseDurationMs(options);
    const leadNotes = collectPhraseNotes(options, phraseDurationMs)
      .filter((note) => note.role === 'lead')
      .map((note) => resolveMidiNote(note.frequency));

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
      expect(((resolveMidiNote(finalLead!.frequency) % 12) + 12) % 12).toBe(
        theme.rootMidiNote % 12
      );
    }
  }, 3_000);

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
    const phraseNotes = collectPhraseNotes(
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
    const repeated = repeatPhraseNotes(phraseNotes, {
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
    const phraseDurationMs = resolvePhraseDurationMs(options);
    const percussionNotes = collectPhraseNotes(
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
