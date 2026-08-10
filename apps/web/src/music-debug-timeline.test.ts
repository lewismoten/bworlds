import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  resolveMusicDebugTimelineLayout,
  resolveMusicDebugTimelineNoteBars,
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

  it('renders short note bars at pitch lanes instead of full-height track blocks', () => {
    const snapshot = createMusicDebugSnapshot();
    const layout = resolveMusicDebugTimelineLayout(960, 320);
    const noteBars = resolveMusicDebugTimelineNoteBars(snapshot, layout);

    expect(noteBars.length).toBe(snapshot.notes.length);
    expect(
      noteBars.every((bar) => bar.height < layout.trackHeight * 0.5)
    ).toBe(true);
    expect(
      noteBars.some((bar) => {
        if (bar.role === 'percussion') {
          return false;
        }
        const roleIndex = layout.roleOrder.indexOf(bar.role);
        const trackTop = layout.topPad + roleIndex * layout.trackHeight + 10;
        return bar.y > trackTop;
      })
    ).toBe(true);
  });
});
