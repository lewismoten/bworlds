import { describe, expect, it } from 'vitest';

import { validateMusicDebugHarmonicAlignment } from './music-debug-harmonic-alignment-validation.ts';

describe('music debug harmonic alignment validation', () => {
  it('accepts aligned harmony chord-tone scores and bass roots', () => {
    expect(
      validateMusicDebugHarmonicAlignment({
        chordToneScores: {
          measures: [
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
          ],
          tracks: {
            bass: {
              noteCount: 1,
              chordToneNoteCount: 1,
              totalDurationMs: 1000,
              chordToneDurationMs: 1000,
              score: 1,
              weakestMeasureNumber: 1,
              weakestMeasureScore: 1,
            },
            harmony: {
              noteCount: 2,
              chordToneNoteCount: 2,
              totalDurationMs: 2000,
              chordToneDurationMs: 2000,
              score: 1,
              weakestMeasureNumber: 1,
              weakestMeasureScore: 1,
            },
            lead: {
              noteCount: 2,
              chordToneNoteCount: 1,
              totalDurationMs: 1000,
              chordToneDurationMs: 500,
              score: 0.5,
              weakestMeasureNumber: 1,
              weakestMeasureScore: 0.5,
            },
          },
        },
        bassProgressionDetections: [
          {
            sectionId: 'intro',
            sectionLabel: 'Intro',
            detectedRootLabels: ['G'],
            plannedRootLabels: ['G'],
            followsPlannedProgression: true,
            driftWindows: [],
            measureWindows: [],
          },
        ],
      })
    ).toEqual({
      isValidForMidiExport: true,
      messages: [],
    });
  });

  it('rejects weak harmony chord-tone fit and bass-root drift', () => {
    expect(
      validateMusicDebugHarmonicAlignment({
        chordToneScores: {
          measures: [
            {
              measureNumber: 5,
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
                  chordToneNoteCount: 0,
                  totalDurationMs: 2000,
                  chordToneDurationMs: 0,
                  score: 0,
                },
                lead: {
                  noteCount: 1,
                  chordToneNoteCount: 1,
                  totalDurationMs: 1000,
                  chordToneDurationMs: 1000,
                  score: 1,
                },
              },
            },
          ],
          tracks: {
            bass: {
              noteCount: 1,
              chordToneNoteCount: 1,
              totalDurationMs: 1000,
              chordToneDurationMs: 1000,
              score: 1,
              weakestMeasureNumber: 5,
              weakestMeasureScore: 1,
            },
            harmony: {
              noteCount: 2,
              chordToneNoteCount: 0,
              totalDurationMs: 2000,
              chordToneDurationMs: 0,
              score: 0,
              weakestMeasureNumber: 5,
              weakestMeasureScore: 0,
            },
            lead: {
              noteCount: 1,
              chordToneNoteCount: 1,
              totalDurationMs: 1000,
              chordToneDurationMs: 1000,
              score: 1,
              weakestMeasureNumber: 5,
              weakestMeasureScore: 1,
            },
          },
        },
        bassProgressionDetections: [
          {
            sectionId: 'a',
            sectionLabel: 'Section A',
            detectedRootLabels: ['A'],
            plannedRootLabels: ['G'],
            followsPlannedProgression: false,
            driftWindows: [
              {
                startMeasure: 5,
                endMeasure: 5,
                detectedLabel: 'A',
                detectedNoteLabels: ['A3'],
                plannedLabel: 'G',
              },
            ],
            measureWindows: [],
          },
        ],
      })
    ).toEqual({
      isValidForMidiExport: false,
      messages: [
        'Harmony chord-tone score fell to 0% at measure 5 against planned chord G-B-D.',
        'Bass root drifted at measure 5 (A vs G).',
      ],
    });
  });
});
