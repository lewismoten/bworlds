import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  resolveMusicDebugBeatSubdivisionMarkers,
  resolveMusicDebugMeasureMarkers,
} from './music-debug-measure-guides.ts';

describe('music debug measure guides', () => {
  it('builds measure markers with adaptive labels across the song', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });
    const markers = resolveMusicDebugMeasureMarkers(snapshot);

    expect(markers).toHaveLength(snapshot.measureCount);
    expect(markers[0]).toEqual(
      expect.objectContaining({
        measureNumber: 1,
        startOffsetMs: 0,
        label: '1',
      })
    );
    expect(markers.at(-1)).toEqual(
      expect.objectContaining({
        measureNumber: snapshot.measureCount,
        endOffsetMs: snapshot.durationMs,
        label: `${snapshot.measureCount}`,
      })
    );
    expect(
      markers.filter((marker) => marker.label !== null).length
    ).toBeGreaterThan(2);
  });

  it('builds three beat subdivisions inside every measure', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
    });
    const beatMarkers = resolveMusicDebugBeatSubdivisionMarkers(snapshot);

    expect(beatMarkers).toHaveLength(snapshot.measureCount * 3);
    expect(beatMarkers[0]).toEqual(
      expect.objectContaining({
        measureNumber: 1,
        beatNumber: 2,
      })
    );
    expect(
      beatMarkers.every(
        (marker) => marker.offsetMs > 0 && marker.offsetMs < snapshot.durationMs
      )
    ).toBe(true);
  });
});
