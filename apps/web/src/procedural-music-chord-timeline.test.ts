import { describe, expect, it } from 'vitest';
import {
  PROCEDURAL_MUSIC_CHORD_TIMELINE_SPAN_STEPS,
  resolveProceduralChordTimeline,
  resolveProceduralChordTimelineEntryAtStep,
} from './procedural-music-chord-timeline.ts';
import { resolveProceduralMeterPosition } from './procedural-music-meter.ts';

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
      startMeasure: 1,
      endMeasure: 1,
    });
    expect(first[1]).toEqual({
      progressionIndex: 1,
      degreeIndex: 4,
      startStepIndex: 4,
      endStepIndex: 8,
      startMeasure: 2,
      endMeasure: 2,
    });
    expect(first.at(-1)).toEqual({
      progressionIndex: 3,
      degreeIndex: 0,
      startStepIndex: 60,
      endStepIndex: 64,
      startMeasure: 16,
      endMeasure: 16,
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
    expect(firstCycle.startMeasure).toBe(2);
    expect(firstCycle.endMeasure).toBe(2);
  });

  it('assigns an exact measure range to every chord block in the phrase timeline', () => {
    const timeline = resolveProceduralChordTimeline({
      themeId: 'deep-forest',
      themeStepCount: 8,
      clusterX: 3,
      clusterY: -2,
    });

    expect(timeline).toHaveLength(16);
    expect(
      timeline.every(
        (entry, index) =>
          entry.startMeasure === index + 1 &&
          entry.endMeasure === index + 1 &&
          entry.endMeasure - entry.startMeasure === 0
      )
    ).toBe(true);
  });

  it('starts every chord change on a strong beat at the start of a measure', () => {
    const timeline = resolveProceduralChordTimeline({
      themeId: 'frontier-plains',
      themeStepCount: 8,
      clusterX: 3,
      clusterY: -2,
    });

    expect(
      timeline.every((entry, index) => {
        const meter = resolveProceduralMeterPosition(entry.startStepIndex);
        return (
          meter.isStrongBeat &&
          meter.beatNumber === 1 &&
          entry.startStepIndex ===
            index * PROCEDURAL_MUSIC_CHORD_TIMELINE_SPAN_STEPS
        );
      })
    ).toBe(true);
  });
});
