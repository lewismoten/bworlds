import { describe, expect, it } from 'vitest';

import { createMusicDebugPhraseIntentScore, formatMusicDebugPhraseIntentScore } from './music-debug-phrase-intent-score.ts';

describe('music debug phrase intent score', () => {
  it('combines motif, contour, and cadence diagnostics into one phrase-intent score', () => {
    const score = createMusicDebugPhraseIntentScore({
      motifValidation: {
        totalMatchCount: 4,
        exactMatchCount: 2,
        variedMatchCount: 2,
        isValidForMidiExport: true,
        messages: [],
      },
      leadContourAnalysis: {
        points: Array.from({ length: 6 }, (_, index) => ({
          stepIndex: index,
          phraseMeasure: index + 1,
          songMeasure: index + 1,
          stage: 'shape',
          cadence: 'none',
          plannedMinSemitones: 0,
          plannedTargetSemitones: 2,
          plannedMaxSemitones: 4,
          actualRelativeSemitones: 2,
          actualScaleDegree: 1,
          actualStartMs: index * 1000,
          actualNoteLabel: 'C4',
          withinPlannedRange: index < 4 ? true : false,
        })),
        inRangePointCount: 4,
        outOfRangePointCount: 2,
        missingPointCount: 0,
        plannedClimaxStepIndex: 4,
        actualClimaxStepIndex: 4,
        climaxNearPlannedPeak: true,
        finalResolvesToTonic: true,
        matchesPlannedContour: true,
        messages: [],
      },
      cadenceValidation: {
        detections: [
          {
            sectionId: 'intro',
            sectionLabel: 'Intro',
            kind: 'question',
            measureNumber: 4,
            leadPitchLabel: 'D',
            bassPitchLabel: 'G',
            leadNoteLabel: 'D4',
            bassNoteLabel: 'G3',
            harmonyPitchLabels: ['D', 'G'],
            matchesCadenceTarget: true,
            matchesHarmony: true,
          },
          {
            sectionId: 'outro',
            sectionLabel: 'Outro',
            kind: 'answer',
            measureNumber: 8,
            leadPitchLabel: 'C',
            bassPitchLabel: 'C',
            leadNoteLabel: 'C4',
            bassNoteLabel: 'C3',
            harmonyPitchLabels: ['C', 'E', 'G'],
            matchesCadenceTarget: false,
            matchesHarmony: true,
          },
        ],
        isValidForMidiExport: false,
        messages: ['Outro answer cadence at measure 8 missed its target tones.'],
      },
    });

    expect(score).toEqual({
      motif: {
        label: 'motif',
        score: 0.875,
        summary: '2 exact / 2 varied',
      },
      contour: {
        label: 'contour',
        score: 0.767,
        summary: '4/6 checkpoints in range, climax aligned, final tonic',
      },
      cadence: {
        label: 'cadence',
        score: 0.5,
        summary: '1/2 cadence checkpoints matched',
      },
      overallScore: 0.714,
    });
  });

  it('formats compact summary text for the debug page', () => {
    expect(
      formatMusicDebugPhraseIntentScore({
        motif: { label: 'motif', score: 0.875, summary: '' },
        contour: { label: 'contour', score: 0.767, summary: '' },
        cadence: { label: 'cadence', score: 0.5, summary: '' },
        overallScore: 0.714,
      })
    ).toBe('Motif 88% | Contour 77% | Cadence 50% | Overall 71%');
  });
});
