import { describe, expect, it } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';
import { validateMusicDebugTiming } from './music-debug-timing-validation.ts';

describe('music debug timing validation', () => {
  it('accepts deterministic snapshots whose sections align with planned measures and loop bounds', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
      encounterMode: 'ambient',
      dayProgress: 0.5,
      yearProgress: 0.25,
    });

    expect(snapshot.timingValidation).toEqual(
      expect.objectContaining({
        expectedMeasureCount: snapshot.measureCount,
        actualMeasureCount: snapshot.measureCount,
        isValidForMidiExport: true,
      })
    );
    expect(snapshot.song.sections[0]).toEqual(
      expect.objectContaining({
        label: 'Intro',
        startMeasure: 1,
        endMeasure: 8,
      })
    );
    expect(snapshot.song.sections[1]).toEqual(
      expect.objectContaining({
        label: 'Section A',
        startMeasure: 9,
        endMeasure: 24,
      })
    );
    expect(snapshot.loopStartOffsetMs).toBeLessThan(snapshot.loopEndOffsetMs);
    expect(snapshot.loopEndOffsetMs).toBeLessThanOrEqual(snapshot.durationMs);
  });

  it('flags invalid loop and measure metadata before midi export', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
    });

    const invalid = validateMusicDebugTiming({
      ...snapshot,
      loopStartOffsetMs: snapshot.durationMs,
      loopEndOffsetMs: snapshot.durationMs - 1_000,
      song: {
        ...snapshot.song,
        sections: snapshot.song.sections.map((section, index) =>
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
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
    });
    const intro = snapshot.song.sections[0]!;
    const introStartMs = snapshot.song.startMs + intro.startOffsetMs;
    const invalid = validateMusicDebugTiming({
      ...snapshot,
      song: {
        ...snapshot.song,
        notes: snapshot.song.notes.map((note, index) =>
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
