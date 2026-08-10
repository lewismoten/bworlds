import { describe, expect, it } from 'vitest';
import { buildSoundDebugWaveformMarkup } from './sound-debug-waveform.ts';

describe('sound debug waveform', () => {
  it('renders an svg waveform preview for rendered sound samples', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 1, -1, 0.25, -0.25, 0]);
    const markup = buildSoundDebugWaveformMarkup(samples, {
      width: 320,
      height: 96,
      samplePoints: 16,
    });

    expect(markup).toContain('<svg viewBox="0 0 320 96"');
    expect(markup).toContain('sound-debug-waveform-axis');
    expect(markup).toContain('sound-debug-waveform-shape');
    expect(markup).toContain('polyline');
  });
});
