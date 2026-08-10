import { describe, expect, it } from 'vitest';
import type { ProceduralMusicNote } from './procedural-music.ts';
import { transformSongSectionNote } from './procedural-music-song-variation.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

const BASE_NOTE: ProceduralMusicNote = {
  themeId: 'deep-forest',
  instrumentId: 'deep-forest:lead:0:0',
  role: 'lead',
  startMs: 10_000,
  durationMs: 320,
  frequency: 440,
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

function createSection(
  id: ProceduralMusicSongSection['id']
): ProceduralMusicSongSection {
  return {
    id,
    label: id,
    startOffsetMs: 0,
    durationMs: 24_000,
    loopEligible: true,
    measureCount: 16,
    startMeasure: 1,
    endMeasure: 16,
    startTick: 0,
    endTick: 16 * 1920,
  };
}

describe('procedural music song variation', () => {
  it("changes A' phrase endings with transposition and a small rhythm shift", () => {
    const transformed = transformSongSectionNote(
      BASE_NOTE,
      createSection('a-prime'),
      7,
      0
    );

    expect(transformed).not.toBeNull();
    expect(transformed?.startMs).toBeGreaterThan(BASE_NOTE.startMs);
    expect(transformed?.frequency).toBeGreaterThan(BASE_NOTE.frequency);
  });

  it('creates a more distinct variation section with changed notes and timing', () => {
    const transformed = transformSongSectionNote(
      BASE_NOTE,
      createSection('variation'),
      4,
      0
    );

    expect(transformed).not.toBeNull();
    expect(transformed?.startMs).toBe(BASE_NOTE.startMs);
    expect(transformed?.frequency).toBeGreaterThan(BASE_NOTE.frequency);
    expect(transformed?.durationMs).toBeGreaterThan(BASE_NOTE.durationMs);
  });

  it('keeps repaired lead density notes from picking up extra section transposition', () => {
    const repairedLeadNote: ProceduralMusicNote = {
      ...BASE_NOTE,
      instrumentId: 'deep-forest:lead:0:0:measure-1-0',
    };

    const aPrime = transformSongSectionNote(
      repairedLeadNote,
      createSection('a-prime'),
      7,
      0
    );
    const variation = transformSongSectionNote(
      repairedLeadNote,
      createSection('variation'),
      4,
      0
    );

    expect(aPrime).not.toBeNull();
    expect(variation).not.toBeNull();
    expect(aPrime?.frequency).toBe(repairedLeadNote.frequency);
    expect(variation?.frequency).toBe(repairedLeadNote.frequency);
  });

  it('keeps the base A section unchanged', () => {
    expect(
      transformSongSectionNote(BASE_NOTE, createSection('a'), 3, 0)
    ).toEqual(BASE_NOTE);
  });
});
