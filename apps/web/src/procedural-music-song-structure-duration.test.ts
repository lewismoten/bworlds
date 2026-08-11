import { describe, expect, it } from 'vitest';
import { resolveProceduralMusicSongDurationMs } from './procedural-music-song.ts';

describe('procedural music song structure durations', () => {
  it('keeps overworld and town songs in the two-to-three-minute range', () => {
    const durationMs = resolveProceduralMusicSongDurationMs({
      tileKind: 'forest',
      contextType: 'overworld',
      clusterX: 3,
      clusterY: -2,
    });
    const townDurationMs = resolveProceduralMusicSongDurationMs({
      tileKind: 'town',
      contextType: 'town',
      clusterX: 7,
      clusterY: 4,
    });

    expect(durationMs).toBeGreaterThanOrEqual(120_000);
    expect(durationMs).toBeLessThanOrEqual(180_000);
    expect(townDurationMs).toBeGreaterThanOrEqual(120_000);
    expect(townDurationMs).toBeLessThanOrEqual(180_000);
  });

  it('keeps battle tracks in the one-to-two-minute range', () => {
    const durationMs = resolveProceduralMusicSongDurationMs({
      tileKind: 'forest',
      contextType: 'overworld',
      encounterMode: 'battle',
      combatIntensity: 0.6,
      clusterX: 3,
      clusterY: -2,
    });

    expect(durationMs).toBeGreaterThanOrEqual(60_000);
    expect(durationMs).toBeLessThanOrEqual(120_000);
  });

  it('lets boss or cinematic tracks run in the three-to-six-minute range', () => {
    const durationMs = resolveProceduralMusicSongDurationMs({
      tileKind: 'cave',
      contextType: 'dungeon',
      encounterMode: 'boss',
      combatIntensity: 0.95,
      clusterX: 7,
      clusterY: 4,
    });

    expect(durationMs).toBeGreaterThanOrEqual(180_000);
    expect(durationMs).toBeLessThanOrEqual(360_000);
  });
});
