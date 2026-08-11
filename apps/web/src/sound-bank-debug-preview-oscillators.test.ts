import { describe, expect, it } from 'vitest';
import {
  applySoundBankDebugPreviewOscillatorStateToNote,
  normalizeSoundBankDebugPreviewOscillatorState,
  resolveCarrierEnabled,
  resolveHarmonicEnabled,
  resolveSoundBankDebugPreviewOscillatorDefaults,
} from './sound-bank-debug-preview-oscillators.ts';

describe('sound bank debug preview oscillators', () => {
  it('normalizes debug oscillator overrides into a stable state', () => {
    expect(
      normalizeSoundBankDebugPreviewOscillatorState(
        {
          instrumentId: 'lead-square',
          carrierEnabled: false,
          harmonicEnabled: true,
          soloTarget: 'carrier',
        },
        {
          instrumentId: 'fallback',
        }
      )
    ).toEqual({
      instrumentId: 'lead-square',
      carrierEnabled: false,
      harmonicEnabled: true,
      soloTarget: 'carrier',
    });
  });

  it('derives defaults from the generated patch gain structure', () => {
    expect(
      resolveSoundBankDebugPreviewOscillatorDefaults({
        id: 'lead-square',
        harmonicGain: 0.22,
        timbre: {
          harmonicWaveform: 'triangle',
          harmonicRatio: 2,
          filterType: 'lowpass',
          filterCutoffHz: 2_400,
          filterQ: 0.9,
          fundamentalGainMultiplier: 0,
        },
      })
    ).toEqual({
      instrumentId: 'lead-square',
      carrierEnabled: false,
      harmonicEnabled: true,
      soloTarget: 'all',
    });
  });

  it('can solo the carrier oscillator in preview notes', () => {
    const note = applySoundBankDebugPreviewOscillatorStateToNote(
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
          fundamentalGainMultiplier: 1,
        },
      },
      {
        carrierEnabled: false,
        harmonicEnabled: true,
        soloTarget: 'carrier',
      }
    );

    expect(note.timbre.fundamentalGainMultiplier).toBe(1);
    expect(note.harmonicGain).toBe(0);
  });

  it('resolves effective enabled flags from solo state', () => {
    expect(
      resolveCarrierEnabled({
        carrierEnabled: false,
        harmonicEnabled: true,
        soloTarget: 'carrier',
      })
    ).toBe(true);
    expect(
      resolveHarmonicEnabled({
        carrierEnabled: true,
        harmonicEnabled: true,
        soloTarget: 'carrier',
      })
    ).toBe(false);
    expect(
      resolveCarrierEnabled({
        carrierEnabled: true,
        harmonicEnabled: false,
        soloTarget: 'harmonic',
      })
    ).toBe(false);
  });
});
