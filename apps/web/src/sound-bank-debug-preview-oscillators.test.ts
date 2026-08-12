import { describe, expect, it } from 'vitest';
import {
  applySoundBankDebugPreviewOscillatorStateToNote,
  applySoundBankDebugPreviewOscillatorStateToInstrument,
  normalizeSoundBankDebugPreviewOscillatorState,
  resolveCarrierEnabled,
  resolveHarmonicEnabled,
  resolveSoundBankDebugPreviewOscillatorDefaults,
  SOUND_BANK_DEBUG_PREVIEW_OSCILLATOR_WAVEFORMS,
} from './sound-bank-debug-preview-oscillators.ts';

describe('sound bank debug preview oscillators', () => {
  it('normalizes debug oscillator overrides into a stable state', () => {
    expect(
      normalizeSoundBankDebugPreviewOscillatorState(
        {
          instrumentId: 'lead-square',
          carrierEnabled: false,
          harmonicEnabled: true,
          carrierWaveform: 'sawtooth',
          harmonicWaveform: 'triangle',
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
      carrierWaveform: 'sawtooth',
      harmonicWaveform: 'triangle',
      soloTarget: 'carrier',
    });
  });

  it('derives defaults from the generated patch gain structure', () => {
    expect(
      resolveSoundBankDebugPreviewOscillatorDefaults({
        id: 'lead-square',
        harmonicGain: 0.22,
        waveform: 'sine',
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
      carrierWaveform: 'sine',
      harmonicWaveform: 'triangle',
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
        carrierWaveform: 'triangle',
        harmonicWaveform: 'sawtooth',
        soloTarget: 'carrier',
      }
    );

    expect(note.timbre.fundamentalGainMultiplier).toBe(1);
    expect(note.harmonicGain).toBe(0);
    expect(note.waveform).toBe('triangle');
    expect(note.timbre.harmonicWaveform).toBe('sawtooth');
  });

  it('applies waveform overrides to instrument diagnostics without mutating other ids', () => {
    const instrument = applySoundBankDebugPreviewOscillatorStateToInstrument(
      {
        id: 'lead-square',
        waveform: 'square',
        harmonicGain: 0.22,
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
        instrumentId: 'lead-square',
        carrierEnabled: true,
        harmonicEnabled: true,
        carrierWaveform: 'triangle',
        harmonicWaveform: 'sawtooth',
        soloTarget: 'all',
      }
    );

    expect(instrument.waveform).toBe('triangle');
    expect(instrument.timbre.harmonicWaveform).toBe('sawtooth');
  });

  it('resolves effective enabled flags from solo state', () => {
    expect(
      resolveCarrierEnabled({
        carrierEnabled: false,
        harmonicEnabled: true,
        carrierWaveform: 'square',
        harmonicWaveform: 'triangle',
        soloTarget: 'carrier',
      })
    ).toBe(true);
    expect(
      resolveHarmonicEnabled({
        carrierEnabled: true,
        harmonicEnabled: true,
        carrierWaveform: 'square',
        harmonicWaveform: 'triangle',
        soloTarget: 'carrier',
      })
    ).toBe(false);
    expect(
      resolveCarrierEnabled({
        carrierEnabled: true,
        harmonicEnabled: false,
        carrierWaveform: 'square',
        harmonicWaveform: 'triangle',
        soloTarget: 'harmonic',
      })
    ).toBe(false);
    expect(SOUND_BANK_DEBUG_PREVIEW_OSCILLATOR_WAVEFORMS).toEqual([
      'sine',
      'triangle',
      'square',
      'sawtooth',
    ]);
  });
});
