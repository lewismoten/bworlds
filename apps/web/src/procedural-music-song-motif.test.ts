import { describe, expect, it } from 'vitest';
import {
  collectExpectedLeadMotifCoverage,
  regenerateSectionsMissingExpectedLeadMotifMatches,
  stateLeadMotifInFirstASection,
} from './procedural-music-song-motif.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

describe('procedural music song motif', () => {
  it('states the lead motif across the opening notes of section A', () => {
    const notes: ProceduralMusicNote[] = [
      createLeadNote(8_000, 392),
      createLeadNote(9_000, 440),
      createLeadNote(10_000, 493.883),
      createLeadNote(11_000, 440),
      createLeadNote(16_100, 523.251),
      createLeadNote(17_100, 587.33),
      createLeadNote(18_100, 659.255),
      createLeadNote(19_100, 587.33),
      createLeadNote(20_500, 523.251),
    ];
    const sections: ProceduralMusicSongSection[] = [
      createSection('intro', 0, 8_000, 8),
      createSection('a', 8_000, 16_000, 16),
    ];

    const updated = stateLeadMotifInFirstASection({
      notes,
      sections,
      songStartMs: 0,
      leadMotif: [0, 2, 4, 2],
      theme: {
        rootHz: 196,
        rootMidiNote: 55,
        scale: [0, 2, 4, 5, 7, 9, 10],
        noteDurationMs: 360,
      },
    });

    const firstStatement = updated
      .slice(0, 4)
      .map((note) => Math.round(69 + 12 * Math.log2(note.frequency / 440)));
    const firstStatementRhythm = updated.slice(0, 4).map((note) => ({
      startMs: note.startMs,
      durationMs: note.durationMs,
    }));
    const secondStatement = updated
      .slice(4, 8)
      .map((note) => Math.round(69 + 12 * Math.log2(note.frequency / 440)));
    const secondStatementRhythm = updated.slice(4, 8).map((note) => ({
      startMs: note.startMs,
      durationMs: note.durationMs,
    }));

    expect(firstStatement).toEqual([67, 71, 74, 71]);
    expect(secondStatement).toEqual([67, 71, 74, 71]);
    expect(firstStatementRhythm).toEqual([
      { startMs: 8_000, durationMs: 340 },
      { startMs: 8_500, durationMs: 338 },
      { startMs: 9_000, durationMs: 380 },
      { startMs: 9_750, durationMs: 520 },
    ]);
    expect(secondStatementRhythm).toEqual([
      { startMs: 16_000, durationMs: 340 },
      { startMs: 16_500, durationMs: 338 },
      { startMs: 17_000, durationMs: 380 },
      { startMs: 17_750, durationMs: 520 },
    ]);
    expect(updated[8]?.frequency).toBe(notes[8]?.frequency);
  });

  it("states a transposed motif variation in the opening notes of section A'", () => {
    const notes: ProceduralMusicNote[] = [
      createLeadNote(24_100, 392),
      createLeadNote(25_100, 440),
      createLeadNote(26_100, 493.883),
      createLeadNote(27_100, 440),
      createLeadNote(32_100, 523.251),
      createLeadNote(33_100, 587.33),
      createLeadNote(34_100, 659.255),
      createLeadNote(35_100, 587.33),
    ];
    const sections: ProceduralMusicSongSection[] = [
      createSection('intro', 0, 8_000, 8),
      createSection('a', 8_000, 16_000, 16),
      createSection('a-prime', 24_000, 16_000, 16),
    ];

    const updated = stateLeadMotifInFirstASection({
      notes,
      sections,
      songStartMs: 0,
      leadMotif: [0, 2, 4, 2],
      theme: {
        rootHz: 196,
        rootMidiNote: 55,
        scale: [0, 2, 4, 5, 7, 9, 10],
        noteDurationMs: 360,
      },
    });

    const firstVariation = updated
      .slice(0, 4)
      .map((note) => Math.round(69 + 12 * Math.log2(note.frequency / 440)));
    const firstVariationRhythm = updated.slice(0, 4).map((note) => ({
      startMs: note.startMs,
      durationMs: note.durationMs,
    }));
    const secondVariation = updated
      .slice(4, 8)
      .map((note) => Math.round(69 + 12 * Math.log2(note.frequency / 440)));
    const secondVariationRhythm = updated.slice(4, 8).map((note) => ({
      startMs: note.startMs,
      durationMs: note.durationMs,
    }));

    expect(firstVariation).toEqual([69, 72, 76, 72]);
    expect(secondVariation).toEqual([69, 72, 76, 72]);
    expect(firstVariationRhythm).toEqual([
      { startMs: 24_000, durationMs: 340 },
      { startMs: 24_500, durationMs: 338 },
      { startMs: 25_000, durationMs: 380 },
      { startMs: 25_750, durationMs: 520 },
    ]);
    expect(secondVariationRhythm).toEqual([
      { startMs: 32_000, durationMs: 340 },
      { startMs: 32_500, durationMs: 338 },
      { startMs: 33_000, durationMs: 380 },
      { startMs: 33_750, durationMs: 520 },
    ]);
  });

  it('regenerates expected motif sections when their match counts fall short', () => {
    const notes: ProceduralMusicNote[] = [
      createLeadNote(8_100, 392),
      createLeadNote(9_100, 392),
      createLeadNote(10_100, 392),
      createLeadNote(11_100, 392),
      createLeadNote(16_100, 392),
      createLeadNote(17_100, 392),
      createLeadNote(18_100, 392),
      createLeadNote(19_100, 392),
      createLeadNote(24_100, 392),
      createLeadNote(25_100, 392),
      createLeadNote(26_100, 392),
      createLeadNote(27_100, 392),
      createLeadNote(32_100, 392),
      createLeadNote(33_100, 392),
      createLeadNote(34_100, 392),
      createLeadNote(35_100, 392),
    ];
    const sections: ProceduralMusicSongSection[] = [
      createSection('intro', 0, 8_000, 8),
      createSection('a', 8_000, 16_000, 16),
      createSection('a-prime', 24_000, 16_000, 16),
    ];
    const theme = {
      rootHz: 196,
      rootMidiNote: 55,
      scale: [0, 2, 4, 5, 7, 9, 10],
      noteDurationMs: 360,
    };
    const leadMotif = [0, 2, 4, 2];

    expect(
      collectExpectedLeadMotifCoverage({
        notes,
        sections,
        songStartMs: 0,
        leadMotif,
        theme,
      })
    ).toEqual([
      expect.objectContaining({
        sectionId: 'a',
        exactMatchCount: 0,
        needsRegeneration: true,
      }),
      expect.objectContaining({
        sectionId: 'a-prime',
        variedMatchCount: 0,
        needsRegeneration: true,
      }),
    ]);

    const regenerated = regenerateSectionsMissingExpectedLeadMotifMatches(
      notes,
      {
        sections,
        songStartMs: 0,
        leadMotif,
        theme,
      }
    );
    const repairedCoverage = collectExpectedLeadMotifCoverage({
      notes: regenerated,
      sections,
      songStartMs: 0,
      leadMotif,
      theme,
    });

    expect(repairedCoverage).toEqual([
      expect.objectContaining({
        sectionId: 'a',
        exactMatchCount: 2,
        needsRegeneration: false,
      }),
      expect.objectContaining({
        sectionId: 'a-prime',
        variedMatchCount: 2,
        needsRegeneration: false,
      }),
    ]);
  });
});

function createSection(
  id: ProceduralMusicSongSection['id'],
  startOffsetMs: number,
  durationMs: number,
  measureCount: number
): ProceduralMusicSongSection {
  return {
    id,
    label: id,
    startOffsetMs,
    durationMs,
    loopEligible: id !== 'intro',
    measureCount,
    startMeasure: 1,
    endMeasure: measureCount,
    startTick: 0,
    endTick: measureCount * 1_920,
  };
}

function createLeadNote(
  startMs: number,
  frequency: number
): ProceduralMusicNote {
  return {
    themeId: 'frontier-plains',
    instrumentId: 'frontier-plains:lead:0:0',
    role: 'lead',
    startMs,
    durationMs: 220,
    frequency,
    volume: 0.04,
    waveform: 'triangle',
    timbre: {
      harmonicWaveform: 'sine',
      harmonicRatio: 2,
      filterType: 'lowpass',
      filterCutoffHz: 1_800,
      filterQ: 0.9,
    },
    attackMs: 24,
    releaseMs: 160,
    detuneCents: 0,
    harmonicGain: 0.3,
    pulseRate: 1,
  };
}
