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

  it('assigns deterministic lead rhythm identities to each named song section', () => {
    const noteIndexInSection = 2;
    const intro = transformSongSectionNote(
      BASE_NOTE,
      createSection('intro'),
      noteIndexInSection,
      0
    );
    const sectionA = transformSongSectionNote(
      BASE_NOTE,
      createSection('a'),
      noteIndexInSection,
      0
    );
    const sectionAPrime = transformSongSectionNote(
      BASE_NOTE,
      createSection('a-prime'),
      noteIndexInSection,
      0
    );
    const sectionB = transformSongSectionNote(
      BASE_NOTE,
      createSection('b'),
      noteIndexInSection,
      0
    );
    const variation = transformSongSectionNote(
      BASE_NOTE,
      createSection('variation'),
      noteIndexInSection,
      0
    );
    const sectionReturn = transformSongSectionNote(
      BASE_NOTE,
      createSection('return'),
      noteIndexInSection,
      0
    );
    const outro = transformSongSectionNote(
      BASE_NOTE,
      createSection('outro'),
      noteIndexInSection,
      0
    );

    expect(intro).not.toBeNull();
    expect(sectionA).not.toBeNull();
    expect(sectionAPrime).not.toBeNull();
    expect(sectionB).not.toBeNull();
    expect(variation).not.toBeNull();
    expect(sectionReturn).not.toBeNull();
    expect(outro).not.toBeNull();
    expect(sectionA).toEqual(BASE_NOTE);
    expect(sectionAPrime?.startMs).toBe(sectionA?.startMs);
    expect(sectionAPrime?.durationMs).toBeGreaterThanOrEqual(
      sectionA?.durationMs ?? 0
    );
    expect(intro?.durationMs).toBeGreaterThan(sectionA?.durationMs ?? 0);
    expect(sectionB?.startMs).not.toBe(sectionA?.startMs);
    expect(variation?.startMs).not.toBe(sectionA?.startMs);
    expect(sectionReturn?.startMs).not.toBe(sectionA?.startMs);
    expect(outro?.durationMs).toBeGreaterThan(sectionA?.durationMs ?? 0);
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
