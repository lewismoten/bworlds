import { describe, expect, it } from 'vitest';

import { scoreProceduralLeadMotionPenalty } from './procedural-music-lead-motion.ts';

describe('procedural music lead motion', () => {
  it('favors candidate intervals that match the configured preferred intervals', () => {
    expect(
      scoreProceduralLeadMotionPenalty({
        distance: 3,
        isPrimaryCandidate: false,
        strongLeadBeat: false,
        structuralAccent: false,
        candidateSemitones: 7,
        preferredIntervals: [3],
      })
    ).toBeLessThan(
      scoreProceduralLeadMotionPenalty({
        distance: 2,
        isPrimaryCandidate: false,
        strongLeadBeat: false,
        structuralAccent: false,
        candidateSemitones: 7,
        preferredIntervals: [3],
      })
    );
  });

  it('strongly penalizes back-to-back minor-sixth jumps', () => {
    expect(
      scoreProceduralLeadMotionPenalty({
        distance: 8,
        isPrimaryCandidate: false,
        strongLeadBeat: true,
        structuralAccent: true,
        candidateSemitones: 12,
        preferredIntervals: [8],
        previousLeapDistance: 8,
      })
    ).toBeGreaterThan(
      scoreProceduralLeadMotionPenalty({
        distance: 8,
        isPrimaryCandidate: false,
        strongLeadBeat: true,
        structuralAccent: true,
        candidateSemitones: 12,
        preferredIntervals: [8],
        previousLeapDistance: 3,
      })
    );
  });
});
