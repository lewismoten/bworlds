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

  it('preserves resolved amplitude envelopes on generated sounds', () => {
    const generator = createProceduralSoundEffectGenerator();
    const effect = generator.generate({
      kind: 'jump',
      nowMs: 1200,
      seed: 8,
      recipe: {
        id: 'jump-envelope',
        baseFrequency: 220,
        baseDurationMs: 140,
        baseVolume: 0.05,
        waveform: 'triangle',
        envelope: {
          attackMs: 8,
          decayMs: 36,
          sustainLevel: 0.52,
          releaseMs: 28,
        },
      },
    });

    expect(effect.envelope).toEqual({
      attackMs: 8,
      decayMs: 36,
      sustainLevel: 0.52,
      releaseMs: 28,
    });
  });

  it('preserves resolved pitch envelopes independently from volume envelopes', () => {
    const generator = createProceduralSoundEffectGenerator();
    const effect = generator.generate({
      kind: 'combat-magic',
      nowMs: 1400,
      seed: 13,
      recipe: {
        id: 'magic-pitch-envelope',
        baseFrequency: 244,
        baseDurationMs: 320,
        baseVolume: 0.05,
        waveform: 'triangle',
        envelope: {
          attackMs: 12,
          decayMs: 54,
          sustainLevel: 0.62,
          releaseMs: 68,
        },
        pitchEnvelope: {
          attackMs: 18,
          decayMs: 44,
          peakMultiplier: 1.05,
          sustainMultiplier: 0.94,
          releaseMs: 62,
          releaseTargetMultiplier: 0.9,
        },
      },
    });

    expect(effect.envelope).toEqual({
      attackMs: 12,
      decayMs: 54,
      sustainLevel: 0.62,
      releaseMs: 68,
    });
    expect(effect.pitchEnvelope).toEqual({
      attackMs: 18,
      decayMs: 44,
      peakMultiplier: 1.05,
      sustainMultiplier: 0.94,
      releaseMs: 62,
      releaseTargetMultiplier: 0.9,
    });
  });

  it('preserves deterministic filter chains on generated sounds', () => {
    const generator = createProceduralSoundEffectGenerator();
    const effect = generator.generate({
      kind: 'wind',
      nowMs: 1600,
      seed: 31,
      recipe: {
        id: 'wind-filters',
        baseFrequency: 180,
        baseDurationMs: 680,
        baseVolume: 0.018,
        waveform: 'triangle',
        filters: [
          {
            type: 'highpass',
            frequency: 320,
            q: 0.8,
          },
          {
            type: 'notch',
            frequency: 1100,
            q: 2.4,
            frequencyVariation: 0.04,
            qVariation: 0.1,
            envelope: {
              attackMs: 18,
              decayMs: 30,
              releaseMs: 42,
              peakFrequencyMultiplier: 1.2,
              sustainFrequencyMultiplier: 0.92,
              releaseFrequencyMultiplier: 0.84,
              peakQMultiplier: 1.15,
              sustainQMultiplier: 1.05,
              releaseQMultiplier: 0.9,
            },
          },
        ],
      },
    });

    expect(effect.filters).toEqual([
      {
        type: 'highpass',
        frequency: 320,
        q: 0.8,
        gain: undefined,
      },
      expect.objectContaining({
        type: 'notch',
        frequency: expect.any(Number),
        q: expect.any(Number),
      }),
    ]);
    expect(effect.filters?.[1]?.frequency).toBeGreaterThan(1000);
    expect(effect.filters?.[1]?.q).toBeGreaterThan(2);
    expect(effect.filters?.[1]?.envelope).toEqual({
      attackMs: 18,
      decayMs: 30,
      releaseMs: 42,
      peakFrequencyMultiplier: 1.2,
      sustainFrequencyMultiplier: 0.92,
      releaseFrequencyMultiplier: 0.84,
      peakQMultiplier: 1.15,
      sustainQMultiplier: 1.05,
      releaseQMultiplier: 0.9,
      peakGainMultiplier: undefined,
      sustainGainMultiplier: undefined,
      releaseGainMultiplier: undefined,
    });
  });

  it('preserves deterministic distortion and saturation settings', () => {
    const generator = createProceduralSoundEffectGenerator();
    const effect = generator.generate({
      kind: 'combat-weapon',
      nowMs: 1750,
      seed: 52,
      recipe: {
        id: 'combat-weapon-drive',
        baseFrequency: 210,
        baseDurationMs: 160,
        baseVolume: 0.056,
        waveform: 'sawtooth',
        distortion: {
          mode: 'distortion',
          amount: 0.42,
          outputGain: 0.76,
          amountVariation: 0.08,
          outputGainVariation: 0.05,
        },
      },
    });

    expect(effect.distortion).toEqual({
      mode: 'distortion',
      amount: expect.any(Number),
      outputGain: expect.any(Number),
    });
    expect(effect.distortion?.amount).toBeGreaterThan(0.38);
    expect(effect.distortion?.amount).toBeLessThan(0.46);
    expect(effect.distortion?.outputGain).toBeGreaterThan(0.72);
    expect(effect.distortion?.outputGain).toBeLessThan(0.8);
  });

  it('preserves deterministic delay and echo settings', () => {
    const generator = createProceduralSoundEffectGenerator();
    const effect = generator.generate({
      kind: 'combat-magic',
      nowMs: 1900,
      seed: 77,
      recipe: {
        id: 'combat-magic-echo',
        baseFrequency: 244,
        baseDurationMs: 320,
        baseVolume: 0.05,
        waveform: 'triangle',
        delay: {
          timeMs: 118,
          feedback: 0.32,
          mix: 0.24,
          timeVariation: 0.05,
          feedbackVariation: 0.08,
          mixVariation: 0.06,
        },
      },
    });

    expect(effect.delay).toEqual({
      timeMs: expect.any(Number),
      feedback: expect.any(Number),
      mix: expect.any(Number),
    });
    expect(effect.delay?.timeMs).toBeGreaterThan(112);
    expect(effect.delay?.timeMs).toBeLessThan(124);
    expect(effect.delay?.feedback).toBeGreaterThan(0.29);
    expect(effect.delay?.feedback).toBeLessThan(0.35);
    expect(effect.delay?.mix).toBeGreaterThan(0.22);
    expect(effect.delay?.mix).toBeLessThan(0.26);
  });

  it('preserves deterministic procedural reverb settings', () => {
    const generator = createProceduralSoundEffectGenerator();
    const effect = generator.generate({
      kind: 'cave-ambience',
      nowMs: 2100,
      seed: 91,
      recipe: {
        id: 'cave-ambience-reverb',
        baseFrequency: 118,
        baseDurationMs: 1680,
        baseVolume: 0.022,
        waveform: 'sine',
        reverb: {
          profileId: 'cavern-chamber',
          decayMs: 1480,
          mix: 0.34,
          preDelayMs: 24,
          toneHz: 3200,
          decayVariation: 0.05,
          mixVariation: 0.04,
          preDelayVariation: 0.08,
          toneVariation: 0.06,
        },
      },
    });

    expect(effect.reverb).toEqual({
      profileId: 'cavern-chamber',
      decayMs: expect.any(Number),
      mix: expect.any(Number),
      preDelayMs: expect.any(Number),
      toneHz: expect.any(Number),
    });
    expect(effect.reverb?.decayMs).toBeGreaterThan(1400);
    expect(effect.reverb?.decayMs).toBeLessThan(1560);
    expect(effect.reverb?.mix).toBeGreaterThan(0.32);
    expect(effect.reverb?.mix).toBeLessThan(0.36);
    expect(effect.reverb?.preDelayMs).toBeGreaterThan(22);
    expect(effect.reverb?.preDelayMs).toBeLessThan(26);
    expect(effect.reverb?.toneHz).toBeGreaterThan(3000);
    expect(effect.reverb?.toneHz).toBeLessThan(3400);
  });

  it('preserves deterministic tremolo modulation settings', () => {
    const generator = createProceduralSoundEffectGenerator();
    const effect = generator.generate({
      kind: 'wind',
      nowMs: 2250,
      seed: 111,
      recipe: {
        id: 'wind-tremolo',
        baseFrequency: 180,
        baseDurationMs: 680,
        baseVolume: 0.018,
        waveform: 'triangle',
        tremolo: {
          rateHz: 4.2,
          depth: 0.28,
          waveform: 'sine',
          rateVariation: 0.08,
          depthVariation: 0.06,
        },
      },
    });

    expect(effect.tremolo).toEqual({
      rateHz: expect.any(Number),
      depth: expect.any(Number),
      waveform: 'sine',
    });
    expect(effect.tremolo?.rateHz).toBeGreaterThan(3.8);
    expect(effect.tremolo?.rateHz).toBeLessThan(4.6);
    expect(effect.tremolo?.depth).toBeGreaterThan(0.25);
    expect(effect.tremolo?.depth).toBeLessThan(0.31);
  });

  it('preserves deterministic vibrato modulation settings', () => {
    const generator = createProceduralSoundEffectGenerator();
    const effect = generator.generate({
      kind: 'steam-whistle',
      nowMs: 2400,
      seed: 123,
      recipe: {
        id: 'steam-whistle-vibrato',
        baseFrequency: 370,
        baseDurationMs: 1050,
        baseVolume: 0.048,
        waveform: 'square',
        vibrato: {
          rateHz: 5.6,
          depthHz: 18,
          waveform: 'sine',
          rateVariation: 0.04,
          depthVariation: 0.08,
        },
      },
    });

    expect(effect.vibrato).toEqual({
      rateHz: expect.any(Number),
      depthHz: expect.any(Number),
      waveform: 'sine',
    });
    expect(effect.vibrato?.rateHz).toBeGreaterThan(5.3);
    expect(effect.vibrato?.rateHz).toBeLessThan(5.9);
    expect(effect.vibrato?.depthHz).toBeGreaterThan(16);
    expect(effect.vibrato?.depthHz).toBeLessThan(20);
  });

  it('preserves deterministic frequency modulation settings', () => {
    const generator = createProceduralSoundEffectGenerator();
    const effect = generator.generate({
      kind: 'combat-magic',
      nowMs: 2550,
      seed: 137,
      recipe: {
        id: 'combat-magic-fm',
        baseFrequency: 244,
        baseDurationMs: 320,
        baseVolume: 0.05,
        waveform: 'triangle',
        frequencyModulation: {
          modulatorFrequencyHz: 168,
          depthHz: 42,
          waveform: 'triangle',
          rateVariation: 0.05,
          depthVariation: 0.1,
        },
      },
    });

    expect(effect.frequencyModulation).toEqual({
      modulatorFrequencyHz: expect.any(Number),
      depthHz: expect.any(Number),
      waveform: 'triangle',
    });
    expect(effect.frequencyModulation?.modulatorFrequencyHz).toBeGreaterThan(
      159
    );
    expect(effect.frequencyModulation?.modulatorFrequencyHz).toBeLessThan(177);
    expect(effect.frequencyModulation?.depthHz).toBeGreaterThan(37);
    expect(effect.frequencyModulation?.depthHz).toBeLessThan(47);
  });
});
