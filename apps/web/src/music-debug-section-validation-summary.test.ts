import { describe, expect, it } from 'vitest';

import { createMusicDebugSectionValidationSummary } from './music-debug-section-validation-summary.ts';

describe('music debug section validation summary', () => {
  it('combines section-level harmony, bass, cadence, and density checks', () => {
    const summary = createMusicDebugSectionValidationSummary({
      sections: [
        {
          id: 'intro',
          label: 'Intro',
          startTick: 0,
          endTick: 0,
          startOffsetMs: 0,
          durationMs: 8_000,
          measureCount: 4,
          startMeasure: 1,
          endMeasure: 4,
          loopEligible: false,
        },
        {
          id: 'a',
          label: 'A',
          startTick: 0,
          endTick: 0,
          startOffsetMs: 8_000,
          durationMs: 8_000,
          measureCount: 4,
          startMeasure: 5,
          endMeasure: 8,
          loopEligible: false,
        },
      ],
      harmonyChordDetections: [
        {
          sectionId: 'intro',
          sectionLabel: 'Intro',
          chordLabels: ['C'],
          detectedChordLabels: ['C'],
          plannedChordLabels: ['C'],
          followsPlannedProgression: true,
          driftWindows: [],
          measureWindows: [],
        },
        {
          sectionId: 'a',
          sectionLabel: 'A',
          chordLabels: ['Dm'],
          detectedChordLabels: ['Em'],
          plannedChordLabels: ['Dm'],
          followsPlannedProgression: false,
          driftWindows: [
            {
              startMeasure: 6,
              endMeasure: 6,
              detectedLabel: 'Em',
              detectedNoteLabels: ['E4', 'G4', 'B4'],
              plannedLabel: 'Dm',
            },
          ],
          measureWindows: [],
        },
      ],
      bassProgressionDetections: [
        {
          sectionId: 'intro',
          sectionLabel: 'Intro',
          detectedRootLabels: ['C'],
          plannedRootLabels: ['C'],
          followsPlannedProgression: true,
          driftWindows: [],
          measureWindows: [],
        },
        {
          sectionId: 'a',
          sectionLabel: 'A',
          detectedRootLabels: ['E'],
          plannedRootLabels: ['D'],
          followsPlannedProgression: false,
          driftWindows: [
            {
              startMeasure: 6,
              endMeasure: 6,
              detectedLabel: 'E',
              detectedNoteLabels: ['E2'],
              plannedLabel: 'D',
            },
          ],
          measureWindows: [],
        },
      ],
      cadenceValidation: {
        detections: [
          {
            sectionId: 'intro',
            sectionLabel: 'Intro',
            kind: 'weak',
            measureNumber: 4,
            leadPitchLabel: 'C',
            bassPitchLabel: 'C',
            leadNoteLabel: 'C4',
            bassNoteLabel: 'C3',
            harmonyPitchLabels: ['C', 'E', 'G'],
            matchesCadenceTarget: true,
            matchesHarmony: true,
          },
          {
            sectionId: 'a',
            sectionLabel: 'A',
            kind: 'answer',
            measureNumber: 8,
            leadPitchLabel: 'F',
            bassPitchLabel: 'E',
            leadNoteLabel: 'F4',
            bassNoteLabel: 'E3',
            harmonyPitchLabels: ['D', 'F', 'A'],
            matchesCadenceTarget: false,
            matchesHarmony: false,
          },
        ],
        isValidForMidiExport: false,
        messages: [],
      },
      densityValidation: {
        sections: [
          {
            sectionId: 'intro',
            sectionLabel: 'Intro',
            noteDensityByRole: {
              bass: 0.5,
              harmony: 1,
              lead: 2,
              percussion: 0,
            },
            matchesPlan: true,
            messages: [],
          },
          {
            sectionId: 'a',
            sectionLabel: 'A',
            noteDensityByRole: {
              bass: 0.1,
              harmony: 5,
              lead: 6.5,
              percussion: 5,
            },
            matchesPlan: false,
            messages: ['lead density 6.50 exceeded 6.00 notes/measure'],
          },
        ],
        isValidForMidiExport: false,
        messages: [],
      },
    });

    expect(summary).toEqual([
      {
        sectionId: 'intro',
        sectionLabel: 'Intro',
        harmony: 'pass',
        bass: 'pass',
        cadence: 'pass',
        density: 'pass',
        overall: 'pass',
        reasons: [],
      },
      expect.objectContaining({
        sectionId: 'a',
        sectionLabel: 'A',
        harmony: 'fail',
        bass: 'fail',
        cadence: 'fail',
        density: 'fail',
        overall: 'fail',
        reasons: expect.arrayContaining([
          'harmony m6 Em vs Dm',
          'bass m6 E vs D',
          'answer cadence target m8',
          'answer cadence harmony m8',
          'lead density 6.50 exceeded 6.00 notes/measure',
        ]),
      }),
    ]);
  });
});
