import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  resolveMusicDebugBeatSubdivisionMarkers,
  resolveMusicDebugMeasureMarkers,
} from './music-debug-measure-guides.ts';

const FOREST_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'forest',
  contextType: 'overworld',
  clusterX: 4,
  clusterY: -1,
});
const TOWN_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'town',
  contextType: 'town',
  clusterX: 3,
  clusterY: -2,
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
