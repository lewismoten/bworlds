import { describe, expect, it } from 'vitest';
import {
  renderMusicDebugPreviewNoteToSamples,
  resolveEnvelopeGain,
  resolveHarmonicEnvelopeGain,
  resolveTransientEnvelopeGain,
} from './music-debug-preview-wav.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

describe('music debug preview wav', () => {
  it('adds deterministic breath noise when a timbre requests a noise layer', () => {
    const cleanNote = createPreviewNote();
    const airyNote = createPreviewNote({
      timbre: {
        ...createPreviewNote().timbre,
        noiseMix: 0.2,
        noiseFilterType: 'highpass',
        noiseFilterCutoffHz: 3_200,
        noiseFilterQ: 0.7,
      },
    });

    const cleanSamples = renderMusicDebugPreviewNoteToSamples(cleanNote, 8_000);
    const airySamples = renderMusicDebugPreviewNoteToSamples(airyNote, 8_000);

    expect(airySamples).not.toEqual(cleanSamples);
    expect(averageSampleDifference(cleanSamples, airySamples)).toBeGreaterThan(
      0.005
    );
  });

  it('keeps bowed string envelopes higher through the sustain body than a plain patch', () => {
    const plainNote = createPreviewNote({
      timbre: {
        ...createPreviewNote().timbre,
        attackPeakGainMultiplier: 1,
        bodySustainLevel: 0.74,
      },
    });
    const bowedNote = createPreviewNote({
      waveform: 'triangle',
      timbre: {
        ...createPreviewNote().timbre,
        harmonicWaveform: 'sawtooth',
        attackPeakGainMultiplier: 1.1,
        bodySustainLevel: 0.92,
      },
    });

    const plainSamples = renderMusicDebugPreviewNoteToSamples(plainNote, 8_000);
    const bowedSamples = renderMusicDebugPreviewNoteToSamples(bowedNote, 8_000);

    expect(bowedSamples).not.toEqual(plainSamples);
    expect(resolveEnvelopeGain(bowedNote, 0.12, bowedNote.durationMs / 1000)).toBeGreaterThan(
      resolveEnvelopeGain(plainNote, 0.12, plainNote.durationMs / 1000)
    );
  });

  it('lets bass harmonic envelopes fade sooner than the main body envelope', () => {
    const bassNote = createPreviewNote({
      role: 'bass',
      frequency: 110,
      waveform: 'sine',
      timbre: {
        ...createPreviewNote().timbre,
        harmonicWaveform: 'triangle',
        fundamentalGainMultiplier: 1.16,
        harmonicBodyLevel: 0.36,
        harmonicReleaseLeadMs: 80,
      },
      attackMs: 40,
      releaseMs: 140,
    });

    expect(
      resolveHarmonicEnvelopeGain(bassNote, 0.12, bassNote.durationMs / 1000)
    ).toBeLessThan(
      resolveEnvelopeGain(bassNote, 0.12, bassNote.durationMs / 1000)
    );
    expect(
      renderMusicDebugPreviewNoteToSamples(bassNote, 8_000)
    ).toBeDefined();
  });

  it('keeps struck transient envelopes short and front-loaded', () => {
    const struckNote = createPreviewNote({
      waveform: 'triangle',
      timbre: {
        ...createPreviewNote().timbre,
        transientMix: 0.2,
        transientDurationMs: 32,
        transientFilterType: 'highpass',
        transientFilterCutoffHz: 2_600,
        transientFilterQ: 0.9,
      },
      attackMs: 14,
      releaseMs: 100,
    });

    expect(
      resolveTransientEnvelopeGain(struckNote, 0.004, struckNote.durationMs / 1000)
    ).toBeGreaterThan(0.5);
    expect(
      resolveTransientEnvelopeGain(struckNote, 0.05, struckNote.durationMs / 1000)
    ).toBe(0);
    expect(renderMusicDebugPreviewNoteToSamples(struckNote, 8_000)).toBeDefined();
  });
});

function averageSampleDifference(
  left: Float32Array,
  right: Float32Array
): number {
  let total = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    total += Math.abs((left[index] ?? 0) - (right[index] ?? 0));
  }
  return total / Math.max(1, length);
}

function createPreviewNote(
  overrides: Partial<ProceduralMusicNote> = {}
): ProceduralMusicNote {
  return {
    themeId: 'town-square',
    instrumentId: 'flute-preview',
    role: 'lead',
    startMs: 0,
    durationMs: 240,
    frequency: 660,
    volume: 0.06,
    waveform: 'sine',
    timbre: {
      harmonicWaveform: 'sine',
      harmonicRatio: 2,
      filterType: 'highpass',
      filterCutoffHz: 1_200,
      filterQ: 0.8,
      ...(overrides.timbre ?? {}),
    },
    attackMs: 24,
    releaseMs: 90,
    detuneCents: 0,
    harmonicGain: 0.22,
    pulseRate: 0.8,
    ...overrides,
  };
}
