import { describe, expect, it } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';

describe('music debug lead contour', () => {
  it('captures planned versus actual lead contour checkpoints for review', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'plains',
      contextType: 'overworld',
      clusterX: 0,
      clusterY: 0,
    });
    const analysis = snapshot.leadContourAnalysis;

    expect(analysis.points.length).toBeGreaterThan(0);
    expect(
      analysis.points.some((point) => point.actualRelativeSemitones !== null)
    ).toBe(true);
    expect(
      analysis.inRangePointCount +
        analysis.outOfRangePointCount +
        analysis.missingPointCount
    ).toBe(analysis.points.length);
    expect(analysis.outOfRangePointCount).toBeGreaterThanOrEqual(0);
    expect(analysis.points.some((point) => point.stage.length > 0)).toBe(true);
    expect(analysis.actualClimaxStepIndex).not.toBeNull();
    expect(typeof analysis.finalResolvesToTonic).toBe('boolean');
    expect(typeof analysis.matchesPlannedContour).toBe('boolean');
  });
});
