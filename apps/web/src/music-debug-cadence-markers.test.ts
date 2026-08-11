import { describe, expect, it } from 'vitest';

import { resolveMusicDebugCadenceMarkers } from './music-debug-cadence-markers.ts';
import { createMusicDebugSnapshot } from './music-debug.ts';

describe('music debug cadence markers', () => {
  it('builds planned question and answer markers across section phrases', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
    });
    const markers = resolveMusicDebugCadenceMarkers(snapshot);

    expect(markers.length).toBeGreaterThan(0);
    expect(markers[0]).toEqual(
      expect.objectContaining({
        sectionId: snapshot.song.sections[0]?.id,
        sectionLabel: snapshot.song.sections[0]?.label,
        kind: 'question',
        measureNumber: 4,
        shortLabel: 'Q',
      })
    );
    expect(markers.some((marker) => marker.kind === 'answer')).toBe(true);
    expect(markers.at(-1)?.measureNumber).toBe(snapshot.measureCount);
  });

  it('keeps cadence marker offsets inside the song duration', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });
    const markers = resolveMusicDebugCadenceMarkers(snapshot);

    expect(
      markers.every(
        (marker) =>
          marker.offsetMs >= 0 && marker.offsetMs <= snapshot.durationMs
      )
    ).toBe(true);
  });
});
