import { describe, expect, it } from 'vitest';

import { shapeProceduralPhraseLeadNotes } from './procedural-music-lead-phrase.ts';

describe('procedural music lead phrase shaping', () => {
  it('quantizes lead starts before applying bounded timing humanization and connected durations', () => {
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
    const quantizedNotes = [...firstMeasure, ...secondMeasure];

    expect(firstMeasure).toHaveLength(2);
    expect(secondMeasure).toHaveLength(2);
    expect(
      quantizedNotes.every(
        (note) =>
          Math.abs(note.startMs / 62.5 - Math.round(note.startMs / 62.5)) <=
          14 / 62.5
      )
    ).toBe(true);
    expect(
      quantizedNotes.some(
        (note) =>
          Math.abs(note.startMs / 62.5 - Math.round(note.startMs / 62.5)) > 0.01
      )
    ).toBe(true);
    expect(firstMeasure[0]?.durationMs).toBeGreaterThanOrEqual(120);
    expect(firstMeasure[0]?.releaseMs).toBeGreaterThanOrEqual(122);
    expect(
      firstMeasure[1]!.startMs - firstMeasure[0]!.durationMs
    ).toBeGreaterThan(firstMeasure[0]!.startMs);
    expect(
      firstMeasure[1]!.startMs - firstMeasure[0]!.startMs
    ).toBeLessThanOrEqual(firstMeasure[0]!.durationMs + 12);
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
    expect(notes[0]!.startMs + notes[0]!.durationMs).toBe(3_750);
    expect(notes[1]!.startMs + notes[1]!.durationMs).toBe(7_750);
  });

  it('sustains phrase-ending lead notes longer than comparable non-ending notes', () => {
    const notes = shapeProceduralPhraseLeadNotes(
      [
        createLeadNote({ startMs: 220, durationMs: 120, releaseMs: 70 }),
        createLeadNote({ startMs: 3_220, durationMs: 120, releaseMs: 70 }),
      ],
      {
        phraseStartMs: 0,
        phraseDurationMs: 8_000,
        clusterX: 3,
        clusterY: -2,
      }
    );

    expect(notes).toHaveLength(2);
    expect(notes[1]!.durationMs).toBeGreaterThan(notes[0]!.durationMs);
    expect(notes[1]!.startMs + notes[1]!.durationMs).toBe(3_750);
  });

  it('pulls very late phrase-ending notes earlier so they can sustain into the rest', () => {
    const notes = shapeProceduralPhraseLeadNotes(
      [createLeadNote({ startMs: 3_700, durationMs: 90, releaseMs: 70 })],
      {
        phraseStartMs: 0,
        phraseDurationMs: 8_000,
        clusterX: 3,
        clusterY: -2,
      }
    );

    expect(notes).toHaveLength(1);
    expect(notes[0]!.startMs).toBeLessThan(3_700);
    expect(notes[0]!.durationMs).toBeGreaterThanOrEqual(160);
    expect(notes[0]!.startMs + notes[0]!.durationMs).toBe(3_750);
  });

  it('keeps short lead runs connected as one melodic sentence', () => {
    const notes = shapeProceduralPhraseLeadNotes(
      [
        createLeadNote({ startMs: 1_260, durationMs: 90, releaseMs: 70 }),
        createLeadNote({ startMs: 1_660, durationMs: 90, releaseMs: 70 }),
        createLeadNote({ startMs: 2_660, durationMs: 90, releaseMs: 70 }),
      ],
      {
        phraseStartMs: 0,
        phraseDurationMs: 8_000,
        clusterX: 3,
        clusterY: -2,
      }
    );

    const secondMeasure = notes.filter(
      (note) => note.startMs >= 1_000 && note.startMs < 2_000
    );
    const thirdMeasureNote = notes.find(
      (note) => note.startMs >= 2_000 && note.startMs < 3_000
    );

    expect(secondMeasure).toHaveLength(2);
    expect(
      secondMeasure[1]!.startMs - secondMeasure[0]!.startMs
    ).toBeLessThanOrEqual(secondMeasure[0]!.durationMs + 12);
    expect(secondMeasure[0]!.releaseMs).toBeGreaterThan(
      secondMeasure[1]!.releaseMs
    );
    expect(thirdMeasureNote?.releaseMs).toBeLessThan(70);
  });

  it('uses a softer attack for lead notes that connect legato into the next note', () => {
    const notes = shapeProceduralPhraseLeadNotes(
      [
        createLeadNote({ startMs: 1_260, durationMs: 90, releaseMs: 70 }),
        createLeadNote({ startMs: 1_660, durationMs: 90, releaseMs: 70 }),
      ],
      {
        phraseStartMs: 0,
        phraseDurationMs: 8_000,
        clusterX: 3,
        clusterY: -2,
      }
    );

    const firstNote = notes[0];
    const secondNote = notes[1];

    expect(firstNote).not.toBeUndefined();
    expect(secondNote).not.toBeUndefined();
    expect(firstNote!.attackMs).toBeLessThan(20);
    expect(firstNote!.releaseMs).toBeGreaterThan(secondNote!.releaseMs);
    expect(secondNote!.attackMs).toBeLessThanOrEqual(20);
  });

  it('shortens detached short notes into clearer staccato gaps', () => {
    const notes = shapeProceduralPhraseLeadNotes(
      [
        createLeadNote({ startMs: 210, durationMs: 90, releaseMs: 70 }),
        createLeadNote({ startMs: 1_360, durationMs: 90, releaseMs: 70 }),
      ],
      {
        phraseStartMs: 0,
        phraseDurationMs: 8_000,
        clusterX: 3,
        clusterY: -2,
      }
    );

    const firstMeasureNote = notes.find((note) => note.startMs < 1_000);
    const secondMeasureNote = notes.find((note) => note.startMs >= 1_000);

    expect(firstMeasureNote).not.toBeUndefined();
    expect(secondMeasureNote).not.toBeUndefined();
    expect(firstMeasureNote!.durationMs).toBeLessThanOrEqual(58);
    expect(firstMeasureNote!.attackMs).toBeLessThan(20);
    expect(firstMeasureNote!.releaseMs).toBeLessThan(70);
    expect(secondMeasureNote!.releaseMs).toBeLessThan(70);
  });

  it('keeps timing humanization deterministic for the same phrase inputs', () => {
    const inputNotes = [
      createLeadNote({ startMs: 210, durationMs: 90, releaseMs: 70 }),
      createLeadNote({ startMs: 640, durationMs: 85, releaseMs: 70 }),
      createLeadNote({ startMs: 1_360, durationMs: 90, releaseMs: 70 }),
      createLeadNote({ startMs: 1_780, durationMs: 85, releaseMs: 70 }),
    ];

    const first = shapeProceduralPhraseLeadNotes(inputNotes, {
      phraseStartMs: 0,
      phraseDurationMs: 8_000,
      clusterX: 3,
      clusterY: -2,
    });
    const second = shapeProceduralPhraseLeadNotes(inputNotes, {
      phraseStartMs: 0,
      phraseDurationMs: 8_000,
      clusterX: 3,
      clusterY: -2,
    });

    expect(second).toEqual(first);
  });
});

