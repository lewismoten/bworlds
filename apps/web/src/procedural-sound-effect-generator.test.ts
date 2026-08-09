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
      noiseColor: ['white', 'pink', 'brown'] as const,
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
    expect(['white', 'pink', 'brown']).toContain(effect.noiseColor);
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

  it('builds deterministic layered oscillator and noise components', () => {
    const generator = createProceduralSoundEffectGenerator();
    const effect = generator.generate({
      kind: 'wind',
      nowMs: 750,
      seed: 21,
      recipe: {
        id: 'wind-stack',
        baseFrequency: 180,
        baseDurationMs: 680,
        baseVolume: 0.018,
        waveform: 'triangle',
        layers: [
          {
            id: 'noise-bed',
            waveform: 'triangle',
            noiseColor: 'brown',
            frequencyMultiplier: 0.72,
            volumeMultiplier: 0.58,
          },
          {
            id: 'air-whistle',
            waveform: 'sine',
            frequencyMultiplier: 1.22,
            volumeMultiplier: 0.3,
          },
        ],
      },
    });

    expect(effect.layers).toEqual([
      expect.objectContaining({
        id: 'noise-bed',
        waveform: 'triangle',
        noiseColor: 'brown',
      }),
      expect.objectContaining({
        id: 'air-whistle',
        waveform: 'sine',
        noiseColor: undefined,
      }),
    ]);
    expect(effect.layers?.[0]?.frequency).toBeCloseTo(129.6, 4);
    expect(effect.layers?.[1]?.frequency).toBeCloseTo(219.6, 4);
  });

  it('preserves ordered frequency sweep definitions on generated sounds', () => {
    const generator = createProceduralSoundEffectGenerator();
    const effect = generator.generate({
      kind: 'combat-magic',
      nowMs: 900,
      seed: 5,
      recipe: {
        id: 'combat-magic-sweep',
        baseFrequency: 244,
        baseDurationMs: 320,
        baseVolume: 0.05,
        waveform: 'triangle',
        sweeps: [
          {
            curve: 'linear',
            targetMultiplier: 0.86,
            atProgress: 1,
          },
          {
            curve: 'linear',
            targetMultiplier: 1.18,
            atProgress: 0.3,
          },
        ],
      },
    });

    expect(effect.sweeps).toEqual([
      {
        curve: 'linear',
        targetMultiplier: 1.18,
        targetFrequency: undefined,
        atProgress: 0.3,
      },
      {
        curve: 'linear',
        targetMultiplier: 0.86,
        targetFrequency: undefined,
        atProgress: 1,
      },
    ]);
  });
});
