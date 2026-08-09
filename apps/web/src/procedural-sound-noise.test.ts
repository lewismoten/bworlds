import { describe, expect, it } from 'vitest';
import { createProceduralNoiseSamples } from './procedural-sound-noise.ts';

describe('procedural sound noise', () => {
  it('reproduces deterministic white noise from a seed', () => {
    const first = createProceduralNoiseSamples({
      color: 'white',
      frameCount: 8,
      seed: 12,
    });
    const second = createProceduralNoiseSamples({
      color: 'white',
      frameCount: 8,
      seed: 12,
    });

    expect(Array.from(second)).toEqual(Array.from(first));
  });

  it('supports white, pink, and brown noise within the audio range', () => {
    const colors = ['white', 'pink', 'brown'] as const;

    for (const color of colors) {
      const samples = createProceduralNoiseSamples({
        color,
        frameCount: 64,
        seed: 99,
      });

      expect(samples).toHaveLength(64);
      expect(samples.some((sample) => sample !== 0)).toBe(true);
      expect(samples.every((sample) => sample >= -1 && sample <= 1)).toBe(true);
    }
  });
});
