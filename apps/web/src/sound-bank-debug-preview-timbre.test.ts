import { describe, expect, it } from 'vitest';
import {
  applySoundBankDebugPreviewTimbreToNote,
  formatSoundBankDebugDetuneCents,
  normalizeSoundBankDebugPreviewTimbreState,
  resolveSoundBankDebugPreviewTimbreDefaults,
} from './sound-bank-debug-preview-timbre.ts';

describe('sound bank debug preview timbre', () => {
  it('normalizes debug timbre overrides into bounded preview values', () => {
    expect(
      normalizeSoundBankDebugPreviewTimbreState(
        {
          instrumentId: 'lead-square',
          detuneCents: 999,
          filterCutoffHz: 10,
          filterQ: 99,
          noiseMix: -2,
        },
        {
          instrumentId: 'fallback',
        }
      )
    ).toEqual({
      instrumentId: 'lead-square',
      detuneCents: 24,
      filterCutoffHz: 80,
      filterQ: 8,
      noiseMix: 0,
    });
  });

  it('derives defaults from the generated patch and applies them to preview notes', () => {
    const defaults = resolveSoundBankDebugPreviewTimbreDefaults({
      id: 'lead-square',
      detuneCents: 6,
      timbre: {
        harmonicWaveform: 'triangle',
        harmonicRatio: 2,
        filterType: 'lowpass',
        filterCutoffHz: 3_200,
        filterQ: 1.6,
        noiseMix: 0.18,
      },
    });

    expect(defaults).toEqual({
      instrumentId: 'lead-square',
      detuneCents: 6,
      filterCutoffHz: 3_200,
      filterQ: 1.6,
      noiseMix: 0.18,
    });

    const note = applySoundBankDebugPreviewTimbreToNote(
      {
        themeId: 'frontier-plains',
        role: 'lead',
        instrumentId: 'lead-square',
        startMs: 1_000,
        durationMs: 240,
        frequency: 440,
        waveform: 'square',
        attackMs: 12,
        releaseMs: 90,
        detuneCents: 0,
        harmonicGain: 0.22,
        pulseRate: 0.8,
        volume: 0.05,
        timbre: {
          harmonicWaveform: 'triangle',
          harmonicRatio: 2,
          filterType: 'lowpass',
          filterCutoffHz: 2_400,
          filterQ: 0.9,
          noiseMix: 0.02,
        },
      },
      defaults
    );

    expect(note.detuneCents).toBe(6);
    expect(note.timbre.filterCutoffHz).toBe(3_200);
    expect(note.timbre.filterQ).toBe(1.6);
    expect(note.timbre.noiseMix).toBe(0.18);
  });

  it('formats detune labels with explicit polarity', () => {
    expect(formatSoundBankDebugDetuneCents(7)).toBe('+7');
    expect(formatSoundBankDebugDetuneCents(-3)).toBe('-3');
  });
});
