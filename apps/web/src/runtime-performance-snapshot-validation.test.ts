import { describe, expect, it } from 'vitest';
import {
  collectRuntimePerformanceViolations,
  DEFAULT_RUNTIME_PERFORMANCE_LIMITS,
} from './runtime-performance-tracking.ts';
import {
  NULLABLE_RUNTIME_PERFORMANCE_METRICS,
  REQUIRED_RUNTIME_PERFORMANCE_METRICS_BY_TRIGGER,
  RUNTIME_PERFORMANCE_LIMIT_TO_METRIC_PATHS,
  createValidRuntimePerformanceSnapshot,
  validateRuntimePerformanceSnapshot,
} from './runtime-performance-snapshot-validation.ts';

describe('runtime performance snapshot validation', () => {
  it('accepts a valid runtime performance snapshot', () => {
    const snapshot = createValidRuntimePerformanceSnapshot();

    expect(validateRuntimePerformanceSnapshot(snapshot).errors).toEqual([]);
  });

  it('treats nullable non-required metrics as unmeasured rather than invalid zeros', () => {
    const snapshot = createValidRuntimePerformanceSnapshot();
    snapshot.trigger = 'runtime-issue';
    snapshot.metrics.initialWorldGenerationMs = null;
    snapshot.metrics.memoryAfterRegionChangeMb = null;
    snapshot.metrics.songGenerationMs = null;
    snapshot.metrics.midiExportMs = null;
    snapshot.metrics.wavExportMs = null;
    snapshot.violations = [];

    expect(validateRuntimePerformanceSnapshot(snapshot).errors).toEqual([]);
  });

  it('keeps the supported limit fields aligned with the supported metric fields', () => {
    expect(
      Object.keys(RUNTIME_PERFORMANCE_LIMIT_TO_METRIC_PATHS).sort()
    ).toEqual(Object.keys(DEFAULT_RUNTIME_PERFORMANCE_LIMITS).sort());
    expect(
      Object.values(RUNTIME_PERFORMANCE_LIMIT_TO_METRIC_PATHS).sort()
    ).toEqual([
      'activeThreeObjectCount',
      'audioNodeCount',
      'drawCalls',
      'initialWorldGenerationMs',
      'maximumFrameMs',
      'memoryAfterRegionChangeMb',
      'midiExportMs',
      'songGenerationMs',
      'visibleTileGeneration.averageMs',
      'visibleTileGeneration.maxMs',
      'visibleTileGeneration.pendingTileCount',
      'wavExportMs',
    ]);
    expect(NULLABLE_RUNTIME_PERFORMANCE_METRICS).toEqual(
      expect.arrayContaining([
        'initialWorldGenerationMs',
        'visibleTileGeneration',
        'maximumFrameMs',
        'memoryAfterRegionChangeMb',
        'activeThreeObjectCount',
        'drawCalls',
        'audioNodeCount',
        'songGenerationMs',
        'midiExportMs',
        'wavExportMs',
      ])
    );
  });

  it('rejects unsupported schema metadata and invalid context fields', () => {
    const snapshot = createValidRuntimePerformanceSnapshot() as Record<
      string,
      unknown
    >;
    snapshot.schemaVersion = 2;
    snapshot.createdAt = 'not-a-date';
    snapshot.source = 'server';
    snapshot.trigger = 'shutdown';
    snapshot.route = ' ';
    snapshot.worldSeed = '';
    snapshot.context = {
      id: ' ',
      label: '',
      depth: Number.NaN,
    };

    expect(
      validateRuntimePerformanceSnapshot(snapshot as never).errors
    ).toEqual(
      expect.arrayContaining([
        'Unsupported runtime performance snapshot schema version 2.',
        'Runtime performance snapshot createdAt must be a valid ISO-8601 timestamp.',
        'Runtime performance snapshot source must be one of game, music-debug.',
        'Runtime performance snapshot trigger must be one of startup, region-change, runtime-issue, song-generated, midi-export, wav-export, bundle-export.',
        'Runtime performance snapshot route must be a non-empty string.',
        'Runtime performance snapshot worldSeed must be a non-empty string.',
        'Runtime performance snapshot context must be null or include a non-empty id, optional non-empty label, and finite depth when present.',
      ])
    );
  });

  it('rejects negative and non-finite limits and metrics', () => {
    const snapshot = createValidRuntimePerformanceSnapshot();
    snapshot.limits.drawCalls = -1;
    snapshot.limits.maximumFrameMs = Number.POSITIVE_INFINITY;
    snapshot.metrics.drawCalls = -1;
    snapshot.metrics.maximumFrameMs = Number.NaN;
    snapshot.metrics.visibleTileGeneration = {
      averageMs: 4,
      maxMs: Number.POSITIVE_INFINITY,
      buildsPerSecond: -1,
      pendingTileCount: 0,
    };
    snapshot.violations = [];

    expect(validateRuntimePerformanceSnapshot(snapshot).errors).toEqual(
      expect.arrayContaining([
        'Runtime performance snapshot limit drawCalls must be a finite non-negative number.',
        'Runtime performance snapshot limit maximumFrameMs must be a finite non-negative number.',
        'Runtime performance snapshot metric drawCalls must be null or a finite non-negative number.',
        'Runtime performance snapshot metric maximumFrameMs must be null or a finite non-negative number.',
        'Runtime performance snapshot metric visibleTileGeneration.maxMs must be null or a finite non-negative number.',
        'Runtime performance snapshot metric visibleTileGeneration.buildsPerSecond must be null or a finite non-negative number.',
      ])
    );
  });

  it('fails when a trigger-specific required metric is missing', () => {
    const startupSnapshot = createValidRuntimePerformanceSnapshot();
    startupSnapshot.trigger = 'startup';
    startupSnapshot.metrics.initialWorldGenerationMs = null;

    const bundleSnapshot = createValidRuntimePerformanceSnapshot();
    bundleSnapshot.trigger = 'bundle-export';
    bundleSnapshot.metrics.midiExportMs = null;
    bundleSnapshot.metrics.wavExportMs = null;

    expect(
      validateRuntimePerformanceSnapshot(startupSnapshot).errors
    ).toContain(
      'Runtime performance snapshot trigger startup requires metric initialWorldGenerationMs.'
    );
    expect(validateRuntimePerformanceSnapshot(bundleSnapshot).errors).toEqual(
      expect.arrayContaining([
        'Runtime performance snapshot trigger bundle-export requires metric midiExportMs.',
        'Runtime performance snapshot trigger bundle-export requires metric wavExportMs.',
      ])
    );
  });

  it('defines required metrics for every supported runtime snapshot trigger', () => {
    expect(
      Object.keys(REQUIRED_RUNTIME_PERFORMANCE_METRICS_BY_TRIGGER).sort()
    ).toEqual([
      'bundle-export',
      'midi-export',
      'region-change',
      'runtime-issue',
      'song-generated',
      'startup',
      'wav-export',
    ]);
  });

  it('requires the stored violations to match the measured hard-limit failures', () => {
    const snapshot = createValidRuntimePerformanceSnapshot();
    snapshot.metrics.drawCalls =
      DEFAULT_RUNTIME_PERFORMANCE_LIMITS.drawCalls + 1;
    snapshot.violations = [];

    expect(validateRuntimePerformanceSnapshot(snapshot).errors).toContain(
      'Runtime performance snapshot is missing expected violation: Draw calls 1201 exceeded 1200.'
    );
  });

  it('rejects unexpected stored violations when the metrics do not support them', () => {
    const snapshot = createValidRuntimePerformanceSnapshot();
    snapshot.violations = ['Draw calls 1201 exceeded 1200.'];

    expect(validateRuntimePerformanceSnapshot(snapshot).errors).toContain(
      'Runtime performance snapshot contains unexpected violation: Draw calls 1201 exceeded 1200.'
    );
  });

  const limitCases = [
    {
      name: 'initial world generation',
      limit: DEFAULT_RUNTIME_PERFORMANCE_LIMITS.initialWorldGenerationMs,
      apply: (value: number) => ({
        path: 'initialWorldGenerationMs',
        set(
          snapshot: ReturnType<typeof createValidRuntimePerformanceSnapshot>
        ) {
          snapshot.metrics.initialWorldGenerationMs = value;
        },
      }),
      expectedViolation: `Initial world generation ${(
        DEFAULT_RUNTIME_PERFORMANCE_LIMITS.initialWorldGenerationMs + 1
      ).toFixed(
        1
      )} ms exceeded ${DEFAULT_RUNTIME_PERFORMANCE_LIMITS.initialWorldGenerationMs.toFixed(1)} ms.`,
    },
    {
      name: 'visible tile average generation',
      limit: DEFAULT_RUNTIME_PERFORMANCE_LIMITS.visibleTileGenerationAverageMs,
      apply: (value: number) => ({
        path: 'visibleTileGeneration.averageMs',
        set(
          snapshot: ReturnType<typeof createValidRuntimePerformanceSnapshot>
        ) {
          snapshot.metrics.visibleTileGeneration = {
            averageMs: value,
            maxMs: Math.max(value, 8),
            buildsPerSecond: 12,
            pendingTileCount: 0,
          };
        },
      }),
      expectedViolation: `Visible tile average generation ${(
        DEFAULT_RUNTIME_PERFORMANCE_LIMITS.visibleTileGenerationAverageMs + 1
      ).toFixed(
        1
      )} ms exceeded ${DEFAULT_RUNTIME_PERFORMANCE_LIMITS.visibleTileGenerationAverageMs.toFixed(1)} ms.`,
    },
    {
      name: 'visible tile maximum generation',
      limit: DEFAULT_RUNTIME_PERFORMANCE_LIMITS.visibleTileGenerationMaxMs,
      apply: (value: number) => ({
        path: 'visibleTileGeneration.maxMs',
        set(
          snapshot: ReturnType<typeof createValidRuntimePerformanceSnapshot>
        ) {
          snapshot.metrics.visibleTileGeneration = {
            averageMs: Math.min(value, 8),
            maxMs: value,
            buildsPerSecond: 12,
            pendingTileCount: 0,
          };
        },
      }),
      expectedViolation: `Visible tile maximum generation ${(
        DEFAULT_RUNTIME_PERFORMANCE_LIMITS.visibleTileGenerationMaxMs + 1
      ).toFixed(
        1
      )} ms exceeded ${DEFAULT_RUNTIME_PERFORMANCE_LIMITS.visibleTileGenerationMaxMs.toFixed(1)} ms.`,
    },
    {
      name: 'pending tile count',
      limit: DEFAULT_RUNTIME_PERFORMANCE_LIMITS.pendingTileCount,
      apply: (value: number) => ({
        path: 'visibleTileGeneration.pendingTileCount',
        set(
          snapshot: ReturnType<typeof createValidRuntimePerformanceSnapshot>
        ) {
          snapshot.metrics.visibleTileGeneration = {
            averageMs: 4,
            maxMs: 8,
            buildsPerSecond: 12,
            pendingTileCount: value,
          };
        },
      }),
      expectedViolation: `Pending tile count ${DEFAULT_RUNTIME_PERFORMANCE_LIMITS.pendingTileCount + 1} exceeded ${DEFAULT_RUNTIME_PERFORMANCE_LIMITS.pendingTileCount}.`,
    },
    {
      name: 'maximum frame time',
      limit: DEFAULT_RUNTIME_PERFORMANCE_LIMITS.maximumFrameMs,
      apply: (value: number) => ({
        path: 'maximumFrameMs',
        set(
          snapshot: ReturnType<typeof createValidRuntimePerformanceSnapshot>
        ) {
          snapshot.metrics.maximumFrameMs = value;
        },
      }),
      expectedViolation: `Maximum frame time ${(
        DEFAULT_RUNTIME_PERFORMANCE_LIMITS.maximumFrameMs + 1
      ).toFixed(
        1
      )} ms exceeded ${DEFAULT_RUNTIME_PERFORMANCE_LIMITS.maximumFrameMs.toFixed(1)} ms.`,
    },
    {
      name: 'memory after region change',
      limit: DEFAULT_RUNTIME_PERFORMANCE_LIMITS.memoryAfterRegionChangeMb,
      apply: (value: number) => ({
        path: 'memoryAfterRegionChangeMb',
        set(
          snapshot: ReturnType<typeof createValidRuntimePerformanceSnapshot>
        ) {
          snapshot.metrics.memoryAfterRegionChangeMb = value;
        },
      }),
      expectedViolation: `Memory after region change ${(
        DEFAULT_RUNTIME_PERFORMANCE_LIMITS.memoryAfterRegionChangeMb + 1
      ).toFixed(
        1
      )} MB exceeded ${DEFAULT_RUNTIME_PERFORMANCE_LIMITS.memoryAfterRegionChangeMb.toFixed(1)} MB.`,
    },
    {
      name: 'active Three.js object count',
      limit: DEFAULT_RUNTIME_PERFORMANCE_LIMITS.activeThreeObjectCount,
      apply: (value: number) => ({
        path: 'activeThreeObjectCount',
        set(
          snapshot: ReturnType<typeof createValidRuntimePerformanceSnapshot>
        ) {
          snapshot.metrics.activeThreeObjectCount = value;
        },
      }),
      expectedViolation: `Active Three.js object count ${DEFAULT_RUNTIME_PERFORMANCE_LIMITS.activeThreeObjectCount + 1} exceeded ${DEFAULT_RUNTIME_PERFORMANCE_LIMITS.activeThreeObjectCount}.`,
    },
    {
      name: 'draw calls',
      limit: DEFAULT_RUNTIME_PERFORMANCE_LIMITS.drawCalls,
      apply: (value: number) => ({
        path: 'drawCalls',
        set(
          snapshot: ReturnType<typeof createValidRuntimePerformanceSnapshot>
        ) {
          snapshot.metrics.drawCalls = value;
        },
      }),
      expectedViolation: `Draw calls ${DEFAULT_RUNTIME_PERFORMANCE_LIMITS.drawCalls + 1} exceeded ${DEFAULT_RUNTIME_PERFORMANCE_LIMITS.drawCalls}.`,
    },
    {
      name: 'audio node count',
      limit: DEFAULT_RUNTIME_PERFORMANCE_LIMITS.audioNodeCount,
      apply: (value: number) => ({
        path: 'audioNodeCount',
        set(
          snapshot: ReturnType<typeof createValidRuntimePerformanceSnapshot>
        ) {
          snapshot.metrics.audioNodeCount = value;
        },
      }),
      expectedViolation: `Audio node count ${DEFAULT_RUNTIME_PERFORMANCE_LIMITS.audioNodeCount + 1} exceeded ${DEFAULT_RUNTIME_PERFORMANCE_LIMITS.audioNodeCount}.`,
    },
    {
      name: 'song generation',
      limit: DEFAULT_RUNTIME_PERFORMANCE_LIMITS.songGenerationMs,
      apply: (value: number) => ({
        path: 'songGenerationMs',
        set(
          snapshot: ReturnType<typeof createValidRuntimePerformanceSnapshot>
        ) {
          snapshot.metrics.songGenerationMs = value;
        },
      }),
      expectedViolation: `Song generation ${(
        DEFAULT_RUNTIME_PERFORMANCE_LIMITS.songGenerationMs + 1
      ).toFixed(
        1
      )} ms exceeded ${DEFAULT_RUNTIME_PERFORMANCE_LIMITS.songGenerationMs.toFixed(1)} ms.`,
    },
    {
      name: 'MIDI export',
      limit: DEFAULT_RUNTIME_PERFORMANCE_LIMITS.midiExportMs,
      apply: (value: number) => ({
        path: 'midiExportMs',
        set(
          snapshot: ReturnType<typeof createValidRuntimePerformanceSnapshot>
        ) {
          snapshot.metrics.midiExportMs = value;
        },
      }),
      expectedViolation: `MIDI export ${(
        DEFAULT_RUNTIME_PERFORMANCE_LIMITS.midiExportMs + 1
      ).toFixed(
        1
      )} ms exceeded ${DEFAULT_RUNTIME_PERFORMANCE_LIMITS.midiExportMs.toFixed(1)} ms.`,
    },
    {
      name: 'WAV export',
      limit: DEFAULT_RUNTIME_PERFORMANCE_LIMITS.wavExportMs,
      apply: (value: number) => ({
        path: 'wavExportMs',
        set(
          snapshot: ReturnType<typeof createValidRuntimePerformanceSnapshot>
        ) {
          snapshot.metrics.wavExportMs = value;
        },
      }),
      expectedViolation: `WAV export ${(
        DEFAULT_RUNTIME_PERFORMANCE_LIMITS.wavExportMs + 1
      ).toFixed(
        1
      )} ms exceeded ${DEFAULT_RUNTIME_PERFORMANCE_LIMITS.wavExportMs.toFixed(1)} ms.`,
    },
  ] as const;

  for (const limitCase of limitCases) {
    it(`accepts ${limitCase.name} exactly at the configured limit`, () => {
      const snapshot = createValidRuntimePerformanceSnapshot();
      limitCase.apply(limitCase.limit).set(snapshot);
      snapshot.violations = collectRuntimePerformanceViolations(
        snapshot.metrics,
        snapshot.limits
      );

      expect(validateRuntimePerformanceSnapshot(snapshot).errors).toEqual([]);
      expect(snapshot.violations).toEqual([]);
    });

    it(`accepts ${limitCase.name} just below the configured limit`, () => {
      const snapshot = createValidRuntimePerformanceSnapshot();
      limitCase.apply(limitCase.limit - 0.1).set(snapshot);
      snapshot.violations = collectRuntimePerformanceViolations(
        snapshot.metrics,
        snapshot.limits
      );

      expect(validateRuntimePerformanceSnapshot(snapshot).errors).toEqual([]);
      expect(snapshot.violations).toEqual([]);
    });

    it(`requires a violation when ${limitCase.name} is just above the configured limit`, () => {
      const snapshot = createValidRuntimePerformanceSnapshot();
      limitCase.apply(limitCase.limit + 1).set(snapshot);
      snapshot.violations = collectRuntimePerformanceViolations(
        snapshot.metrics,
        snapshot.limits
      );

      expect(validateRuntimePerformanceSnapshot(snapshot).errors).toEqual([]);
      expect(snapshot.violations).toContain(limitCase.expectedViolation);
    });
  }
});
