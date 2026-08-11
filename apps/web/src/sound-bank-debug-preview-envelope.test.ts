import { describe, expect, it } from 'vitest';
import {
  applySoundBankDebugPreviewEnvelopeToNote,
  normalizeSoundBankDebugPreviewEnvelopeState,
  resolveSoundBankDebugPreviewDecayMs,
} from './sound-bank-debug-preview-envelope.ts';

describe('sound bank debug preview envelope', () => {
  it('normalizes live envelope overrides into bounded preview values', () => {
    expect(
      normalizeSoundBankDebugPreviewEnvelopeState(
        {
          instrumentId: 'lead-square',
          attackMs: -40,
          decayMs: 999,
          sustainLevel: 2,
          releaseMs: 0,
        },
        {
          instrumentId: 'fallback',
        }
      )
    ).toEqual({
      instrumentId: 'lead-square',
      attackMs: 1,
      decayMs: 240,
      sustainLevel: 1,
      releaseMs: 20,
    });
  });

  it('applies debug envelope overrides to preview notes without mutating other timbre fields', () => {
    const note = applySoundBankDebugPreviewEnvelopeToNote(
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
          bodySustainLevel: 0.82,
          harmonicBodyLevel: 0.74,
          noiseMix: 0.18,
        },
      },
      {
        attackMs: 28,
        decayMs: 96,
        sustainLevel: 0.67,
        releaseMs: 180,
      }
    );

    expect(note.attackMs).toBe(28);
    expect(note.releaseMs).toBe(180);
    expect(note.timbre.bodySettleMs).toBe(96);
    expect(note.timbre.bodySustainLevel).toBe(0.67);
    expect(note.timbre.harmonicBodyLevel).toBeCloseTo(0.59, 5);
    expect(note.timbre.noiseMix).toBe(0.18);
  });

  it('derives the default decay window from attack timing when a patch does not define one yet', () => {
    expect(
      resolveSoundBankDebugPreviewDecayMs({
        attackMs: 18,
        timbre: {
          harmonicWaveform: 'triangle',
          harmonicRatio: 2,
          filterType: 'lowpass',
          filterCutoffHz: 2_000,
          filterQ: 0.9,
        },
      })
    ).toBe(20);
  });
});
