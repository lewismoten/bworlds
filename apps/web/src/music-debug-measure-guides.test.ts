import { describe, expect, it } from 'vitest';

import type { MusicDebugSnapshot } from './music-debug.ts';
import {
  resolveMusicDebugBeatSubdivisionMarkers,
  resolveMusicDebugMeasureMarkers,
} from './music-debug-measure-guides.ts';

const FOREST_SNAPSHOT = createMeasureGuideSnapshot({
  sections: [createSection(1, 8, 0, 8_000), createSection(9, 16, 8_000, 8_000)],
});
const TOWN_SNAPSHOT = createMeasureGuideSnapshot({
  sections: [createSection(1, 4, 0, 4_000), createSection(5, 8, 4_000, 4_000)],
});
const FOREST_MEASURE_MARKERS = resolveMusicDebugMeasureMarkers(FOREST_SNAPSHOT);
const TOWN_BEAT_MARKERS =
  resolveMusicDebugBeatSubdivisionMarkers(TOWN_SNAPSHOT);

describe('music debug measure guides', () => {
  it('builds measure markers with adaptive labels across the song', () => {
    expect(FOREST_MEASURE_MARKERS).toHaveLength(FOREST_SNAPSHOT.measureCount);
    expect(FOREST_MEASURE_MARKERS[0]).toEqual(
      expect.objectContaining({
        measureNumber: 1,
        startOffsetMs: 0,
        label: '1',
      })
    );
    expect(FOREST_MEASURE_MARKERS.at(-1)).toEqual(
      expect.objectContaining({
        measureNumber: FOREST_SNAPSHOT.measureCount,
        endOffsetMs: FOREST_SNAPSHOT.durationMs,
        label: `${FOREST_SNAPSHOT.measureCount}`,
      })
    );
    expect(
      FOREST_MEASURE_MARKERS.filter((marker) => marker.label !== null).length
    ).toBeGreaterThan(2);
  });

  it('builds three beat subdivisions inside every measure', () => {
    expect(TOWN_BEAT_MARKERS).toHaveLength(TOWN_SNAPSHOT.measureCount * 3);
    expect(TOWN_BEAT_MARKERS[0]).toEqual(
      expect.objectContaining({
        measureNumber: 1,
        beatNumber: 2,
      })
    );
    expect(
      TOWN_BEAT_MARKERS.every(
        (marker) =>
          marker.offsetMs > 0 && marker.offsetMs < TOWN_SNAPSHOT.durationMs
      )
    ).toBe(true);
  });
});

function createMeasureGuideSnapshot(options: {
  sections: NonNullable<MusicDebugSnapshot['song']>['sections'];
}): MusicDebugSnapshot {
  const measureCount = options.sections.at(-1)?.endMeasure ?? 0;
  const durationMs = options.sections.reduce(
    (max, section) => Math.max(max, section.startOffsetMs + section.durationMs),
    0
  );

  return {
    measureCount,
    durationMs,
    song: {
      sections: options.sections,
    },
  } as MusicDebugSnapshot;
}

function createSection(
  startMeasure: number,
  endMeasure: number,
  startOffsetMs: number,
  durationMs: number
): MusicDebugSnapshot['song']['sections'][number] {
  return {
    startMeasure,
    endMeasure,
    startOffsetMs,
    durationMs,
  } as MusicDebugSnapshot['song']['sections'][number];
}
