import {
  collectRuntimePerformanceViolations,
  DEFAULT_RUNTIME_PERFORMANCE_LIMITS,
  RUNTIME_PERFORMANCE_SNAPSHOT_SOURCES,
  RUNTIME_PERFORMANCE_SNAPSHOT_TRIGGERS,
  type RuntimePerformanceSnapshot,
} from './runtime-performance-tracking.ts';

export type RuntimePerformanceSnapshotValidationResult = {
  errors: string[];
};

export const NULLABLE_RUNTIME_PERFORMANCE_METRICS = [
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
] as const;

export const RUNTIME_PERFORMANCE_LIMIT_TO_METRIC_PATHS = {
  initialWorldGenerationMs: 'initialWorldGenerationMs',
  visibleTileGenerationAverageMs: 'visibleTileGeneration.averageMs',
  visibleTileGenerationMaxMs: 'visibleTileGeneration.maxMs',
  pendingTileCount: 'visibleTileGeneration.pendingTileCount',
  maximumFrameMs: 'maximumFrameMs',
  memoryAfterRegionChangeMb: 'memoryAfterRegionChangeMb',
  activeThreeObjectCount: 'activeThreeObjectCount',
  drawCalls: 'drawCalls',
  audioNodeCount: 'audioNodeCount',
  songGenerationMs: 'songGenerationMs',
  midiExportMs: 'midiExportMs',
  wavExportMs: 'wavExportMs',
} as const;

export const REQUIRED_RUNTIME_PERFORMANCE_METRICS_BY_TRIGGER = {
  startup: [
    'initialWorldGenerationMs',
    'visibleTileGeneration',
    'maximumFrameMs',
    'activeThreeObjectCount',
    'drawCalls',
    'audioNodeCount',
  ],
  'region-change': [
    'memoryAfterRegionChangeMb',
    'visibleTileGeneration',
    'maximumFrameMs',
    'activeThreeObjectCount',
    'drawCalls',
    'audioNodeCount',
  ],
  'runtime-issue': [
    'visibleTileGeneration',
    'maximumFrameMs',
    'activeThreeObjectCount',
    'drawCalls',
    'audioNodeCount',
  ],
  'song-generated': ['songGenerationMs'],
  'midi-export': ['midiExportMs'],
  'wav-export': ['wavExportMs'],
  'bundle-export': ['midiExportMs', 'wavExportMs'],
} as const satisfies Record<
  RuntimePerformanceSnapshot['trigger'],
  readonly string[]
>;

