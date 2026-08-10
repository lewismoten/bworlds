export const DEFAULT_RUNTIME_PERFORMANCE_LIMITS = {
  initialWorldGenerationMs: 4_000,
  visibleTileGenerationMs: 16,
  maximumFrameMs: 50,
  memoryAfterRegionChangeMb: 512,
  activeThreeObjectCount: 2_500,
  drawCalls: 1_200,
  audioNodeCount: 16,
  songGenerationMs: 750,
  midiExportMs: 1_500,
  wavExportMs: 2_000,
} as const;

export const DEFAULT_RUNTIME_PERFORMANCE_TRACKING_PREFERENCES = {
  enabled: true,
} as const;

export type RuntimePerformanceTrackingPreferences = {
  enabled: boolean;
};

export type RuntimePerformanceSnapshotTrigger =
  | 'startup'
  | 'region-change'
  | 'song-generated'
  | 'midi-export'
  | 'wav-export'
  | 'bundle-export';

export type RuntimePerformanceSnapshotSource = 'game' | 'music-debug';

export type RuntimePerformanceSnapshot = {
  schemaVersion: 1;
  createdAt: string;
  source: RuntimePerformanceSnapshotSource;
  trigger: RuntimePerformanceSnapshotTrigger;
  route: string;
  worldSeed: string | null;
  context:
    | {
        id: string;
        label?: string;
        depth?: number;
      }
    | null;
  limits: typeof DEFAULT_RUNTIME_PERFORMANCE_LIMITS;
  metrics: {
    initialWorldGenerationMs: number | null;
    visibleTileGeneration: {
      averageMs: number;
      maxMs: number;
      buildsPerSecond: number;
      pendingTileCount: number;
    } | null;
    maximumFrameMs: number | null;
    memoryAfterRegionChangeMb: number | null;
    activeThreeObjectCount: number | null;
    drawCalls: number | null;
    audioNodeCount: number | null;
    songGenerationMs: number | null;
    midiExportMs: number | null;
    wavExportMs: number | null;
  };
  violations: string[];
};

type RuntimePerformanceSnapshotBuildOptions = {
  createdAt?: Date;
  source: RuntimePerformanceSnapshotSource;
  trigger: RuntimePerformanceSnapshotTrigger;
  route: string;
  worldSeed?: string | null;
  context?: RuntimePerformanceSnapshot['context'];
  metrics?: Partial<RuntimePerformanceSnapshot['metrics']>;
  limits?: Partial<typeof DEFAULT_RUNTIME_PERFORMANCE_LIMITS>;
};

export function normalizeRuntimePerformanceTrackingPreferences(
  value:
    | { runtimePerformanceTrackingEnabled?: boolean }
    | boolean
    | null
    | undefined
): RuntimePerformanceTrackingPreferences {
  if (typeof value === 'boolean') {
    return { enabled: value };
  }
  if (typeof value?.runtimePerformanceTrackingEnabled === 'boolean') {
    return {
      enabled: value.runtimePerformanceTrackingEnabled,
    };
  }
  return {
    ...DEFAULT_RUNTIME_PERFORMANCE_TRACKING_PREFERENCES,
  };
}

export function buildRuntimePerformanceSnapshot(
  options: RuntimePerformanceSnapshotBuildOptions
): RuntimePerformanceSnapshot {
  const limits = {
    ...DEFAULT_RUNTIME_PERFORMANCE_LIMITS,
    ...(options.limits ?? {}),
  };
  const metrics = {
    initialWorldGenerationMs: null,
    visibleTileGeneration: null,
    maximumFrameMs: null,
    memoryAfterRegionChangeMb: null,
    activeThreeObjectCount: null,
    drawCalls: null,
    audioNodeCount: null,
    songGenerationMs: null,
    midiExportMs: null,
    wavExportMs: null,
    ...(options.metrics ?? {}),
  };

  return {
    schemaVersion: 1,
    createdAt: (options.createdAt ?? new Date()).toISOString(),
    source: options.source,
    trigger: options.trigger,
    route: options.route,
    worldSeed: options.worldSeed ?? null,
    context: options.context ?? null,
    limits,
    metrics,
    violations: collectRuntimePerformanceViolations(metrics, limits),
  };
}

