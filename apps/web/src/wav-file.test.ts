import { describe, expect, it } from 'vitest';
import { encodeMonoPcm16Wav } from './wav-file.ts';

describe('wav file encoder', () => {
  it('encodes mono 16-bit pcm wav data with a RIFF/WAVE header', () => {
    const wav = encodeMonoPcm16Wav({
      samples: new Float32Array([0, 0.5, -0.5, 1, -1]),
      sampleRate: 48_000,
    });
    const view = new DataView(wav.buffer);
    const decoder = new TextDecoder();

    expect(decoder.decode(wav.slice(0, 4))).toBe('RIFF');
    expect(decoder.decode(wav.slice(8, 12))).toBe('WAVE');
    expect(decoder.decode(wav.slice(12, 16))).toBe('fmt ');
    expect(decoder.decode(wav.slice(36, 40))).toBe('data');
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(48_000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(10);
  });
});
