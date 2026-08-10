import { describe, expect, it } from 'vitest';
import {
  AMBIENCE_DEBUG_PRESETS,
  buildAmbienceDebugShellMarkup,
  buildAmbienceDebugSnapshot,
  normalizeAmbienceDebugPresetId,
} from './ambience-debug.ts';

describe('ambience debug page', () => {
  it('renders a dedicated ambience preview page with cue downloads and a minute export', () => {
    const snapshot = buildAmbienceDebugSnapshot('desert-day');
    const markup = buildAmbienceDebugShellMarkup(snapshot);

    expect(markup).toContain('<h1>Ambience Debug</h1>');
    expect(markup).toContain('Play Ambience');
    expect(markup).toContain('Download Minute');
    expect(markup).toContain('Download WAV');
    expect(markup).toContain('Sand Wind');
  });

  it('keeps curated ambient presets available and falls back to the default preset', () => {
    expect(AMBIENCE_DEBUG_PRESETS.length).toBeGreaterThan(1);
    expect(normalizeAmbienceDebugPresetId('missing')).toBe('plains-day');
  });
});