export function validateRuntimePerformanceSnapshot(
  snapshot: RuntimePerformanceSnapshot
): RuntimePerformanceSnapshotValidationResult {
  const errors: string[] = [];

  if (snapshot.schemaVersion !== 1) {
    errors.push(
      `Unsupported runtime performance snapshot schema version ${String(snapshot.schemaVersion)}.`
    );
  }
  if (!isIsoTimestamp(snapshot.createdAt)) {
    errors.push(
      'Runtime performance snapshot createdAt must be a valid ISO-8601 timestamp.'
    );
  }
  if (!RUNTIME_PERFORMANCE_SNAPSHOT_SOURCES.includes(snapshot.source)) {
    errors.push(
      `Runtime performance snapshot source must be one of ${RUNTIME_PERFORMANCE_SNAPSHOT_SOURCES.join(', ')}.`
    );
  }
  if (!RUNTIME_PERFORMANCE_SNAPSHOT_TRIGGERS.includes(snapshot.trigger)) {
    errors.push(
      `Runtime performance snapshot trigger must be one of ${RUNTIME_PERFORMANCE_SNAPSHOT_TRIGGERS.join(', ')}.`
    );
  }
  if (
    typeof snapshot.route !== 'string' ||
    snapshot.route.trim().length === 0
  ) {
    errors.push(
      'Runtime performance snapshot route must be a non-empty string.'
    );
  }
  if (
    typeof snapshot.worldSeed !== 'string' ||
    snapshot.worldSeed.trim().length === 0
  ) {
    errors.push(
      'Runtime performance snapshot worldSeed must be a non-empty string.'
    );
  }
  if (!isValidRuntimePerformanceContext(snapshot.context)) {
    errors.push(
      'Runtime performance snapshot context must be null or include a non-empty id, optional non-empty label, and finite depth when present.'
    );
  }

  for (const [limitName, limitValue] of Object.entries(snapshot.limits)) {
    if (!isFiniteNonNegativeNumber(limitValue)) {
      errors.push(
        `Runtime performance snapshot limit ${limitName} must be a finite non-negative number.`
      );
    }
  }

  validateMetricValue(
    errors,
    'initialWorldGenerationMs',
    snapshot.metrics.initialWorldGenerationMs
  );
  validateMetricValue(
    errors,
    'maximumFrameMs',
    snapshot.metrics.maximumFrameMs
  );
  validateMetricValue(
    errors,
    'memoryAfterRegionChangeMb',
    snapshot.metrics.memoryAfterRegionChangeMb
  );
  validateMetricValue(
    errors,
    'activeThreeObjectCount',
    snapshot.metrics.activeThreeObjectCount
  );
  validateMetricValue(errors, 'drawCalls', snapshot.metrics.drawCalls);
  validateMetricValue(
    errors,
    'audioNodeCount',
    snapshot.metrics.audioNodeCount
  );
  validateMetricValue(
    errors,
    'songGenerationMs',
    snapshot.metrics.songGenerationMs
  );
  validateMetricValue(errors, 'midiExportMs', snapshot.metrics.midiExportMs);
  validateMetricValue(errors, 'wavExportMs', snapshot.metrics.wavExportMs);

  const visibleTileGeneration = snapshot.metrics.visibleTileGeneration;
  if (visibleTileGeneration !== null) {
    if (
      typeof visibleTileGeneration !== 'object' ||
      visibleTileGeneration === null
    ) {
      errors.push(
        'Runtime performance snapshot visibleTileGeneration must be null or an object.'
      );
    } else {
      validateMetricValue(
        errors,
        'visibleTileGeneration.averageMs',
        visibleTileGeneration.averageMs
      );
      validateMetricValue(
        errors,
        'visibleTileGeneration.maxMs',
        visibleTileGeneration.maxMs
      );
      validateMetricValue(
        errors,
        'visibleTileGeneration.buildsPerSecond',
        visibleTileGeneration.buildsPerSecond
      );
      validateMetricValue(
        errors,
        'visibleTileGeneration.pendingTileCount',
        visibleTileGeneration.pendingTileCount
      );
    }
  }

  if (!Array.isArray(snapshot.violations)) {
    errors.push('Runtime performance snapshot violations must be an array.');
  } else {
    const invalidViolation = snapshot.violations.find(
      (violation) =>
        typeof violation !== 'string' || violation.trim().length === 0
    );
    if (invalidViolation !== undefined) {
      errors.push(
        'Runtime performance snapshot violations must contain only non-empty strings.'
      );
    }
  }

  const requiredMetricPaths =
    REQUIRED_RUNTIME_PERFORMANCE_METRICS_BY_TRIGGER[snapshot.trigger] ?? [];
  for (const metricPath of requiredMetricPaths) {
    const value = getRuntimePerformanceMetricPathValue(snapshot, metricPath);
    if (value === null || value === undefined) {
      errors.push(
        `Runtime performance snapshot trigger ${snapshot.trigger} requires metric ${metricPath}.`
      );
    }
  }

  const limitNames = Object.keys(snapshot.limits).sort();
  const alignedLimitNames = Object.keys(
    RUNTIME_PERFORMANCE_LIMIT_TO_METRIC_PATHS
  ).sort();
  if (
    limitNames.length !== alignedLimitNames.length ||
    limitNames.some(
      (limitName, index) => limitName !== alignedLimitNames[index]
    )
  ) {
    errors.push(
      'Runtime performance snapshot limits must stay aligned with the supported metric fields.'
    );
  }

  for (const [limitName, metricPath] of Object.entries(
    RUNTIME_PERFORMANCE_LIMIT_TO_METRIC_PATHS
  )) {
    const value = getRuntimePerformanceMetricPathValue(snapshot, metricPath);
    if (value === undefined) {
      errors.push(
        `Runtime performance snapshot limit ${limitName} is not aligned with metric ${metricPath}.`
      );
    }
  }

  if (errors.length === 0) {
    const expectedViolations = collectRuntimePerformanceViolations(
      snapshot.metrics,
      snapshot.limits
    );
    const actualViolations = Array.isArray(snapshot.violations)
      ? snapshot.violations
      : [];
    for (const expectedViolation of expectedViolations) {
      if (!actualViolations.includes(expectedViolation)) {
        errors.push(
          `Runtime performance snapshot is missing expected violation: ${expectedViolation}`
        );
      }
    }
    for (const actualViolation of actualViolations) {
      if (!expectedViolations.includes(actualViolation)) {
        errors.push(
          `Runtime performance snapshot contains unexpected violation: ${actualViolation}`
        );
      }
    }
  }

  return {
    errors,
  };
}

