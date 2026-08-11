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
    expect(markup).toContain('Minute export:');
    expect(markup).toContain('Sand Wind');
  });

  it('keeps curated ambient presets available and falls back to the default preset', () => {
    expect(AMBIENCE_DEBUG_PRESETS.length).toBeGreaterThan(1);
    expect(normalizeAmbienceDebugPresetId('missing')).toBe('plains-day');
  });

  it('includes the observatory magical preset with dedicated unnatural cues', () => {
    const snapshot = buildAmbienceDebugSnapshot('observatory-night');

    expect(snapshot.preset).toEqual(
      expect.objectContaining({
        id: 'observatory-night',
        kind: 'magical',
        tileKind: 'observatory',
      })
    );
    expect(snapshot.cues.map((cue) => cue.identityVariant)).toEqual([
      'void-whispers',
      'glass-resonance',
      'arcane-hum',
    ]);
  });

  it('reports minute and cue wav export metrics before download', () => {
    const snapshot = buildAmbienceDebugSnapshot('plains-day');
    const markup = buildAmbienceDebugShellMarkup(snapshot);

    expect(snapshot.minuteExportMetrics.durationLabel).toBe('60s');
    expect(snapshot.minuteExportMetrics.byteLengthLabel).toBe('5.49 MB');
    expect(snapshot.cues[0]?.exportMetrics.durationLabel).toMatch(/s$/);
    expect(markup).toContain(snapshot.minuteExportMetrics.byteLengthLabel);
    expect(markup).toContain(snapshot.cues[0]?.exportMetrics.byteLengthLabel);
  });
});
