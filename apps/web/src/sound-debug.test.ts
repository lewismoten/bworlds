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
    expect(markup).toContain('Open Door');
  });

  it('normalizes unknown preset ids back to the default sound preset', () => {
    expect(normalizeSoundDebugPresetId('does-not-exist')).toBe('footstep-dirt');
  });
});
