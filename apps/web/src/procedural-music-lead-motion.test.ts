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

  it('penalizes ordinary non-accent leaps larger than three semitones', () => {
    expect(
      scoreProceduralLeadMotionPenalty({
        distance: 4,
        isPrimaryCandidate: false,
        strongLeadBeat: false,
        structuralAccent: false,
        candidateSemitones: 9,
      })
    ).toBeGreaterThan(
      scoreProceduralLeadMotionPenalty({
        distance: 3,
        isPrimaryCandidate: false,
        strongLeadBeat: false,
        structuralAccent: false,
        candidateSemitones: 9,
      })
    );
  });

  it('penalizes a second larger leap in the same phrase', () => {
    expect(
      scoreProceduralLeadMotionPenalty({
        distance: 5,
        isPrimaryCandidate: false,
        strongLeadBeat: true,
        structuralAccent: true,
        candidateSemitones: 12,
        priorLargeLeapCount: 1,
      })
    ).toBeGreaterThan(
      scoreProceduralLeadMotionPenalty({
        distance: 5,
        isPrimaryCandidate: false,
        strongLeadBeat: true,
        structuralAccent: true,
        candidateSemitones: 12,
        priorLargeLeapCount: 0,
      })
    );
  });

  it('prefers stepwise recovery after a larger leap', () => {
    const recoveringStepPenalty = scoreProceduralLeadMotionPenalty({
      distance: 2,
      isPrimaryCandidate: false,
      strongLeadBeat: false,
      structuralAccent: false,
      candidateSemitones: 9,
      previousLeapDistance: 5,
    });
    const repeatedLeapPenalty = scoreProceduralLeadMotionPenalty({
      distance: 5,
      isPrimaryCandidate: false,
      strongLeadBeat: false,
      structuralAccent: false,
      candidateSemitones: 12,
      previousLeapDistance: 5,
    });

    expect(recoveringStepPenalty).toBeLessThan(repeatedLeapPenalty);
  });

  it('keeps the post-leap recovery bias softer on structural accents', () => {
    const neutralPenalty = scoreProceduralLeadMotionPenalty({
      distance: 4,
      isPrimaryCandidate: false,
      strongLeadBeat: false,
      structuralAccent: false,
      candidateSemitones: 11,
      previousLeapDistance: 5,
    });
    const accentedPenalty = scoreProceduralLeadMotionPenalty({
      distance: 4,
      isPrimaryCandidate: false,
      strongLeadBeat: true,
      structuralAccent: true,
      candidateSemitones: 11,
      previousLeapDistance: 5,
    });

    expect(accentedPenalty).toBeLessThan(neutralPenalty);
  });

  it('penalizes repeated same-pitch runs more than nearby stepwise motion', () => {
    const repeatedPitchPenalty = scoreProceduralLeadMotionPenalty({
      distance: 0,
      isPrimaryCandidate: true,
      strongLeadBeat: false,
      structuralAccent: false,
      candidateSemitones: 7,
      repeatedPitchRunLength: 2,
    });
    const stepwisePenalty = scoreProceduralLeadMotionPenalty({
      distance: 1,
      isPrimaryCandidate: false,
      strongLeadBeat: false,
      structuralAccent: false,
      candidateSemitones: 8,
      repeatedPitchRunLength: 2,
    });

    expect(repeatedPitchPenalty).toBeGreaterThan(stepwisePenalty);
  });

  it('keeps the repeated-pitch penalty softer on structural accents', () => {
    const neutralPenalty = scoreProceduralLeadMotionPenalty({
      distance: 0,
      isPrimaryCandidate: true,
      strongLeadBeat: false,
      structuralAccent: false,
      candidateSemitones: 7,
      repeatedPitchRunLength: 2,
    });
    const accentedPenalty = scoreProceduralLeadMotionPenalty({
      distance: 0,
      isPrimaryCandidate: true,
      strongLeadBeat: true,
      structuralAccent: true,
      candidateSemitones: 7,
      repeatedPitchRunLength: 2,
    });

    expect(accentedPenalty).toBeLessThan(neutralPenalty);
  });
});
