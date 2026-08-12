import { describe, expect, it } from 'vitest';
import { createProceduralMusicSongSectionContext } from './procedural-music-song-section-context.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

describe('procedural music song section context', () => {
  it('derives measure and phrase state from a note inside a section', () => {
    const context = createProceduralMusicSongSectionContext({
      section: createSection('variation'),
      note: {
        role: 'lead',
        startMs: 13_000,
        instrumentId: 'deep-forest:lead:3:-2',
      },
      noteIndexInSection: 10,
      songStartMs: 1_000,
    });

    expect(context.sectionStartMs).toBe(1_000);
    expect(context.sectionEndMs).toBe(25_000);
    expect(context.measureDurationMs).toBe(1_500);
    expect(context.measureIndex).toBe(8);
    expect(context.measureCount).toBe(16);
    expect(context.sectionProgress).toBeCloseTo(0.5, 3);
    expect(context.phrasePosition).toBe(2);
    expect(context.meterPosition).toEqual({
      beatIndex: 0,
      beatNumber: 1,
      isStrongBeat: true,
    });
    expect(context.isGeneratedRepairNote).toBe(false);
  });

  it('recognizes generated repair notes from their instrument ids', () => {
    const context = createProceduralMusicSongSectionContext({
      section: createSection('a'),
      note: {
        role: 'lead',
        startMs: 1_000,
        instrumentId: 'deep-forest:lead:3:-2:measure-1-0',
      },
      noteIndexInSection: 0,
      songStartMs: 1_000,
    });

    expect(context.isGeneratedRepairNote).toBe(true);
    expect(context.phrasePosition).toBe(0);
    expect(context.measureIndex).toBe(0);
    expect(context.meterPosition).toEqual({
      beatIndex: 0,
      beatNumber: 1,
      isStrongBeat: true,
    });
  });
});

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
