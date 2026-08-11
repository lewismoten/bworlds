import { describe, expect, it } from 'vitest';

import type { MusicDebugNotePitchDiagnostic } from './music-debug-note-analysis.ts';
import {
  createMusicDebugChordToneScores,
  formatMusicDebugChordToneTrackScores,
} from './music-debug-chord-tone-score.ts';
import type { ProceduralChordTimelineEntry } from './procedural-music-chord-timeline.ts';
import type { ProceduralMusicNote } from './procedural-music.ts';
import type { ProceduralMusicSongSection } from './procedural-music-song.ts';

describe('music debug chord-tone scores', () => {
  it('scores each measure and track against the active chord tones', () => {
    const scores = createMusicDebugChordToneScores({
      notes: TEST_NOTES,
      notePitchDiagnostics: TEST_DIAGNOSTICS,
      sections: TEST_SECTIONS,
      scale: [0, 2, 4, 5, 7, 9, 10],
      rootMidiNote: 55,
      chordTimeline: TEST_CHORD_TIMELINE,
    });

    expect(scores.measures).toEqual([
      {
        measureNumber: 1,
        plannedLabel: 'G-B-D',
        roles: {
          bass: {
            noteCount: 1,
            chordToneNoteCount: 1,
            totalDurationMs: 1000,
            chordToneDurationMs: 1000,
            score: 1,
          },
          harmony: {
            noteCount: 2,
            chordToneNoteCount: 2,
            totalDurationMs: 2000,
            chordToneDurationMs: 2000,
            score: 1,
          },
          lead: {
            noteCount: 2,
            chordToneNoteCount: 1,
            totalDurationMs: 1000,
            chordToneDurationMs: 500,
            score: 0.5,
          },
        },
      },
      {
        measureNumber: 2,
        plannedLabel: 'D-F-A',
        roles: {
          bass: {
            noteCount: 1,
            chordToneNoteCount: 0,
            totalDurationMs: 1000,
            chordToneDurationMs: 0,
            score: 0,
          },
          harmony: {
            noteCount: 1,
            chordToneNoteCount: 1,
            totalDurationMs: 1000,
            chordToneDurationMs: 1000,
            score: 1,
          },
          lead: {
            noteCount: 1,
            chordToneNoteCount: 0,
            totalDurationMs: 1000,
            chordToneDurationMs: 0,
            score: 0,
          },
        },
      },
    ]);
    expect(scores.tracks).toEqual({
      bass: {
        noteCount: 2,
        chordToneNoteCount: 1,
        totalDurationMs: 2000,
        chordToneDurationMs: 1000,
        score: 0.5,
        weakestMeasureNumber: 2,
        weakestMeasureScore: 0,
      },
      harmony: {
        noteCount: 3,
        chordToneNoteCount: 3,
        totalDurationMs: 3000,
        chordToneDurationMs: 3000,
        score: 1,
        weakestMeasureNumber: 1,
        weakestMeasureScore: 1,
      },
      lead: {
        noteCount: 3,
        chordToneNoteCount: 1,
        totalDurationMs: 2000,
        chordToneDurationMs: 500,
        score: 0.25,
        weakestMeasureNumber: 2,
        weakestMeasureScore: 0,
      },
    });
  });

  it('formats track summaries with worst-measure context', () => {
    const summary = formatMusicDebugChordToneTrackScores({
      measures: [],
      tracks: {
        bass: {
          noteCount: 2,
          chordToneNoteCount: 1,
          totalDurationMs: 2000,
          chordToneDurationMs: 1000,
          score: 0.5,
          weakestMeasureNumber: 2,
          weakestMeasureScore: 0,
        },
        harmony: {
          noteCount: 0,
          chordToneNoteCount: 0,
          totalDurationMs: 0,
          chordToneDurationMs: 0,
          score: null,
          weakestMeasureNumber: null,
          weakestMeasureScore: null,
        },
        lead: {
          noteCount: 3,
          chordToneNoteCount: 1,
          totalDurationMs: 2000,
          chordToneDurationMs: 500,
          score: 0.25,
          weakestMeasureNumber: 2,
          weakestMeasureScore: 0,
        },
      },
    });

    expect(summary).toBe(
      'Bass 50% (worst m2 0%) | Harmony n/a | Melody 25% (worst m2 0%)'
    );
  });
});

const TEST_SECTIONS: ProceduralMusicSongSection[] = [
  {
    id: 'intro',
    label: 'Intro',
    startMeasure: 1,
    endMeasure: 2,
    measureCount: 2,
    startOffsetMs: 0,
    durationMs: 2000,
    loopEligible: false,
    startTick: 0,
    endTick: 3840,
  },
];

