import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  formatMusicDebugChordCueLabel,
  resolveMusicDebugChordCueAtOffset,
  resolveMusicDebugChordCues,
} from './music-debug-chord-cues.ts';

const PLAINS_SNAPSHOT = createMusicDebugSnapshot({
  tileKind: 'plains',
  contextType: 'overworld',
  clusterX: 0,
  clusterY: 0,
});

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

const FOREST_CUES = resolveMusicDebugChordCues(FOREST_SNAPSHOT);
const TOWN_CUES = resolveMusicDebugChordCues(TOWN_SNAPSHOT);

describe('music debug chord cues', () => {
  it('formats chord labels from shared scale degrees and chord quality', () => {
    expect(formatMusicDebugChordCueLabel(PLAINS_SNAPSHOT.theme.scale, 0)).toBe(
      'Chord 1 major'
    );
    expect(formatMusicDebugChordCueLabel(PLAINS_SNAPSHOT.theme.scale, 4)).toBe(
      'Chord 5 minor'
    );
  });

  it('builds contiguous chord cues across the full song timeline', () => {
    expect(FOREST_CUES.length).toBeGreaterThan(0);
    expect(FOREST_CUES[0]?.startMeasure).toBe(1);
    expect(FOREST_CUES[0]?.startOffsetMs).toBe(0);
    expect(FOREST_CUES.at(-1)?.endMeasure).toBe(FOREST_SNAPSHOT.measureCount);
    expect(FOREST_CUES.at(-1)?.endOffsetMs).toBe(FOREST_SNAPSHOT.durationMs);
    expect(FOREST_CUES.every((cue) => cue.endMeasure >= cue.startMeasure)).toBe(
      true
    );
  });

  it('resolves the active cue for offsets across the song and clamps at the end', () => {
    const firstCue = TOWN_CUES[0]!;
    const lastCue = TOWN_CUES.at(-1)!;

    expect(resolveMusicDebugChordCueAtOffset(TOWN_SNAPSHOT, 0)).toEqual(
      firstCue
    );
    expect(
      resolveMusicDebugChordCueAtOffset(
        TOWN_SNAPSHOT,
        firstCue.endOffsetMs + Math.max(1, TOWN_SNAPSHOT.durationMs * 0.05)
      )
    ).not.toEqual(firstCue);
    expect(
      resolveMusicDebugChordCueAtOffset(
        TOWN_SNAPSHOT,
        TOWN_SNAPSHOT.durationMs + 10_000
      )
    ).toEqual(lastCue);
  });
});
