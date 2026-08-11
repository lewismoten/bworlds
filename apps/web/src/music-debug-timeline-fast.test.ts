import { describe, expect, it } from 'vitest';

import type { MusicDebugSnapshot } from './music-debug.ts';
import {
  resolveMusicDebugTimelineChordLabels,
  resolveMusicDebugTimelineLayout,
  resolveMusicDebugTimelineNoteBarColor,
  resolveMusicDebugTimelineOffsetForX,
  resolveMusicDebugTimelineSeekOffset,
  resolveMusicDebugTimelineTrackLabelRoleAtPoint,
  resolveMusicDebugTimelineXForOffset,
} from './music-debug-timeline.ts';

const DEFAULT_LAYOUT = resolveMusicDebugTimelineLayout(960, 320);
const TEST_SNAPSHOT = { durationMs: 120_000 } as MusicDebugSnapshot;

describe('music debug timeline fast checks', () => {
  it('maps offsets to timeline positions and back', () => {
    const x = resolveMusicDebugTimelineXForOffset(
      DEFAULT_LAYOUT,
      TEST_SNAPSHOT.durationMs,
      60_000
    );

    expect(
      resolveMusicDebugTimelineOffsetForX(
        DEFAULT_LAYOUT,
        TEST_SNAPSHOT.durationMs,
        x
      )
    ).toBe(60_000);
  });

  it('uses the requested visible role order for current generated tracks', () => {
    expect(DEFAULT_LAYOUT.roleOrder).toEqual([
      'lead',
      'harmony',
      'bass',
      'percussion',
    ]);
  });

  it('clamps seek offsets to the visible timeline bounds', () => {
    expect(
      resolveMusicDebugTimelineSeekOffset({
        snapshot: TEST_SNAPSHOT,
        canvas: { width: 960, height: 320 },
        clientX: -400,
        boundsLeft: 0,
        boundsWidth: 960,
      })
    ).toBe(0);
    expect(
      resolveMusicDebugTimelineSeekOffset({
        snapshot: TEST_SNAPSHOT,
        canvas: { width: 960, height: 320 },
        clientX: 2_000,
        boundsLeft: 0,
        boundsWidth: 960,
      })
    ).toBe(TEST_SNAPSHOT.durationMs);
  });

  it('resolves track roles from clicks on the timeline label column', () => {
    expect(
      resolveMusicDebugTimelineTrackLabelRoleAtPoint({
        canvas: { width: 960, height: 320 },
        clientX: 20,
        clientY: 110,
        boundsLeft: 0,
        boundsTop: 0,
        boundsWidth: 960,
        boundsHeight: 320,
      })
    ).toBe('lead');
    expect(
      resolveMusicDebugTimelineTrackLabelRoleAtPoint({
        canvas: { width: 960, height: 320 },
        clientX: 20,
        clientY: 250,
        boundsLeft: 0,
        boundsTop: 0,
        boundsWidth: 960,
        boundsHeight: 320,
      })
    ).toBe('percussion');
    expect(
      resolveMusicDebugTimelineTrackLabelRoleAtPoint({
        canvas: { width: 960, height: 320 },
        clientX: 140,
        clientY: 110,
        boundsLeft: 0,
        boundsTop: 0,
        boundsWidth: 960,
        boundsHeight: 320,
      })
    ).toBeNull();
  });

  it('brightens note-bar colors when overlaps increase', () => {
    expect(resolveMusicDebugTimelineNoteBarColor('#4f8cff', 1)).toBe('#4f8cff');
    expect(resolveMusicDebugTimelineNoteBarColor('#4f8cff', 3)).toBe('#6fa1ff');
  });

  it('thins dense chord labels and abbreviates narrow cue spans', () => {
    const layout = resolveMusicDebugTimelineLayout(320, 320);
    const chordLabels = resolveMusicDebugTimelineChordLabels(layout, 4_000, [
      {
        degreeIndex: 0,
        label: 'Chord 1 major',
        startMeasure: 1,
        endMeasure: 1,
        startOffsetMs: 0,
        endOffsetMs: 900,
      },
      {
        degreeIndex: 4,
        label: 'Chord 5 minor',
        startMeasure: 2,
        endMeasure: 2,
        startOffsetMs: 900,
        endOffsetMs: 1_800,
      },
      {
        degreeIndex: 3,
        label: 'Chord 4 major',
        startMeasure: 3,
        endMeasure: 3,
        startOffsetMs: 1_800,
        endOffsetMs: 2_200,
      },
      {
        degreeIndex: 5,
        label: 'Chord 6 minor',
        startMeasure: 4,
        endMeasure: 4,
        startOffsetMs: 2_200,
        endOffsetMs: 4_000,
      },
    ]);

    expect(chordLabels.map((entry) => entry.label)).toEqual([
      'Ch1 maj',
      'Ch4 maj',
    ]);
  });
});
