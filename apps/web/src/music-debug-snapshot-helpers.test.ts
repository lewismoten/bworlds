import { describe, expect, it } from 'vitest';
import {
  formatMusicDebugDuration,
  formatMusicDebugLoopRange,
  normalizeMusicDebugOptions,
  randomizeMusicDebugSeed,
} from './music-debug.ts';

describe('music debug snapshot helpers', () => {
  it('normalizes partial options into a safe debug snapshot configuration', () => {
    expect(
      normalizeMusicDebugOptions({
        tileKind: 'forest',
        encounterMode: 'boss',
        dayProgress: 2,
        yearProgress: -1,
        weatherIntensity: 4,
        combatIntensity: -2,
      })
    ).toEqual(
      expect.objectContaining({
        tileKind: 'forest',
        contextType: 'overworld',
        encounterMode: 'boss',
        dayProgress: 1,
        yearProgress: 0,
        weatherIntensity: 1,
        combatIntensity: 0,
      })
    );
  });

  it('formats song durations and loop ranges as minute-second labels', () => {
    expect(formatMusicDebugDuration(0)).toBe('0:00');
    expect(formatMusicDebugDuration(62_000)).toBe('1:02');
    expect(formatMusicDebugLoopRange(8_000, 136_000)).toBe('0:08 - 2:16');
  });

  it('randomizes generator seed coordinates within the supported debug range', () => {
    expect(
      randomizeMusicDebugSeed(
        {
          tileKind: 'forest',
          clusterX: 0,
          clusterY: 0,
        },
        () => 1
      )
    ).toEqual(
      expect.objectContaining({
        clusterX: 9_999,
        clusterY: 9_999,
      })
    );
    expect(
      randomizeMusicDebugSeed(
        {
          tileKind: 'forest',
          clusterX: 0,
          clusterY: 0,
        },
        () => 0
      )
    ).toEqual(
      expect.objectContaining({
        clusterX: -9_999,
        clusterY: -9_999,
      })
    );
  });
});
