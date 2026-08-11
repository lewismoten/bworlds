import { describe, expect, it } from 'vitest';

import type { MusicDebugLeadContourAnalysis } from './music-debug-lead-contour.ts';
import {
  buildMusicDebugLeadContourGraphMarkup,
  buildMusicDebugLeadContourGraphSvgMarkup,
} from './music-debug-lead-contour-graph.ts';

describe('music debug lead contour graph', () => {
  it('renders planned and actual contour data on one svg graph', () => {
    const markup = buildMusicDebugLeadContourGraphMarkup(createAnalysis());

    expect(markup).toContain('Lead Contour Graph');
    expect(markup).toContain('aria-label="Lead contour graph"');
    expect(markup).toContain('music-debug-contour-graph-band');
    expect(markup).toContain('music-debug-contour-graph-target');
    expect(markup).toContain('music-debug-contour-graph-actual');
    expect(markup).toContain('music-debug-contour-graph-point-ok');
    expect(markup).toContain('music-debug-contour-graph-point-drift');
    expect(markup).toContain('music-debug-contour-graph-point-missing');
    expect(markup).toContain('m1');
    expect(markup).toContain('m3');
    expect(markup).toContain('planned range');
    expect(markup).toContain('actual melody');
    expect(markup).toContain('Drift');
    expect(markup).toContain('Missing');
  });

  it('renders an unavailable state when contour checkpoints are missing', () => {
    const markup = buildMusicDebugLeadContourGraphMarkup({
      ...createAnalysis(),
      points: [],
    });

    expect(markup).toContain('Unavailable');
    expect(markup).toContain('No lead contour checkpoints were generated.');
  });

  it('renders a standalone svg export for the contour graph', () => {
    const markup = buildMusicDebugLeadContourGraphSvgMarkup(createAnalysis());

    expect(markup).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(markup).toContain('role="img"');
    expect(markup).toContain('Lead contour graph');
    expect(markup).toContain('stroke="#55d6be"');
    expect(markup).toContain('stroke="#ffcc33"');
  });
});

function createAnalysis(): MusicDebugLeadContourAnalysis {
  return {
    points: [
      {
        stepIndex: 2,
        phraseMeasure: 1,
        songMeasure: 1,
        stage: 'start',
        cadence: 'question',
        plannedMinSemitones: 2,
        plannedTargetSemitones: 4,
        plannedMaxSemitones: 6,
        actualRelativeSemitones: 5,
        actualScaleDegree: 3,
        actualStartMs: 100,
        actualNoteLabel: 'B4',
        withinPlannedRange: true,
      },
      {
        stepIndex: 6,
        phraseMeasure: 2,
        songMeasure: 2,
        stage: 'rise',
        cadence: 'neutral',
        plannedMinSemitones: 4,
        plannedTargetSemitones: 6,
        plannedMaxSemitones: 8,
        actualRelativeSemitones: 10,
        actualScaleDegree: 6,
        actualStartMs: 220,
        actualNoteLabel: 'E5',
        withinPlannedRange: false,
      },
      {
        stepIndex: 10,
        phraseMeasure: 3,
        songMeasure: 3,
        stage: 'resolve',
        cadence: 'answer',
        plannedMinSemitones: 1,
        plannedTargetSemitones: 2,
        plannedMaxSemitones: 4,
        actualRelativeSemitones: null,
        actualScaleDegree: null,
        actualStartMs: null,
        actualNoteLabel: null,
        withinPlannedRange: null,
      },
    ],
    inRangePointCount: 1,
    outOfRangePointCount: 1,
    missingPointCount: 1,
    plannedClimaxStepIndex: 6,
    actualClimaxStepIndex: 6,
    climaxNearPlannedPeak: true,
    finalResolvesToTonic: false,
    matchesPlannedContour: false,
    messages: [],
  };
}