function createLeadNote(overrides: {
  startMs: number;
  durationMs: number;
  releaseMs: number;
}): {
  themeId: 'frontier-plains';
  instrumentId: string;
  role: 'lead';
  startMs: number;
  durationMs: number;
  frequency: number;
  volume: number;
  waveform: 'sine';
  timbre: {
    harmonicWaveform: 'triangle';
    harmonicRatio: number;
    filterType: 'lowpass';
    filterCutoffHz: number;
    filterQ: number;
  };
  attackMs: number;
  releaseMs: number;
  detuneCents: number;
  harmonicGain: number;
  pulseRate: number;
  emitter: { x: number; y: number; z: number };
  listener: { x: number; y: number; z: number };
} {
  return {
    themeId: 'frontier-plains',
    instrumentId: 'lead-flute',
    role: 'lead' as const,
    startMs: overrides.startMs,
    durationMs: overrides.durationMs,
    frequency: 440,
    volume: 0.5,
    waveform: 'sine' as const,
    timbre: {
      harmonicWaveform: 'triangle',
      harmonicRatio: 2,
      filterType: 'lowpass',
      filterCutoffHz: 1_200,
      filterQ: 0.8,
    },
    attackMs: 20,
    releaseMs: overrides.releaseMs,
    detuneCents: 0,
    harmonicGain: 0.2,
    pulseRate: 0,
    emitter: { x: 0, y: 0, z: 0 },
    listener: { x: 0, y: 0, z: 0 },
  };
}
