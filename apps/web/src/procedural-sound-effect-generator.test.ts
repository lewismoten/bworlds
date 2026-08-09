import { describe, expect, it } from 'vitest';
import { createProceduralSoundEffectGenerator } from './procedural-sound-effect-generator.ts';

describe('procedural sound effect generator', () => {
  it('reproduces the same effect from the same seed and recipe', () => {
    const generator = createProceduralSoundEffectGenerator();
    const recipe = {
      id: 'forest-step',
      baseFrequency: 160,
      baseDurationMs: 90,
      baseVolume: 0.04,
      waveform: ['triangle', 'square'] as const,
      frequencyVariation: 0.04,
      durationVariation: 0.08,
      volumeVariation: 0.06,
    };

    const first = generator.generate({
      kind: 'footstep',
      nowMs: 100,
      seed: 42,
      recipe,
    });
    const second = generator.generate({
      kind: 'footstep',
      nowMs: 100,
      seed: 42,
      recipe,
    });

    expect(second).toEqual(first);
  });

  it('keeps seeded variation inside the recipe bounds', () => {
    const generator = createProceduralSoundEffectGenerator();
    const recipe = {
      id: 'wind-layer',
      baseFrequency: 200,
      baseDurationMs: 800,
      baseVolume: 0.02,
      waveform: ['triangle', 'sine', 'sawtooth'] as const,
      frequencyVariation: 0.03,
      durationVariation: 0.1,
      volumeVariation: 0.08,
    };

    const effect = generator.generate({
      kind: 'wind',
      nowMs: 250,
      seed: 7,
      recipe,
    });

    expect(effect.frequency).toBeGreaterThanOrEqual(200 * 0.97);
    expect(effect.frequency).toBeLessThanOrEqual(200 * 1.03);
    expect(effect.durationMs).toBeGreaterThanOrEqual(800 * 0.9);
    expect(effect.durationMs).toBeLessThanOrEqual(800 * 1.1);
    expect(effect.volume).toBeGreaterThanOrEqual(0.02 * 0.92);
    expect(effect.volume).toBeLessThanOrEqual(0.02 * 1.08);
    expect(['triangle', 'sine', 'sawtooth']).toContain(effect.waveform);
  });

  it('can disable variation depth for identity-critical sounds', () => {
    const generator = createProceduralSoundEffectGenerator();
    const effect = generator.generate({
      kind: 'combat-weapon',
      nowMs: 500,
      seed: 99,
      recipe: {
        id: 'combat-weapon',
        baseFrequency: 210,
        baseDurationMs: 160,
        baseVolume: 0.056,
        waveform: 'sawtooth',
        frequencyVariation: 0.2,
        durationVariation: 0.2,
        volumeVariation: 0.2,
        variationDepth: 0,
      },
    });

    expect(effect).toEqual(
      expect.objectContaining({
        frequency: 210,
        durationMs: 160,
        volume: 0.056,
        waveform: 'sawtooth',
      })
    );
  });
});
