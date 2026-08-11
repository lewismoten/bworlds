import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  startMusicDebugTimelinePointerDrag,
  updateMusicDebugTimelinePointerDrag,
} from './music-debug-timeline-drag.ts';

describe('music debug timeline drag', () => {
  it('starts pointer drags on the timeline body and updates their offsets', () => {
    const snapshot = createMusicDebugSnapshot();
    const dragState = startMusicDebugTimelinePointerDrag({
      snapshot,
      canvas: { width: 960, height: 320 },
      pointerId: 12,
      button: 0,
      clientX: 240,
      clientY: 140,
      boundsLeft: 0,
      boundsTop: 0,
      boundsWidth: 960,
      boundsHeight: 320,
    });

    expect(dragState).toEqual(
      expect.objectContaining({
        pointerId: 12,
        dragging: false,
      })
    );

    const nextState = updateMusicDebugTimelinePointerDrag(dragState!, {
      snapshot,
      canvas: { width: 960, height: 320 },
      clientX: 720,
      clientY: 144,
      boundsLeft: 0,
      boundsWidth: 960,
    });

    expect(nextState.dragging).toBe(true);
    expect(nextState.offsetMs).toBeGreaterThan(dragState!.offsetMs);
  });

  it('ignores non-primary buttons and track-label clicks when starting drags', () => {
    const snapshot = createMusicDebugSnapshot();

    expect(
      startMusicDebugTimelinePointerDrag({
        snapshot,
        canvas: { width: 960, height: 320 },
        pointerId: 3,
        button: 2,
        clientX: 240,
        clientY: 140,
        boundsLeft: 0,
        boundsTop: 0,
        boundsWidth: 960,
        boundsHeight: 320,
      })
    ).toBeNull();

    expect(
      startMusicDebugTimelinePointerDrag({
        snapshot,
        canvas: { width: 960, height: 320 },
        pointerId: 4,
        button: 0,
        clientX: 20,
        clientY: 110,
        boundsLeft: 0,
        boundsTop: 0,
        boundsWidth: 960,
        boundsHeight: 320,
      })
    ).toBeNull();
  });

  it('keeps small pointer jitter from turning a click into a drag', () => {
    const snapshot = createMusicDebugSnapshot();
    const dragState = startMusicDebugTimelinePointerDrag({
      snapshot,
      canvas: { width: 960, height: 320 },
      pointerId: 8,
      button: 0,
      clientX: 300,
      clientY: 180,
      boundsLeft: 0,
      boundsTop: 0,
      boundsWidth: 960,
      boundsHeight: 320,
    });

    const nextState = updateMusicDebugTimelinePointerDrag(dragState!, {
      snapshot,
      canvas: { width: 960, height: 320 },
      clientX: 302,
      clientY: 182,
      boundsLeft: 0,
      boundsWidth: 960,
    });

    expect(nextState.dragging).toBe(false);
  });
});
