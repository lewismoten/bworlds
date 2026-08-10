import { describe, expect, it } from 'vitest';
import { stateLeadMotifInFirstASection } from './procedural-music-song-motif.ts';
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
    const secondStatement = updated
      .slice(4, 8)
      .map((note) => Math.round(69 + 12 * Math.log2(note.frequency / 440)));

    expect(firstStatement).toEqual([67, 71, 74, 71]);
    expect(secondStatement).toEqual([67, 71, 74, 71]);
    expect(updated[8]?.frequency).toBe(notes[8]?.frequency);
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
