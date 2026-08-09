import { describe, expect, it } from 'vitest';
import {
  resolveProceduralNoteFrequency,
  resolveProceduralNoteHarmonicGain,
} from './procedural-music-note-shaping.ts';

describe('procedural music note shaping', () => {
  it('keeps role register shifts on semitone boundaries', () => {
    const rootHz = 196;
    const bass = resolveProceduralNoteFrequency({
      rootHz,
      semitones: 7,
      role: 'bass',
    });
    const harmony = resolveProceduralNoteFrequency({
      rootHz,
      semitones: 7,
      role: 'harmony',
    });
    const percussion = resolveProceduralNoteFrequency({
      rootHz,
      semitones: 0,
      role: 'percussion',
    });

    expect(12 * Math.log2(bass / rootHz)).toBeCloseTo(-5, 6);
    expect(12 * Math.log2(harmony / rootHz)).toBeCloseTo(7, 6);
    expect(12 * Math.log2(percussion / rootHz)).toBeCloseTo(12, 6);
  });

  it('shapes brightness with harmonic color instead of pitch', () => {
    expect(
      resolveProceduralNoteHarmonicGain({
        baseHarmonicGain: 0.24,
        harmonicGainMultiplier: 1.1,
        moodBrightness: 0.78,
        brightnessMultiplier: 0.92,
      })
    ).toBeCloseTo(0.1894464, 6);
  });
});
