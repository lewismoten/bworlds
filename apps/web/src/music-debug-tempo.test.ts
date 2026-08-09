import { describe, expect, it } from 'vitest';
import { resolveProceduralMusicBlueprint } from './procedural-music-blueprint.ts';
import {
  msToMusicDebugTicks,
  resolveMusicDebugTempoBpm,
} from './music-debug-tempo.ts';

describe('music debug tempo', () => {
  it('derives bpm from planned measures and song duration', () => {
    const blueprint = resolveProceduralMusicBlueprint({
      tileKind: 'plains',
      contextType: 'overworld',
    });

    expect(
      resolveMusicDebugTempoBpm({
        blueprint,
        durationMs: 138_000,
      })
    ).toBeCloseTo(153.043478, 6);
  });

  it('converts milliseconds to ticks using the resolved bpm', () => {
    expect(msToMusicDebugTicks(138_000, 153.04347826086956)).toBe(168_960);
  });
});
