import { describe, expect, it } from 'vitest';

import { shapeProceduralPhraseLeadNotes } from './procedural-music-lead-phrase.ts';

describe('procedural music lead phrase shaping', () => {
  it('quantizes lead starts to reusable measure subdivisions and connects durations', () => {
    const notes = shapeProceduralPhraseLeadNotes(
      [
        createLeadNote({ startMs: 210, durationMs: 90, releaseMs: 70 }),
        createLeadNote({ startMs: 640, durationMs: 85, releaseMs: 70 }),
        createLeadNote({ startMs: 1_360, durationMs: 90, releaseMs: 70 }),
        createLeadNote({ startMs: 1_780, durationMs: 85, releaseMs: 70 }),
      ],
      {
        phraseStartMs: 0,
        phraseDurationMs: 8_000,
        clusterX: 3,
        clusterY: -2,
      }
    );

    const firstMeasure = notes.filter((note) => note.startMs < 1_000);
    const secondMeasure = notes.filter(
      (note) => note.startMs >= 1_000 && note.startMs < 2_000
    );

    expect(
      firstMeasure.every(
        (note) =>
          Math.abs(note.startMs / 62.5 - Math.round(note.startMs / 62.5)) < 0.02
      )
    ).toBe(true);
    expect(
      secondMeasure.every(
        (note) =>
          Math.abs(note.startMs / 62.5 - Math.round(note.startMs / 62.5)) < 0.02
      )
    ).toBe(true);
    expect(firstMeasure[0]?.durationMs).toBeGreaterThanOrEqual(120);
    expect(firstMeasure[0]?.releaseMs).toBeGreaterThanOrEqual(70);
    expect(firstMeasure[0]!.startMs + firstMeasure[0]!.durationMs).toBeLessThan(
      firstMeasure[1]!.startMs
    );
  });

  it('keeps phrase-end rests at the end of the fourth and eighth measures', () => {
    const notes = shapeProceduralPhraseLeadNotes(
      [
        createLeadNote({ startMs: 3_320, durationMs: 120, releaseMs: 70 }),
        createLeadNote({ startMs: 7_260, durationMs: 120, releaseMs: 70 }),
      ],
      {
        phraseStartMs: 0,
        phraseDurationMs: 8_000,
        clusterX: 3,
        clusterY: -2,
      }
    );

    expect(notes).toHaveLength(2);
    expect(notes[0]!.startMs + notes[0]!.durationMs).toBeLessThanOrEqual(3_750);
    expect(notes[1]!.startMs + notes[1]!.durationMs).toBeLessThanOrEqual(7_750);
  });
});

function createLeadNote(overrides: {
  startMs: number;
  durationMs: number;
  releaseMs: number;
}) {
  return {
    themeId: 'frontier-plains',
    instrumentId: 'lead-flute',
    role: 'lead' as const,
    startMs: overrides.startMs,
    durationMs: overrides.durationMs,
    frequency: 440,
    volume: 0.5,
    waveform: 'sine' as const,
    timbre: 'soft' as const,
    attackMs: 20,
    releaseMs: overrides.releaseMs,
    detuneCents: 0,
    harmonicGain: 0.2,
    pulseRate: 0,
    emitter: { x: 0, y: 0, z: 0 },
    listener: { x: 0, y: 0, z: 0 },
  };
}
