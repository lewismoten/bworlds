import { describe, expect, it } from 'vitest';

import { resolveMusicDebugCadenceMarkers } from './music-debug-cadence-markers.ts';
import { createMusicDebugSnapshot } from './music-debug.ts';

const TOWN_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'town',
  contextType: 'town',
  clusterX: 3,
  clusterY: -2,
});

const FOREST_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'forest',
  contextType: 'overworld',
  clusterX: 4,
  clusterY: -1,
});

const TOWN_MARKERS = resolveMusicDebugCadenceMarkers(TOWN_SNAPSHOT);
const FOREST_MARKERS = resolveMusicDebugCadenceMarkers(FOREST_SNAPSHOT);

describe('music debug cadence markers', () => {
  it('builds planned question and answer markers across section phrases', () => {
    expect(TOWN_MARKERS.length).toBeGreaterThan(0);
    expect(TOWN_MARKERS[0]).toEqual(
      expect.objectContaining({
        sectionId: TOWN_SNAPSHOT.song.sections[0]?.id,
        sectionLabel: TOWN_SNAPSHOT.song.sections[0]?.label,
        kind: 'question',
        measureNumber: 4,
        shortLabel: 'Q',
      })
    );
    expect(TOWN_MARKERS.some((marker) => marker.kind === 'answer')).toBe(true);
    expect(TOWN_MARKERS.at(-1)?.measureNumber).toBe(TOWN_SNAPSHOT.measureCount);
  });

  it('keeps cadence marker offsets inside the song duration', () => {
    expect(
      FOREST_MARKERS.every(
        (marker) =>
          marker.offsetMs >= 0 && marker.offsetMs <= FOREST_SNAPSHOT.durationMs
      )
    ).toBe(true);
  });
});
