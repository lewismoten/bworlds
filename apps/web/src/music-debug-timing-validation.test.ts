import { describe, expect, it } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';
import { validateMusicDebugTiming } from './music-debug-timing-validation.ts';

const FOREST_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'forest',
  contextType: 'overworld',
  clusterX: 3,
  clusterY: -2,
  encounterMode: 'ambient',
  dayProgress: 0.5,
  yearProgress: 0.25,
});

describe('music debug timing validation', () => {
  it('accepts deterministic snapshots whose sections align with planned measures and loop bounds', () => {
    expect(FOREST_SNAPSHOT.timingValidation).toEqual(
      expect.objectContaining({
        expectedMeasureCount: FOREST_SNAPSHOT.measureCount,
        actualMeasureCount: FOREST_SNAPSHOT.measureCount,
        isValidForMidiExport: true,
      })
    );
    expect(FOREST_SNAPSHOT.song.sections[0]).toEqual(
      expect.objectContaining({
        label: 'Intro',
        startMeasure: 1,
        endMeasure: 8,
      })
    );
    expect(FOREST_SNAPSHOT.song.sections[1]).toEqual(
      expect.objectContaining({
        label: 'Section A',
        startMeasure: 9,
        endMeasure: 24,
      })
    );
    expect(FOREST_SNAPSHOT.loopStartOffsetMs).toBeLessThan(
      FOREST_SNAPSHOT.loopEndOffsetMs
    );
    expect(FOREST_SNAPSHOT.loopEndOffsetMs).toBeLessThanOrEqual(
      FOREST_SNAPSHOT.durationMs
    );
  });

  it('flags invalid loop and measure metadata before midi export', () => {
    const invalid = validateMusicDebugTiming({
      ...FOREST_SNAPSHOT,
      loopStartOffsetMs: FOREST_SNAPSHOT.durationMs,
      loopEndOffsetMs: FOREST_SNAPSHOT.durationMs - 1_000,
      song: {
        ...FOREST_SNAPSHOT.song,
        sections: FOREST_SNAPSHOT.song.sections.map((section, index) =>
          index === 0
            ? { ...section, endMeasure: section.endMeasure - 1 }
            : section
        ),
      },
    });

    expect(invalid.isValidForMidiExport).toBe(false);
    expect(
      invalid.messages.some((message) => message.includes('Loop range'))
    ).toBe(true);
    expect(
      invalid.messages.some((message) => message.includes('Intro measures'))
    ).toBe(true);
  });

  it('flags section notes that spill past their assigned boundary', () => {
    const intro = FOREST_SNAPSHOT.song.sections[0]!;
    const introStartMs = FOREST_SNAPSHOT.song.startMs + intro.startOffsetMs;
    const invalid = validateMusicDebugTiming({
      ...FOREST_SNAPSHOT,
      song: {
        ...FOREST_SNAPSHOT.song,
        notes: FOREST_SNAPSHOT.song.notes.map((note, index) =>
          index === 0
            ? {
                ...note,
                startMs: introStartMs,
                durationMs: intro.durationMs + 500,
              }
            : note
        ),
      },
    });

    expect(invalid.isValidForMidiExport).toBe(false);
    expect(
      invalid.messages.some((message) => message.includes('cross its boundary'))
    ).toBe(true);
  });
});
