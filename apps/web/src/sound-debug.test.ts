import { describe, expect, it } from 'vitest';
import {
  buildSoundDebugShellMarkup,
  createSoundDebugRenderableSnapshot,
  normalizeSoundDebugPresetId,
} from './sound-debug.ts';

describe('sound debug page', () => {
  it('renders a dedicated sound preview page with preset selection and export controls', () => {
    const snapshot = createSoundDebugRenderableSnapshot('open-door');
    const markup = buildSoundDebugShellMarkup(snapshot);

    expect(markup).toContain('<h1>Sound Debug</h1>');
    expect(markup).toContain('id="sound-debug-preset-list"');
    expect(markup).toContain('id="sound-debug-play"');
    expect(markup).toContain('Download WAV');
    expect(markup).toContain('sound-debug-waveform');
    expect(markup).toContain('sound-debug-details');
    expect(markup).toContain('Preview Duration');
    expect(markup).toContain('Preview WAV Size');
    expect(markup).toContain('Open Door');
  });

  it('warns when the rendered preview export exceeds the size budget', () => {
    const snapshot = {
      ...createSoundDebugRenderableSnapshot('open-door'),
      exportMetrics: {
        durationSeconds: 1.3,
        durationLabel: '1.3s',
        byteLength: 120_000,
        byteLengthLabel: '117.2 KB',
        warningByteLimit: 98_304,
        warningByteLimitLabel: '96.0 KB',
        exceedsWarningLimit: true,
      },
    };
    const markup = buildSoundDebugShellMarkup(snapshot);

    expect(markup).toContain('sound-debug-export-warning');
    expect(markup).toContain('117.2 KB');
    expect(markup).toContain('96.0 KB');
  });

  it('normalizes unknown preset ids back to the default sound preset', () => {
    expect(normalizeSoundDebugPresetId('does-not-exist')).toBe('footstep-dirt');
  });
});
