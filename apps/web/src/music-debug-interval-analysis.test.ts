import { describe, expect, it } from 'vitest';

import {
  createMusicDebugIntervalComparison,
  formatMusicDebugIntervalComparison,
} from './music-debug-interval-analysis.ts';
import type { MusicDebugNotePitchDiagnostic } from './music-debug-note-analysis.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';

describe('music debug interval analysis', () => {
  it('compares intended lead intervals with actual exported interval counts', () => {
    const comparison = createMusicDebugIntervalComparison({
      notes: TEST_NOTES,
      diagnostics: TEST_DIAGNOSTICS,
      preferredIntervals: [2, 5],
      role: 'lead',
    });

    expect(comparison).toEqual({
      role: 'lead',
      intendedIntervals: [2, 5],
      actualIntervalCounts: [
        { intervalSemitones: 2, count: 2 },
        { intervalSemitones: 3, count: 1 },
      ],
      preferredIntervalCounts: [{ intervalSemitones: 2, count: 2 }],
      totalIntervalCount: 3,
      preferredMatchCount: 2,
      preferredMatchPercentage: (2 / 3) * 100,
    });
  });

  it('formats a compact debug summary for the interval comparison', () => {
    expect(
      formatMusicDebugIntervalComparison({
        role: 'lead',
        intendedIntervals: [2, 5],
        actualIntervalCounts: [
          { intervalSemitones: 2, count: 2 },
          { intervalSemitones: 3, count: 1 },
        ],
        preferredIntervalCounts: [{ intervalSemitones: 2, count: 2 }],
        totalIntervalCount: 3,
        preferredMatchCount: 2,
        preferredMatchPercentage: (2 / 3) * 100,
      })
    ).toContain('Lead prefer 2, 5 st | matched 2/3');
  });
});

const TEST_NOTES: ProceduralMusicNote[] = [
  createLeadNote(0, 261.63),
  createLeadNote(500, 293.66),
  createLeadNote(1_000, 349.23),
  createLeadNote(1_500, 392),
];

const TEST_DIAGNOSTICS: MusicDebugNotePitchDiagnostic[] = [
  createLeadDiagnostic(60),
  createLeadDiagnostic(62),
  createLeadDiagnostic(65),
  createLeadDiagnostic(67),
];

function createLeadNote(
  startMs: number,
  frequency: number
): ProceduralMusicNote {
  return {
    themeId: 'frontier-plains',
    instrumentId: 'lead',
    role: 'lead',
    startMs,
    durationMs: 240,
    frequency,
    volume: 0.04,
    waveform: 'triangle',
    timbre: {
      harmonicWaveform: 'sine',
      harmonicRatio: 2,
      filterType: 'lowpass',
      filterCutoffHz: 1800,
      filterQ: 0.9,
    },
    attackMs: 24,
    releaseMs: 160,
    detuneCents: 0,
    harmonicGain: 0.3,
    pulseRate: 1,
  };
}

function createLeadDiagnostic(midiNote: number): MusicDebugNotePitchDiagnostic {
  return {
    noteIndex: 0,
    role: 'lead',
    frequency: 0,
    midiNote,
    relativeSemitones: midiNote - 60,
    scaleDegree: 1,
    scaleDegreeLabel: 'degree 1',
    isBlackKey: false,
    inMode: true,
    accidentalReason: 'in-mode',
    accidentalRuleLabel: null,
    accidentalExplanation: null,
  };
}