function getRuntimePerformanceMetricPathValue(
  snapshot: RuntimePerformanceSnapshot,
  metricPath: string
): unknown {
  return metricPath.split('.').reduce<unknown>((currentValue, segment) => {
    if (currentValue === null) {
      return null;
    }
    if (currentValue === undefined || typeof currentValue !== 'object') {
      return undefined;
    }
    return (currentValue as Record<string, unknown>)[segment];
  }, snapshot.metrics);
}

function validateMetricValue(
  errors: string[],
  metricName: string,
  value: number | null
): void {
  if (value === null) {
    return;
  }
  if (!isFiniteNonNegativeNumber(value)) {
    errors.push(
      `Runtime performance snapshot metric ${metricName} must be null or a finite non-negative number.`
    );
  }
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
}

function isValidRuntimePerformanceContext(
  value: RuntimePerformanceSnapshot['context']
): boolean {
  if (value === null) {
    return true;
  }
  if (typeof value !== 'object') {
    return false;
  }
  if (typeof value.id !== 'string' || value.id.trim().length === 0) {
    return false;
  }
  if (
    value.label !== undefined &&
    (typeof value.label !== 'string' || value.label.trim().length === 0)
  ) {
    return false;
  }
  if (
    value.depth !== undefined &&
    !(typeof value.depth === 'number' && Number.isFinite(value.depth))
  ) {
    return false;
  }
  return true;
}

export function createValidRuntimePerformanceSnapshot(): RuntimePerformanceSnapshot {
  return {
    schemaVersion: 1,
    createdAt: '2026-08-12T00:00:00.000Z',
    source: RUNTIME_PERFORMANCE_SNAPSHOT_SOURCES[0],
    trigger: RUNTIME_PERFORMANCE_SNAPSHOT_TRIGGERS[0],
    route: '/',
    worldSeed: 'alpha',
    context: {
      id: 'overworld',
      label: 'Overworld',
      depth: 0,
    },
    limits: {
      ...DEFAULT_RUNTIME_PERFORMANCE_LIMITS,
    },
    metrics: {
      initialWorldGenerationMs: 1_000,
      visibleTileGeneration: {
        averageMs: 4,
        maxMs: 8,
        buildsPerSecond: 12,
        pendingTileCount: 0,
      },
      maximumFrameMs: 16.7,
      memoryAfterRegionChangeMb: 256,
      activeThreeObjectCount: 1_200,
      drawCalls: 500,
      audioNodeCount: 4,
      songGenerationMs: 250,
      midiExportMs: 400,
      wavExportMs: 800,
    },
    violations: [],
  };
}
