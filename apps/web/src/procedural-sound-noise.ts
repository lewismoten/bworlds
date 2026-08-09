import { createRandom } from '@bworlds/core';
import type { ProceduralNoiseColor } from './procedural-sound-effect-generator.ts';

export function createProceduralNoiseSamples(options: {
  color: ProceduralNoiseColor;
  frameCount: number;
  seed: number;
}): Float32Array {
  const frameCount = Math.max(1, Math.floor(options.frameCount));
  const random = createRandom(options.seed);

  switch (options.color) {
    case 'white':
      return createWhiteNoiseSamples(frameCount, random);
    case 'pink':
      return createPinkNoiseSamples(frameCount, random);
    case 'brown':
      return createBrownNoiseSamples(frameCount, random);
  }
}

function createWhiteNoiseSamples(
  frameCount: number,
  random: () => number
): Float32Array {
  const samples = new Float32Array(frameCount);
  for (let index = 0; index < frameCount; index += 1) {
    samples[index] = random() * 2 - 1;
  }
  return samples;
}

function createPinkNoiseSamples(
  frameCount: number,
  random: () => number
): Float32Array {
  const samples = new Float32Array(frameCount);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let index = 0; index < frameCount; index += 1) {
    const white = random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    samples[index] = clampSample(pink * 0.11);
  }

  return samples;
}

function createBrownNoiseSamples(
  frameCount: number,
  random: () => number
): Float32Array {
  const samples = new Float32Array(frameCount);
  let state = 0;

  for (let index = 0; index < frameCount; index += 1) {
    const white = random() * 2 - 1;
    state = (state + white * 0.12) / 1.02;
    samples[index] = clampSample(state * 3.5);
  }

  return samples;
}

function clampSample(value: number): number {
  return Math.min(1, Math.max(-1, value));
}
