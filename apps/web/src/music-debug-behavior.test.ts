import { describe, expect, it } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';

describe('music debug behavior', () => {
  it('resolves playback regions and durations from loop metadata', async () => {
    const module = await import('./music-debug.ts');
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
    });

    expect(module.resolveMusicDebugPlaybackRegion(snapshot)).toEqual({
      startOffsetMs: 0,
      endOffsetMs: snapshot.durationMs,
    });
    expect(
      module.resolveMusicDebugPlaybackDurationMs(snapshot, {
        startOffsetMs: snapshot.loopStartOffsetMs,
        endOffsetMs: snapshot.loopEndOffsetMs,
      })
    ).toBe(snapshot.loopEndOffsetMs - snapshot.loopStartOffsetMs);
  });

  it('lowers harmony occupancy in lead-active reprise and contrast sections', () => {
    const snapshot = createMusicDebugSnapshot({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 4,
      clusterY: -1,
    });
    const activityById = new Map(
      snapshot.sectionLayerActivity.map((activity) => [
        activity.sectionId,
        activity,
      ])
    );
    const sectionA = activityById.get('a');
    const sectionAPrime = activityById.get('a-prime');
    const sectionB = activityById.get('b');

    expect(sectionA).toBeDefined();
    expect(sectionAPrime).toBeDefined();
    expect(sectionB).toBeDefined();
    expect(sectionAPrime!.soundingTimePercentageByRole.harmony).toBeLessThan(
      sectionA!.soundingTimePercentageByRole.harmony
    );
    expect(sectionB!.soundingTimePercentageByRole.harmony).toBeLessThan(
      sectionA!.soundingTimePercentageByRole.harmony
    );
  });
});
