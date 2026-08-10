import { describe, expect, it } from 'vitest';

import { applyProceduralSongDensityPlan } from './procedural-music-song-density.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

describe('procedural music song density', () => {
  it('thins intro and outro lead measures while ramping variation density toward the center', () => {
    const notes = applyProceduralSongDensityPlan({
      notes: [
        ...createMeasureLeadNotes(0, 8, 4),
        ...createMeasureLeadNotes(8_000, 16, 4),
        ...createMeasureLeadNotes(24_000, 8, 4),
      ],
      sections: [
        createSection('intro', 0, 8_000, 8),
        createSection('variation', 8_000, 16_000, 16),
        createSection('outro', 24_000, 8_000, 8),
      ],
      songStartMs: 0,
    });

    expect(
      countRoleNotesByMeasure(notes, 0, 8_000, 8, 'lead').map(
        (count) => count <= 3
      )
    ).not.toContain(false);
    expect(
      countRoleNotesByMeasure(notes, 24_000, 8_000, 8, 'lead').at(-1)
    ).toBeLessThanOrEqual(1);

    const variationCounts = countRoleNotesByMeasure(
      notes,
      8_000,
      16_000,
      16,
      'lead'
    );
    const earlyVariation = average(variationCounts.slice(0, 4));
    const lateVariation = average(variationCounts.slice(6, 10));

    expect(lateVariation).toBeGreaterThan(earlyVariation);
  });

  it('preserves accompaniment inside measures where the lead is resting', () => {
    const notes = applyProceduralSongDensityPlan({
      notes: [
        ...createMeasureLeadNotes(0, 1, 4),
        ...createHarmonyNotesForMeasure(0, 1),
      ],
      sections: [createSection('variation', 0, 16_000, 16)],
      songStartMs: 0,
    });

    const secondMeasureSupport = notes.filter(
      (note) =>
        (note.role === 'harmony' || note.role === 'bass') &&
        note.startMs >= 1_000 &&
        note.startMs < 2_000
    );

    expect(
      notes.every(
        (note) =>
          !(
            note.role === 'lead' &&
            note.startMs >= 1_000 &&
            note.startMs < 2_000
          )
      )
    ).toBe(true);
    expect(secondMeasureSupport.length).toBeGreaterThan(0);
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
    loopEligible: id !== 'outro',
    measureCount,
    startMeasure: 1,
    endMeasure: measureCount,
    startTick: 0,
    endTick: measureCount * 1920,
  };
}

function createMeasureLeadNotes(
  sectionStartMs: number,
  measureCount: number,
  notesPerMeasure: number
) {
  const notes = [];
  for (let measureIndex = 0; measureIndex < measureCount; measureIndex += 1) {
    for (let noteIndex = 0; noteIndex < notesPerMeasure; noteIndex += 1) {
      notes.push(
        createNote({
          role: 'lead',
          instrumentId:
            noteIndex >= 2
              ? `lead-flute:measure-${measureIndex}-${noteIndex}`
              : 'lead-flute',
          startMs:
            sectionStartMs + measureIndex * 1_000 + 140 + noteIndex * 170,
        })
      );
    }
  }
  return notes;
}

function createHarmonyNotesForMeasure(
  sectionStartMs: number,
  measureIndex: number
) {
  return [
    createNote({
      role: 'harmony',
      instrumentId: `strings:voice-0`,
      startMs: sectionStartMs + measureIndex * 1_000 + 80,
    }),
    createNote({
      role: 'harmony',
      instrumentId: `strings:voice-1`,
      startMs: sectionStartMs + measureIndex * 1_000 + 340,
    }),
  ];
}

function createNote(overrides: {
  role: 'lead' | 'harmony' | 'bass' | 'percussion';
  instrumentId: string;
  startMs: number;
}) {
  return {
    themeId: 'frontier-plains',
    instrumentId: overrides.instrumentId,
    role: overrides.role,
    startMs: overrides.startMs,
    durationMs: 120,
    frequency: 440,
    volume: 0.5,
    waveform: 'sine' as const,
    timbre: 'soft' as const,
    attackMs: 20,
    releaseMs: 80,
    detuneCents: 0,
    harmonicGain: 0.2,
    pulseRate: 0,
  };
}

function countRoleNotesByMeasure(
  notes: ReturnType<typeof applyProceduralSongDensityPlan>,
  sectionStartMs: number,
  sectionDurationMs: number,
  measureCount: number,
  role: 'lead' | 'harmony' | 'bass' | 'percussion'
) {
  const measureDurationMs = sectionDurationMs / measureCount;
  return Array.from(
    { length: measureCount },
    (_, measureIndex) =>
      notes.filter(
        (note) =>
          note.role === role &&
          note.startMs >= sectionStartMs + measureIndex * measureDurationMs &&
          note.startMs < sectionStartMs + (measureIndex + 1) * measureDurationMs
      ).length
  );
}

function average(values: readonly number[]): number {
  return (
    values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
  );
}
