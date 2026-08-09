import { describe, expect, it } from 'vitest';
import {
  buildRenderedProceduralSoundBufferKey,
  canRenderProceduralSoundToBuffer,
  renderProceduralSoundToBufferData,
  resolveRenderedSoundFrameCount,
} from './procedural-sound-render.ts';
import type { ProceduralSoundEffect } from './sound-effects.ts';

function createRenderableEffect(): ProceduralSoundEffect {
  return {
    kind: 'forest-ambience',
    nowMs: 0,
    frequency: 220,
    durationMs: 180,
    volume: 0.05,
    waveform: 'triangle',
    seed: 17,
    envelope: {
      attackMs: 6,
      decayMs: 30,
      sustainLevel: 0.52,
      releaseMs: 40,
    },
    layers: [
      {
        id: 'noise-bed',
        startOffsetMs: 24,
        frequency: 140,
        durationMs: 160,
        volume: 0.018,
        waveform: 'triangle',
        noiseColor: 'pink',
      },
    ],
  };
}

describe('procedural sound render', () => {
  it('accepts simple layered effects and rejects live-dsp effects', () => {
    expect(canRenderProceduralSoundToBuffer(createRenderableEffect())).toBe(
      true
    );
    expect(
      canRenderProceduralSoundToBuffer({
        ...createRenderableEffect(),
        tremolo: {
          rateHz: 4.2,
          depth: 0.3,
          waveform: 'sine',
        },
      })
    ).toBe(false);
  });

  it('produces deterministic cache keys and mixed sample data', () => {
    const effect = createRenderableEffect();

    const firstKey = buildRenderedProceduralSoundBufferKey(effect, 48_000);
    const secondKey = buildRenderedProceduralSoundBufferKey(effect, 48_000);
    const firstSamples = renderProceduralSoundToBufferData(effect, 48_000);
    const secondSamples = renderProceduralSoundToBufferData(effect, 48_000);

    expect(firstKey).toBe(secondKey);
    expect(Array.from(firstSamples)).toEqual(Array.from(secondSamples));
    expect(firstSamples.some((sample) => Math.abs(sample) > 0.001)).toBe(true);
  });

  it('accounts for layer offsets when calculating rendered frame counts', () => {
    const effect = createRenderableEffect();
    const sampleRate = 1_000;

    expect(resolveRenderedSoundFrameCount(effect, sampleRate)).toBe(184);
  });
});
