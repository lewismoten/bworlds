import { describe, expect, it } from 'vitest';
import {
  PROCEDURAL_MUSIC_CHORD_TIMELINE_SPAN_STEPS,
  resolveProceduralChordTimeline,
  resolveProceduralChordTimelineEntryAtStep,
} from './procedural-music-chord-timeline.ts';

describe('procedural music chord timeline', () => {
  it('builds a deterministic eight-measure phrase timeline before tracks read chords', () => {
    const first = resolveProceduralChordTimeline({
      themeId: 'frontier-plains',
      themeStepCount: 8,
      clusterX: 3,
      clusterY: -2,
    });
    const second = resolveProceduralChordTimeline({
      themeId: 'frontier-plains',
      themeStepCount: 8,
      clusterX: 3,
      clusterY: -2,
    });

    expect(first).toEqual(second);
    expect(first).toHaveLength(16);
    expect(first[0]).toEqual({
      progressionIndex: 0,
      degreeIndex: 0,
      startStepIndex: 0,
      endStepIndex: PROCEDURAL_MUSIC_CHORD_TIMELINE_SPAN_STEPS,
    });
    expect(first[1]).toEqual({
      progressionIndex: 1,
      degreeIndex: 4,
      startStepIndex: 4,
      endStepIndex: 8,
    });
    expect(first.at(-1)).toEqual({
      progressionIndex: 3,
      degreeIndex: 0,
      startStepIndex: 60,
      endStepIndex: 64,
    });
  });

  it('wraps any step lookup back onto the shared phrase timeline', () => {
    const firstCycle = resolveProceduralChordTimelineEntryAtStep({
      themeId: 'frontier-plains',
      themeStepCount: 8,
      stepIndex: 6,
      clusterX: 3,
      clusterY: -2,
    });
    const secondCycle = resolveProceduralChordTimelineEntryAtStep({
      themeId: 'frontier-plains',
      themeStepCount: 8,
      stepIndex: 70,
      clusterX: 3,
      clusterY: -2,
    });

    expect(firstCycle).toEqual(secondCycle);
    expect(firstCycle.progressionIndex).toBe(1);
    expect(firstCycle.degreeIndex).toBe(4);
  });
});
