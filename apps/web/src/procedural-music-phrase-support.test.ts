import { describe, expect, it } from 'vitest';

import { shapeProceduralPhraseSupportNotes } from './procedural-music-phrase-support.ts';

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
});

function createNote(overrides: {
  role: 'lead' | 'harmony' | 'bass' | 'percussion';
  startMs: number;
  durationMs: number;
  instrumentId: string;
  frequency: number;
}) {
  return {
    themeId: 'deep-forest',
    instrumentId: overrides.instrumentId,
    role: overrides.role,
    startMs: overrides.startMs,
    durationMs: overrides.durationMs,
    frequency: overrides.frequency,
    volume: 0.5,
    waveform: 'sine' as const,
    timbre: 'soft' as const,
    attackMs: 20,
    releaseMs: 120,
    detuneCents: 0,
    harmonicGain: 0.2,
    pulseRate: 0,
    space: {
      id: 'outdoor-air',
      label: 'open air',
      delayMs: 90,
      feedback: 0.2,
      wetGain: 0.18,
      toneHz: 2400,
    },
    emitter: { x: 0, y: 0, z: 0 },
    listener: { x: 0, y: 0, z: 0 },
  };
}
