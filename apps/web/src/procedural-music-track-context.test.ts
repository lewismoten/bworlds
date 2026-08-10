import { describe, expect, it } from 'vitest';
import { resolveProceduralTrackContext } from './procedural-music-track-context.ts';

const TEST_THEME = {
  id: 'frontier-plains',
  rootHz: 196,
  rootMidiNote: 55,
  scale: [0, 2, 4, 5, 7, 9, 10],
  noteDurationMs: 460,
  baseVolume: 0.03,
  stepPattern: [0, 1, 2, 3],
  rhythmPattern: [1, 1.25, 0.75, 1],
  vocabulary: {
    melodyRangeSemitones: [0, 14] as const,
    preferredIntervals: [1, 2, 3],
  },
  motif: {
    adaptedDegreeOffsets: [0, 2, 4, 2],
    recognitionDegreeOffsets: [0, 2, 4, 2],
    sharedDegreeOffsets: [0, 2, 4, 2],
  },
};

describe('procedural music track context', () => {
  it('builds one shared harmonic and rhythmic context for a step', () => {
    const context = resolveProceduralTrackContext({
      theme: TEST_THEME,
      stepIndex: 6,
      clusterX: 3,
      clusterY: -2,
      tempoMultiplier: 1.04,
    });

    expect(context.harmonicState.chord).toEqual(context.composition.chord);
    expect(context.phraseState.phraseStep).toBe(context.composition.phraseStep);
    expect(context.phraseState.phraseCycleStep).toBe(
      context.composition.phraseCycleStep
    );
    expect(context.phraseState.cadence).toBe(context.composition.cadence);
    expect(context.motifState.motifDegreeOffset).toBe(
      context.composition.motifDegreeOffset
    );
    expect(context.motifState.contourStep).toEqual(
      context.composition.contourStep
    );
    expect(context.rhythmicGrid.stepDurationMultiplier).toBe(0.75);
    expect(context.rhythmicGrid.stepDurationMs).toBeCloseTo(
      (460 * 0.75) / 1.04,
      6
    );
  });

  it('flags chord-change steps from the shared harmonic timeline', () => {
    const firstStep = resolveProceduralTrackContext({
      theme: TEST_THEME,
      stepIndex: 0,
      clusterX: 3,
      clusterY: -2,
      tempoMultiplier: 1,
    });
    const continuedStep = resolveProceduralTrackContext({
      theme: TEST_THEME,
      stepIndex: 1,
      clusterX: 3,
      clusterY: -2,
      tempoMultiplier: 1,
    });
    const nextChordStep = resolveProceduralTrackContext({
      theme: TEST_THEME,
      stepIndex: 4,
      clusterX: 3,
      clusterY: -2,
      tempoMultiplier: 1,
    });

    expect(firstStep.harmonicState.chordChange).toBe(true);
    expect(continuedStep.harmonicState.chordChange).toBe(false);
    expect(nextChordStep.harmonicState.chordChange).toBe(true);
  });
});
