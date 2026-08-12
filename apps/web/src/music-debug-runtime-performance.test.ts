import { describe, expect, it } from 'vitest';
import { createMusicDebugSnapshot } from './music-debug.ts';
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
    const snapshot = createMusicDebugSnapshot({
      contextType: 'overworld',
      tileKind: 'forest',
      clusterX: 4,
      clusterY: -1,
      encounterMode: 'ambient',
    });
    const repeatedSnapshot = createMusicDebugSnapshot({
      contextType: 'overworld',
      tileKind: 'forest',
      clusterX: 4,
      clusterY: -1,
      encounterMode: 'ambient',
    });

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
    const snapshot = createMusicDebugSnapshot({
      contextType: 'overworld',
      tileKind: 'town',
      clusterX: 3,
      clusterY: -2,
    });

    const runtimeSnapshot = buildRuntimePerformanceSnapshot({
      source: 'music-debug',
      trigger: 'midi-export',
      route: '/debug/music',
      worldSeed: buildMusicDebugRuntimePerformanceWorldSeed(snapshot),
      context: buildMusicDebugRuntimePerformanceContext(snapshot),
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
