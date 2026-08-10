import { describe, expect, it } from 'vitest';
import { validateMusicDebugPercussion } from './music-debug-percussion-validation.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

describe('music debug percussion validation', () => {
  it('accepts percussion that stays out of intro and outro while keeping variation thinner', () => {
    const validation = validateMusicDebugPercussion({
      songStartMs: 1_000,
      sections: [
        createSection('intro', 'Intro', 0, 4_000, 4),
        createSection('a', 'Section A', 4_000, 8_000, 8),
        createSection('variation', 'Variation', 12_000, 8_000, 8),
        createSection('return', 'Return', 20_000, 8_000, 8),
        createSection('outro', 'Outro', 28_000, 4_000, 4),
      ],
      notes: [
        createPercussionNote('kick-36', 5_000, 200),
        createPercussionNote('snare-38', 5_500, 160),
        createPercussionNote('shaker-69', 5_750, 160),
        createPercussionNote('kick-35', 6_000, 200),
        createPercussionNote('snare-37', 6_500, 160),
        createPercussionNote('kick-36', 13_000, 120),
        createPercussionNote('kick-36', 21_000, 180),
        createPercussionNote('snare-38', 21_500, 160),
        createPercussionNote('shaker-69', 21_750, 140),
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
        createSection('return', 'Return', 20_000, 8_000, 8),
        createSection('outro', 'Outro', 28_000, 4_000, 4),
      ],
      notes: [
        createPercussionNote('kick-36', 1_200, 160),
        createPercussionNote('kick-36', 5_000, 120),
        createPercussionNote('snare-38', 5_250, 120),
        createPercussionNote('shaker-69', 5_500, 120),
        createPercussionNote('kick-36', 13_000, 320),
        createPercussionNote('snare-38', 13_500, 320),
        createPercussionNote('shaker-69', 14_000, 320),
        createPercussionNote('kick-36', 29_200, 160),
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

  it('rejects percussion tracks that repeat only one drum voice', () => {
    const validation = validateMusicDebugPercussion({
      songStartMs: 1_000,
      sections: [
        createSection('intro', 'Intro', 0, 4_000, 4),
        createSection('a', 'Section A', 4_000, 8_000, 8),
        createSection('variation', 'Variation', 12_000, 8_000, 8),
        createSection('return', 'Return', 20_000, 8_000, 8),
        createSection('outro', 'Outro', 28_000, 4_000, 4),
      ],
      notes: [
        createPercussionNote('kick-36', 5_000, 180),
        createPercussionNote('kick-36', 5_500, 180),
        createPercussionNote('kick-36', 6_000, 180),
        createPercussionNote('kick-36', 13_000, 120),
      ],
    });

    expect(validation.isValidForMidiExport).toBe(false);
    expect(validation.messages).toContain(
      'Percussion should use more than one drum voice.'
    );
  });

  it('rejects full-groove sections that do not use at least three percussion roles', () => {
    const validation = validateMusicDebugPercussion({
      songStartMs: 1_000,
      sections: [
        createSection('intro', 'Intro', 0, 4_000, 4),
        createSection('a', 'Section A', 4_000, 8_000, 8),
        createSection('variation', 'Variation', 12_000, 8_000, 8),
        createSection('return', 'Return', 20_000, 8_000, 8),
        createSection('outro', 'Outro', 28_000, 4_000, 4),
      ],
      notes: [
        createPercussionNote('kick-36', 5_000, 180),
        createPercussionNote('snare-38', 5_500, 180),
        createPercussionNote('kick-35', 6_000, 180),
        createPercussionNote('kick-36', 21_000, 180),
        createPercussionNote('snare-38', 21_500, 180),
      ],
    });

    expect(validation.isValidForMidiExport).toBe(false);
    expect(validation.messages).toContain(
      'Section A should use at least three percussion roles.'
    );
    expect(validation.messages).toContain(
      'Return should use at least three percussion roles.'
    );
  });
});

function createSection(
  id: 'intro' | 'a' | 'variation' | 'return' | 'outro',
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
  voiceId: 'kick-35' | 'kick-36' | 'snare-37' | 'snare-38' | 'shaker-69',
  startMs: number,
  durationMs: number
): ProceduralMusicNote {
  return {
    themeId: 'town-square',
    instrumentId: `town-square:percussion:0:0:perc-${voiceId}:0`,
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
