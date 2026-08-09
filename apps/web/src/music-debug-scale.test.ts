import { describe, expect, it } from 'vitest';
import {
  createMusicDebugSnapshot,
  type MusicDebugTimelineLayout,
} from './music-debug.ts';
import { createMusicDebugScaleOverlay } from './music-debug-scale.ts';

const TEST_LAYOUT: MusicDebugTimelineLayout = {
  width: 960,
  height: 320,
  leftPad: 84,
  rightPad: 24,
  topPad: 22,
  bottomPad: 24,
  trackHeight: (320 - 22 - 24) / 4,
  roleOrder: ['bass', 'harmony', 'lead', 'percussion'],
};

describe('music debug scale overlay', () => {
  it('builds scale guides and note markers for non-percussion roles only', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
      dayProgress: 0.25,
      yearProgress: 0.75,
    });

    const overlay = createMusicDebugScaleOverlay(snapshot, TEST_LAYOUT);

    expect(overlay.guides.length).toBeGreaterThan(0);
    expect(overlay.markers.length).toBeGreaterThan(0);
    expect(new Set(overlay.markers.map((marker) => marker.role))).toEqual(
      new Set(['bass', 'harmony', 'lead'])
    );
  });

  it('positions note markers inside the visible timeline bounds', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 0,
      clusterY: 0,
      dayProgress: 0.5,
      yearProgress: 0.25,
    });

    const overlay = createMusicDebugScaleOverlay(snapshot, TEST_LAYOUT);

    expect(
      overlay.markers.every(
        (marker) =>
          marker.x >= TEST_LAYOUT.leftPad &&
          marker.x <= TEST_LAYOUT.width - TEST_LAYOUT.rightPad &&
          marker.y >= TEST_LAYOUT.topPad &&
          marker.y <= TEST_LAYOUT.height - TEST_LAYOUT.bottomPad
      )
    ).toBe(true);
    expect(
      overlay.guides.every(
        (guide) =>
          guide.y >= TEST_LAYOUT.topPad &&
          guide.y <= TEST_LAYOUT.height - TEST_LAYOUT.bottomPad
      )
    ).toBe(true);
  });
});
