import { describe, expect, it } from 'vitest';

import { createMusicDebugSnapshot } from './music-debug.ts';
import {
  formatMusicDebugChordCueLabel,
  resolveMusicDebugChordCueAtOffset,
  resolveMusicDebugChordCues,
} from './music-debug-chord-cues.ts';

describe('music debug chord cues', () => {
  it('formats chord labels from shared scale degrees and chord quality', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'plains',
      contextType: 'overworld',
      clusterX: 0,
      clusterY: 0,
    });

    expect(formatMusicDebugChordCueLabel(snapshot.theme.scale, 0)).toBe(
      'Chord 1 major'
    );
    expect(formatMusicDebugChordCueLabel(snapshot.theme.scale, 4)).toBe(
      'Chord 5 minor'
    );
  });

  it('builds contiguous chord cues across the full song timeline', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });
    const cues = resolveMusicDebugChordCues(snapshot);

    expect(cues.length).toBeGreaterThan(0);
    expect(cues[0]?.startMeasure).toBe(1);
    expect(cues[0]?.startOffsetMs).toBe(0);
    expect(cues.at(-1)?.endMeasure).toBe(snapshot.measureCount);
    expect(cues.at(-1)?.endOffsetMs).toBe(snapshot.durationMs);
    expect(cues.every((cue) => cue.endMeasure >= cue.startMeasure)).toBe(true);
  });

  it('resolves the active cue for offsets across the song and clamps at the end', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 3,
      clusterY: -2,
    });
    const cues = resolveMusicDebugChordCues(snapshot);
    const firstCue = cues[0]!;
    const lastCue = cues.at(-1)!;

    expect(resolveMusicDebugChordCueAtOffset(snapshot, 0)).toEqual(firstCue);
    expect(
      resolveMusicDebugChordCueAtOffset(
        snapshot,
        firstCue.endOffsetMs + Math.max(1, snapshot.durationMs * 0.05)
      )
    ).not.toEqual(firstCue);
    expect(
      resolveMusicDebugChordCueAtOffset(snapshot, snapshot.durationMs + 10_000)
    ).toEqual(lastCue);
  });
});