const TEST_CHORD_TIMELINE: ProceduralChordTimelineEntry[] = [
  {
    progressionIndex: 0,
    degreeIndex: 0,
    startStepIndex: 0,
    endStepIndex: 4,
    startMeasure: 1,
    endMeasure: 1,
  },
  {
    progressionIndex: 1,
    degreeIndex: 4,
    startStepIndex: 4,
    endStepIndex: 8,
    startMeasure: 2,
    endMeasure: 2,
  },
];

const TEST_NOTES: ProceduralMusicNote[] = [
  createNote({
    role: 'bass',
    startMs: 0,
    durationMs: 1000,
    frequency: 196,
    instrumentId: 'bass:1',
  }),
  createNote({
    role: 'harmony',
    startMs: 0,
    durationMs: 1000,
    frequency: 246.94,
    instrumentId: 'harmony:1',
  }),
  createNote({
    role: 'harmony',
    startMs: 0,
    durationMs: 1000,
    frequency: 293.66,
    instrumentId: 'harmony:2',
  }),
  createNote({
    role: 'lead',
    startMs: 0,
    durationMs: 500,
    frequency: 392,
    instrumentId: 'lead:1',
  }),
  createNote({
    role: 'lead',
    startMs: 500,
    durationMs: 500,
    frequency: 329.63,
    instrumentId: 'lead:2',
  }),
  createNote({
    role: 'bass',
    startMs: 1000,
    durationMs: 1000,
    frequency: 196,
    instrumentId: 'bass:2',
  }),
  createNote({
    role: 'harmony',
    startMs: 1000,
    durationMs: 1000,
    frequency: 293.66,
    instrumentId: 'harmony:3',
  }),
  createNote({
    role: 'lead',
    startMs: 1000,
    durationMs: 1000,
    frequency: 440,
    instrumentId: 'lead:3',
  }),
];

const TEST_DIAGNOSTICS: MusicDebugNotePitchDiagnostic[] = [
  createDiagnostic({ role: 'bass', midiNote: 55, scaleDegree: 1 }),
  createDiagnostic({ role: 'harmony', midiNote: 59, scaleDegree: 3 }),
  createDiagnostic({ role: 'harmony', midiNote: 62, scaleDegree: 5 }),
  createDiagnostic({ role: 'lead', midiNote: 67, scaleDegree: 8 }),
  createDiagnostic({ role: 'lead', midiNote: 64, scaleDegree: 6 }),
  createDiagnostic({ role: 'bass', midiNote: 55, scaleDegree: 1 }),
  createDiagnostic({ role: 'harmony', midiNote: 62, scaleDegree: 5 }),
  createDiagnostic({ role: 'lead', midiNote: 69, scaleDegree: 10 }),
];

function createDiagnostic(
  overrides: Pick<MusicDebugNotePitchDiagnostic, 'role' | 'midiNote' | 'scaleDegree'>
): MusicDebugNotePitchDiagnostic {
  return {
    noteIndex: 0,
    role: overrides.role,
    frequency: 0,
    midiNote: overrides.midiNote,
    relativeSemitones: overrides.scaleDegree,
    scaleDegree: overrides.scaleDegree,
    scaleDegreeLabel:
      overrides.scaleDegree === null ? null : `degree ${overrides.scaleDegree}`,
    isBlackKey: false,
    inMode: true,
    accidentalReason: 'in-mode',
    accidentalRuleLabel: 'in mode',
    accidentalExplanation: 'in mode',
  };
}

function createNote(
  overrides: Pick<
    ProceduralMusicNote,
    'role' | 'startMs' | 'durationMs' | 'frequency' | 'instrumentId'
  >
): ProceduralMusicNote {
  return {
    themeId: 'frontier-plains',
    instrumentId: overrides.instrumentId,
    role: overrides.role,
    startMs: overrides.startMs,
    durationMs: overrides.durationMs,
    frequency: overrides.frequency,
    volume: 0.8,
    velocity: 0.8,
    waveform: 'sine',
    timbre: {
      harmonicWaveform: 'sine',
      harmonicRatio: 2,
      filterType: 'lowpass',
      filterCutoffHz: 1400,
      filterQ: 0.7,
    },
    attackMs: 10,
    releaseMs: 120,
    detuneCents: 0,
    harmonicGain: 0.2,
    pulseRate: 0,
  };
}