function collectRuntimePerformanceViolations(
  metrics: RuntimePerformanceSnapshot['metrics'],
  limits: typeof DEFAULT_RUNTIME_PERFORMANCE_LIMITS
): string[] {
  const violations: string[] = [];

  if (
    typeof metrics.initialWorldGenerationMs === 'number' &&
    metrics.initialWorldGenerationMs > limits.initialWorldGenerationMs
  ) {
    violations.push(
      `Initial world generation ${metrics.initialWorldGenerationMs.toFixed(1)} ms exceeded ${limits.initialWorldGenerationMs.toFixed(1)} ms.`
    );
  }
  if (
    typeof metrics.visibleTileGeneration?.maxMs === 'number' &&
    metrics.visibleTileGeneration.maxMs > limits.visibleTileGenerationMs
  ) {
    violations.push(
      `Visible tile generation ${metrics.visibleTileGeneration.maxMs.toFixed(1)} ms exceeded ${limits.visibleTileGenerationMs.toFixed(1)} ms.`
    );
  }
  if (
    typeof metrics.maximumFrameMs === 'number' &&
    metrics.maximumFrameMs > limits.maximumFrameMs
  ) {
    violations.push(
      `Maximum frame time ${metrics.maximumFrameMs.toFixed(1)} ms exceeded ${limits.maximumFrameMs.toFixed(1)} ms.`
    );
  }
  if (
    typeof metrics.memoryAfterRegionChangeMb === 'number' &&
    metrics.memoryAfterRegionChangeMb > limits.memoryAfterRegionChangeMb
  ) {
    violations.push(
      `Memory after region change ${metrics.memoryAfterRegionChangeMb.toFixed(1)} MB exceeded ${limits.memoryAfterRegionChangeMb.toFixed(1)} MB.`
    );
  }
  if (
    typeof metrics.activeThreeObjectCount === 'number' &&
    metrics.activeThreeObjectCount > limits.activeThreeObjectCount
  ) {
    violations.push(
      `Active Three.js object count ${metrics.activeThreeObjectCount} exceeded ${limits.activeThreeObjectCount}.`
    );
  }
  if (
    typeof metrics.drawCalls === 'number' &&
    metrics.drawCalls > limits.drawCalls
  ) {
    violations.push(
      `Draw calls ${metrics.drawCalls} exceeded ${limits.drawCalls}.`
    );
  }
  if (
    typeof metrics.audioNodeCount === 'number' &&
    metrics.audioNodeCount > limits.audioNodeCount
  ) {
    violations.push(
      `Audio node count ${metrics.audioNodeCount} exceeded ${limits.audioNodeCount}.`
    );
  }
  if (
    typeof metrics.songGenerationMs === 'number' &&
    metrics.songGenerationMs > limits.songGenerationMs
  ) {
    violations.push(
      `Song generation ${metrics.songGenerationMs.toFixed(1)} ms exceeded ${limits.songGenerationMs.toFixed(1)} ms.`
    );
  }
  if (
    typeof metrics.midiExportMs === 'number' &&
    metrics.midiExportMs > limits.midiExportMs
  ) {
    violations.push(
      `MIDI export ${metrics.midiExportMs.toFixed(1)} ms exceeded ${limits.midiExportMs.toFixed(1)} ms.`
    );
  }
  if (
    typeof metrics.wavExportMs === 'number' &&
    metrics.wavExportMs > limits.wavExportMs
  ) {
    violations.push(
      `WAV export ${metrics.wavExportMs.toFixed(1)} ms exceeded ${limits.wavExportMs.toFixed(1)} ms.`
    );
  }

  return violations;
}

export async function postRuntimePerformanceSnapshot(
  snapshot: RuntimePerformanceSnapshot,
  options: {
    endpoint?: string;
    fetchImpl?: typeof fetch | null;
  } = {}
): Promise<boolean> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch ?? null;
  if (!fetchImpl) {
    return false;
  }

  try {
    const response = await fetchImpl(
      options.endpoint ?? '/api/runtime-performance-snapshots',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(snapshot),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}
