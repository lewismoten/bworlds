import { describe, expect, it } from 'vitest';

import { shapeProceduralPhraseSupportNotes } from './procedural-music-phrase-support.ts';
import { resolveProceduralMidiNoteFrequency } from './procedural-music-scale.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

describe('procedural music phrase support', () => {
  it('extends support notes and keeps an anchor active through long lead rests', () => {
    const notes = shapeProceduralPhraseSupportNotes(
      [
        createNote({
          role: 'lead',
          startMs: 0,
          durationMs: 120,
          instrumentId: 'lead',
          frequency: 440,
        }),
        createNote({
          role: 'lead',
          startMs: 760,
          durationMs: 120,
          instrumentId: 'lead',
          frequency: 493.88,
        }),
        createNote({
          role: 'harmony',
          startMs: 0,
          durationMs: 140,
          instrumentId: 'harmony:root',
          frequency: 329.63,
        }),
        createNote({
          role: 'harmony',
          startMs: 0,
          durationMs: 140,
          instrumentId: 'harmony:third',
          frequency: 392,
        }),
        createNote({
          role: 'harmony',
          startMs: 0,
          durationMs: 140,
          instrumentId: 'harmony:fifth',
          frequency: 493.88,
        }),
        createNote({
          role: 'bass',
          startMs: 0,
          durationMs: 120,
          instrumentId: 'bass',
          frequency: 196,
        }),
      ],
      {
        phraseStartMs: 0,
        phraseDurationMs: 8_000,
      }
    );

    const harmony = notes.filter((note) => note.role === 'harmony');
    const bass = notes.find((note) => note.role === 'bass');
    const harmonyAnchors = notes.filter((note) =>
      note.instrumentId.includes(':anchor-')
    );

    expect(
      harmony.filter((note) => !note.instrumentId.includes(':anchor-'))
    ).toHaveLength(3);
    expect(
      harmony
        .filter((note) => !note.instrumentId.includes(':anchor-'))
        .every((note) => note.durationMs >= 300)
    ).toBe(true);
    expect(bass?.durationMs ?? 0).toBeGreaterThanOrEqual(180);
    expect(harmonyAnchors.length).toBeGreaterThan(0);
    expect(
      notes.some(
        (note) =>
          (note.role === 'harmony' || note.role === 'bass') &&
          note.startMs <= 440 &&
          note.startMs + note.durationMs > 440
      )
    ).toBe(true);
  });

  it('holds later-starting bass roots longer in cadence measures', () => {
    const notes = shapeProceduralPhraseSupportNotes(
      [
        createNote({
          role: 'bass',
          startMs: 3_665,
          durationMs: 120,
          instrumentId: 'bass:question',
          frequency: 196,
        }),
        createNote({
          role: 'bass',
          startMs: 7_665,
          durationMs: 120,
          instrumentId: 'bass:answer',
          frequency: 196,
        }),
      ],
      {
        phraseStartMs: 0,
        phraseDurationMs: 8_000,
      }
    );

    const questionBass = notes.find(
      (note) => note.instrumentId === 'bass:question'
    );
    const answerBass = notes.find(
      (note) => note.instrumentId === 'bass:answer'
    );

    expect(questionBass?.durationMs ?? 0).toBeGreaterThan(180);
    expect(answerBass?.durationMs ?? 0).toBeGreaterThan(
      questionBass?.durationMs ?? 0
    );
    expect((answerBass?.startMs ?? 0) + (answerBass?.durationMs ?? 0)).toBe(
      8_000
    );
  });

  it('thins later harmony attack clusters inside lead-busy measures', () => {
    const notes = shapeProceduralPhraseSupportNotes(
      [
        createNote({
          role: 'lead',
          startMs: 120,
          durationMs: 120,
          instrumentId: 'lead:0',
          frequency: 440,
        }),
        createNote({
          role: 'lead',
          startMs: 360,
          durationMs: 120,
          instrumentId: 'lead:1',
          frequency: 493.88,
        }),
        createNote({
          role: 'lead',
          startMs: 620,
          durationMs: 120,
          instrumentId: 'lead:2',
          frequency: 523.25,
        }),
        createNote({
          role: 'harmony',
          startMs: 80,
          durationMs: 160,
          instrumentId: 'harmony:first-root',
          frequency: 329.63,
        }),
        createNote({
          role: 'harmony',
          startMs: 80,
          durationMs: 160,
          instrumentId: 'harmony:first-third',
          frequency: 392,
        }),
        createNote({
          role: 'harmony',
          startMs: 520,
          durationMs: 160,
          instrumentId: 'harmony:later-root',
          frequency: 349.23,
        }),
        createNote({
          role: 'harmony',
          startMs: 520,
          durationMs: 160,
          instrumentId: 'harmony:later-third',
          frequency: 415.3,
        }),
      ],
      {
        phraseStartMs: 0,
        phraseDurationMs: 8_000,
      }
    );

    const activeHarmonyStarts = notes
      .filter(
        (note) =>
          note.role === 'harmony' &&
          note.durationMs > 0 &&
          !note.instrumentId.includes(':anchor-')
      )
      .map((note) => note.startMs);

    expect(activeHarmonyStarts).toEqual([80, 80]);
  });

  it('drops overlapping harmony notes below the lead core register inside the same measure', () => {
    const notes = shapeProceduralPhraseSupportNotes(
      [
        createNote({
          role: 'lead',
          startMs: 120,
          durationMs: 120,
          instrumentId: 'lead:0',
          frequency: resolveProceduralMidiNoteFrequency(69),
        }),
        createNote({
          role: 'lead',
          startMs: 360,
          durationMs: 120,
          instrumentId: 'lead:1',
          frequency: resolveProceduralMidiNoteFrequency(71),
        }),
        createNote({
          role: 'harmony',
          startMs: 80,
          durationMs: 160,
          instrumentId: 'harmony:already-low',
          frequency: resolveProceduralMidiNoteFrequency(60),
        }),
        createNote({
          role: 'harmony',
          startMs: 80,
          durationMs: 160,
          instrumentId: 'harmony:too-high',
          frequency: resolveProceduralMidiNoteFrequency(72),
        }),
        createNote({
          role: 'harmony',
          startMs: 520,
          durationMs: 160,
          instrumentId: 'harmony:also-too-high',
          frequency: resolveProceduralMidiNoteFrequency(68),
        }),
      ],
      {
        phraseStartMs: 0,
        phraseDurationMs: 8_000,
      }
    );

    const lowHarmony = notes.find(
      (note) => note.instrumentId === 'harmony:already-low'
    );
    const shiftedOctaveHarmony = notes.find(
      (note) => note.instrumentId === 'harmony:too-high'
    );
    const shiftedClusterHarmony = notes.find(
      (note) => note.instrumentId === 'harmony:also-too-high'
    );

    expect(Math.round(69 + 12 * Math.log2(lowHarmony!.frequency / 440))).toBe(
      60
    );
    expect(
      Math.round(69 + 12 * Math.log2(shiftedOctaveHarmony!.frequency / 440))
    ).toBe(60);
    expect(
      Math.round(69 + 12 * Math.log2(shiftedClusterHarmony!.frequency / 440))
    ).toBe(56);
  });
});

function createNote(overrides: {
  role: 'lead' | 'harmony' | 'bass' | 'percussion';
  startMs: number;
  durationMs: number;
  instrumentId: string;
  frequency: number;
}): ProceduralMusicNote {
  return {
    themeId: 'deep-forest',
    instrumentId: overrides.instrumentId,
    role: overrides.role,
    startMs: overrides.startMs,
    durationMs: overrides.durationMs,
    frequency: overrides.frequency,
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
    releaseMs: 120,
    detuneCents: 0,
    harmonicGain: 0.2,
    pulseRate: 0,
    space: {
      id: 'outdoor-air',
      label: 'open air',
      delayMs: 90,
      wetGain: 0.18,
      toneHz: 2400,
    },
    emitter: { x: 0, y: 0 },
    listener: { x: 0, y: 0 },
  };
}
