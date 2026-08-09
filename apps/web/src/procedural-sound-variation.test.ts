import { describe, expect, it } from 'vitest';
import { constrainProceduralSoundCoreVariation } from './procedural-sound-variation.ts';

describe('procedural sound variation', () => {
  it('reduces overlapping core variation extremes before they distort identity', () => {
    const constrained = constrainProceduralSoundCoreVariation({
      baseFrequency: 220,
      baseDurationMs: 120,
      baseVolume: 0.05,
      frequency: 220 * 1.5,
      durationMs: 120 * 1.5,
      volume: 0.05 * 1.5,
      frequencyVariation: 0.5,
      durationVariation: 0.5,
      volumeVariation: 0.5,
      variationDepth: 1,
    });

    const normalizedFrequency = Math.abs(constrained.frequency / 220 - 1) / 0.5;
    const normalizedDuration = Math.abs(constrained.durationMs / 120 - 1) / 0.5;
    const normalizedVolume = Math.abs(constrained.volume / 0.05 - 1) / 0.5;

    expect(
      normalizedFrequency + normalizedDuration + normalizedVolume
    ).toBeLessThanOrEqual(2.150001);
    expect(normalizedFrequency + normalizedDuration).toBeLessThanOrEqual(
      1.500001
    );
  });
});
