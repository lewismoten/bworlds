import { describe, expect, it } from 'vitest';
import { validateMusicDebugPercussion } from './music-debug-percussion-validation.ts';

describe('music debug percussion validation', () => {
  it('accepts percussion that stays out of intro and outro while keeping variation thinner', () => {
    const validation = validateMusicDebugPercussion({
      songStartMs: 1_000,
      sections: [
        createSection('intro', 'Intro', 0, 4_000, 4),
        createSection('a', 'Section A', 4_000, 8_000, 8),
        createSection('variation', 'Variation', 12_000, 8_000, 8),
        createSection('outro', 'Outro', 20_000, 4_000, 4),
      ],
      notes: [
        createPercussionNote('kick', 5_000, 200),
        createPercussionNote('snare', 5_500, 160),
        createPercussionNote('kick', 6_000, 200),
        createPercussionNote('snare', 6_500, 160),
        createPercussionNote('kick', 13_000, 120),
      ],
    });

    expect(validation.isValidForMidiExport).toBe(true);
    expect(validation.messages).toEqual([]);
  });

  it('reports percussion in forbidden sections and overly thick variation', () => {
    const validation = validateMusicDebugPercussion({
      songStartMs: 1_000,
      sections: [
        createSection('intro', 'Intro', 0, 4_000, 4),
        createSection('a', 'Section A', 4_000, 8_000, 8),
        createSection('variation', 'Variation', 12_000, 8_000, 8),
        createSection('outro', 'Outro', 20_000, 4_000, 4),
      ],
      notes: [
        createPercussionNote('kick', 1_200, 160),
        createPercussionNote('kick', 5_000, 120),
        createPercussionNote('snare', 5_250, 120),
        createPercussionNote('kick', 13_000, 320),
        createPercussionNote('snare', 13_500, 320),
        createPercussionNote('shaker', 14_000, 320),
        createPercussionNote('kick', 21_200, 160),
      ],
    });

    expect(validation.isValidForMidiExport).toBe(false);
    expect(validation.messages).toContain(
      'Intro should not contain percussion notes.'
    );
    expect(validation.messages).toContain(
      'Outro should not contain percussion notes.'
    );
    expect(validation.messages).toContain(
      'Variation percussion should stay thinner than Section A.'
    );
  });
});

function createSection(
  id: 'intro' | 'a' | 'variation' | 'outro',
  label: string,
  startOffsetMs: number,
  durationMs: number,
  measureCount: number
) {
  return {
    id,
    label,
    startOffsetMs,
    durationMs,
    loopEligible: id !== 'outro',
    measureCount,
    startMeasure: 1,
    endMeasure: measureCount,
    startTick: 0,
    endTick: measureCount * 1920,
  };
}

function createPercussionNote(
  family: 'kick' | 'snare' | 'shaker',
  startMs: number,
  durationMs: number
) {
  return {
    themeId: 'town-square',
    instrumentId: `town-square:percussion:0:0:perc-${family}:0`,
    role: 'percussion' as const,
    startMs,
    durationMs,
    frequency: 440,
    volume: 0.01,
    waveform: 'triangle' as const,
    timbre: {
      harmonicWaveform: 'triangle' as const,
      harmonicRatio: 2,
      filterType: 'lowpass' as const,
      filterCutoffHz: 1200,
      filterQ: 1,
    },
    attackMs: 12,
    releaseMs: 80,
    detuneCents: 0,
    harmonicGain: 0.2,
    pulseRate: 1,
  };
}
