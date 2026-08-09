import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  resolveMusicDebugTimelineLayout,
  resolveMusicDebugTimelineOffsetForX,
  resolveMusicDebugTimelineSeekOffset,
  resolveMusicDebugTimelineXForOffset,
} from './music-debug-timeline.ts';

describe('music debug timeline', () => {
  it('maps offsets to timeline positions and back', () => {
    const layout = resolveMusicDebugTimelineLayout(960, 320);
    const durationMs = 120_000;
    const x = resolveMusicDebugTimelineXForOffset(layout, durationMs, 60_000);

    expect(resolveMusicDebugTimelineOffsetForX(layout, durationMs, x)).toBe(
      60_000
    );
  });

  it('clamps seek offsets to the visible timeline bounds', () => {
    const snapshot = createMusicDebugSnapshot();

    expect(
      resolveMusicDebugTimelineSeekOffset({
        snapshot,
        canvas: { width: 960, height: 320 },
        clientX: -400,
        boundsLeft: 0,
        boundsWidth: 960,
      })
    ).toBe(0);
    expect(
      resolveMusicDebugTimelineSeekOffset({
        snapshot,
        canvas: { width: 960, height: 320 },
        clientX: 2_000,
        boundsLeft: 0,
        boundsWidth: 960,
      })
    ).toBe(snapshot.durationMs);
  });
});
