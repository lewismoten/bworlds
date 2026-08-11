import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  startMusicDebugTimelinePointerDrag,
  updateMusicDebugTimelinePointerDrag,
} from './music-debug-timeline-drag.ts';

const DEFAULT_SNAPSHOT = createMusicDebugSnapshot();
const DEFAULT_CANVAS = { width: 960, height: 320 } as const;
const DEFAULT_BOUNDS = {
  boundsLeft: 0,
  boundsTop: 0,
  boundsWidth: 960,
  boundsHeight: 320,
} as const;

describe('music debug timeline drag', () => {
  it('starts pointer drags on the timeline body and updates their offsets', () => {
    const dragState = startMusicDebugTimelinePointerDrag({
      snapshot: DEFAULT_SNAPSHOT,
      canvas: DEFAULT_CANVAS,
      pointerId: 12,
      button: 0,
      clientX: 240,
      clientY: 140,
      ...DEFAULT_BOUNDS,
    });

    expect(dragState).toEqual(
      expect.objectContaining({
        pointerId: 12,
        dragging: false,
      })
    );

    const nextState = updateMusicDebugTimelinePointerDrag(dragState!, {
      snapshot: DEFAULT_SNAPSHOT,
      canvas: DEFAULT_CANVAS,
      clientX: 720,
      clientY: 144,
      boundsLeft: DEFAULT_BOUNDS.boundsLeft,
      boundsWidth: DEFAULT_BOUNDS.boundsWidth,
    });

    expect(nextState.dragging).toBe(true);
    expect(nextState.offsetMs).toBeGreaterThan(dragState!.offsetMs);
  });

  it('ignores non-primary buttons and track-label clicks when starting drags', () => {
    expect(
      startMusicDebugTimelinePointerDrag({
        snapshot: DEFAULT_SNAPSHOT,
        canvas: DEFAULT_CANVAS,
        pointerId: 3,
        button: 2,
        clientX: 240,
        clientY: 140,
        ...DEFAULT_BOUNDS,
      })
    ).toBeNull();

    expect(
      startMusicDebugTimelinePointerDrag({
        snapshot: DEFAULT_SNAPSHOT,
        canvas: DEFAULT_CANVAS,
        pointerId: 4,
        button: 0,
        clientX: 20,
        clientY: 110,
        ...DEFAULT_BOUNDS,
      })
    ).toBeNull();
  });

  it('keeps small pointer jitter from turning a click into a drag', () => {
    const dragState = startMusicDebugTimelinePointerDrag({
      snapshot: DEFAULT_SNAPSHOT,
      canvas: DEFAULT_CANVAS,
      pointerId: 8,
      button: 0,
      clientX: 300,
      clientY: 180,
      ...DEFAULT_BOUNDS,
    });

    const nextState = updateMusicDebugTimelinePointerDrag(dragState!, {
      snapshot: DEFAULT_SNAPSHOT,
      canvas: DEFAULT_CANVAS,
      clientX: 302,
      clientY: 182,
      boundsLeft: DEFAULT_BOUNDS.boundsLeft,
      boundsWidth: DEFAULT_BOUNDS.boundsWidth,
    });

    expect(nextState.dragging).toBe(false);
  });
});
