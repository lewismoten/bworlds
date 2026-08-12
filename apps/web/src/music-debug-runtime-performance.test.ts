import { describe, expect, it } from 'vitest';
import type { MusicDebugSnapshot } from './music-debug.ts';
import { resolveMusicTheme } from './procedural-music.ts';
import {
  buildMusicDebugRuntimePerformanceContext,
  buildMusicDebugRuntimePerformanceWorldSeed,
} from './music-debug-runtime-performance.ts';
import {
  buildRuntimePerformanceSnapshot,
  collectRuntimePerformanceViolations,
} from './runtime-performance-tracking.ts';
import { validateRuntimePerformanceSnapshot } from './runtime-performance-snapshot-validation.ts';

describe('music debug runtime performance helpers', () => {
  it('builds a deterministic world seed and valid runtime snapshot context', () => {
    const snapshot: Pick<
      MusicDebugSnapshot,
      'theme' | 'options' | 'durationMs'
    > = {
      theme: resolveMusicTheme('forest', 'overworld', undefined, 4, -1),
      options: {
        contextType: 'overworld',
        tileKind: 'forest',
        clusterX: 4,
        clusterY: -1,
        encounterMode: 'ambient',
        weatherKind: 'clear',
        weatherIntensity: 0,
        combatIntensity: 0,
        dayProgress: 0.5,
        yearProgress: 0.5,
      },
      durationMs: 96_000,
    };
    const repeatedSnapshot = {
      ...snapshot,
      theme: { ...snapshot.theme },
      options: { ...snapshot.options },
    };

    expect(buildMusicDebugRuntimePerformanceWorldSeed(snapshot)).toBe(
      buildMusicDebugRuntimePerformanceWorldSeed(repeatedSnapshot)
    );
    expect(buildMusicDebugRuntimePerformanceWorldSeed(snapshot)).toContain(
      `music-debug:${snapshot.theme.id}:`
    );
    expect(buildMusicDebugRuntimePerformanceContext(snapshot)).toEqual({
      id: 'overworld:forest:4:-1',
      label: 'overworld forest',
      depth: 0,
    });
  });

  it('lets music-debug snapshots satisfy runtime snapshot validation', () => {
    const runtimeSnapshot = buildRuntimePerformanceSnapshot({
      source: 'music-debug',
      trigger: 'midi-export',
      route: '/debug/music',
      worldSeed: 'music-debug:town-square:overworld:town:3:-2:ambient:120000',
      context: {
        id: 'overworld:town:3:-2',
        label: 'overworld town',
        depth: 0,
      },
      metrics: {
        midiExportMs: 420,
      },
    });
    runtimeSnapshot.violations = collectRuntimePerformanceViolations(
      runtimeSnapshot.metrics,
      runtimeSnapshot.limits
    );

    expect(validateRuntimePerformanceSnapshot(runtimeSnapshot).errors).toEqual(
      []
    );
  });
});
