import type { DebugSnapshot } from './debug-panel.ts';
import {
  buildRuntimePerformanceSnapshot,
  buildRuntimePerformanceSnapshotMetricsFromDebugSnapshot,
  type RuntimePerformanceSnapshot,
  type RuntimePerformanceSnapshotSource,
} from './runtime-performance-tracking.ts';

export const RUNTIME_PERFORMANCE_ISSUE_API_PATH =
  '/api/runtime-performance-issues';

const DEFAULT_RUNTIME_PERFORMANCE_ISSUE_REPORT_INTERVAL_MS = 5_000;

export type RuntimePerformanceIssueReport = {
  schemaVersion: 1;
  createdAt: string;
  source: RuntimePerformanceSnapshotSource;
  route: string;
  worldSeed: string | null;
  context: RuntimePerformanceSnapshot['context'];
  issueHash: string;
  summary: string;
  reasons: string[];
  performanceSnapshot: RuntimePerformanceSnapshot;
  renderState: {
    performanceTier: DebugSnapshot['performanceTier'];
    renderQualityLevel: string;
    renderQualityLimiters: string[];
    targetFps: 60 | 30;
    visibilityRadius: number;
    pendingTileCount: number;
  };
  pluginHotspots: {
    materials: string | null;
    drawCalls: string | null;
    objects: string | null;
    meshes: string | null;
    lodSwaps: string | null;
    fallbackBoxes: string | null;
    rejectedModels: string | null;
    staticMatrixUpdates: string | null;
  };
  currentTile: {
    plugin: string | null;
    requestedDetailLevel: string | null;
    renderedDetailLevel: string | null;
    cachedDetailLevel: string | null;
    fallbackReason: string | null;
    hasVisibleModel: boolean;
  };
  resourceWarnings: string[];
};

type RuntimePerformanceIssueBuildOptions = {
  createdAt?: Date;
  source: RuntimePerformanceSnapshotSource;
  route: string;
  worldSeed?: string | null;
  context?: RuntimePerformanceSnapshot['context'];
  debugSnapshot: DebugSnapshot;
};

export function buildRuntimePerformanceIssueReport(
  options: RuntimePerformanceIssueBuildOptions
): RuntimePerformanceIssueReport | null {
  const performanceSnapshot = buildRuntimePerformanceSnapshot({
    createdAt: options.createdAt,
    source: options.source,
    trigger: 'runtime-issue',
    route: options.route,
    worldSeed: options.worldSeed,
    context: options.context,
    metrics: buildRuntimePerformanceSnapshotMetricsFromDebugSnapshot(
      options.debugSnapshot
    ),
  });
  const reasons = collectRuntimePerformanceIssueReasons(
    options.debugSnapshot,
    performanceSnapshot
  );
  if (reasons.length === 0) {
    return null;
  }

  return {
    schemaVersion: 1,
    createdAt: (options.createdAt ?? new Date()).toISOString(),
    source: options.source,
    route: options.route,
    worldSeed: options.worldSeed ?? null,
    context: options.context ?? null,
    issueHash: createRuntimePerformanceIssueHash(
      [
        options.route,
        options.context?.id ?? '',
        options.debugSnapshot.performanceTier,
        options.debugSnapshot.renderQualityLevel,
        reasons.join('|'),
        options.debugSnapshot.currentTilePlugin ?? '',
      ].join('\n')
    ),
    summary: reasons[0],
    reasons,
    performanceSnapshot,
    renderState: {
      performanceTier: options.debugSnapshot.performanceTier,
      renderQualityLevel: options.debugSnapshot.renderQualityLevel,
      renderQualityLimiters: splitRuntimePerformanceLimiters(
        options.debugSnapshot.renderQualityLimiters
      ),
      targetFps: options.debugSnapshot.targetFps,
      visibilityRadius: options.debugSnapshot.visibilityRadius,
      pendingTileCount: options.debugSnapshot.pendingTileCount,
    },
    pluginHotspots: {
      materials: options.debugSnapshot.materialTopPluginLabel?.trim() || null,
      drawCalls: options.debugSnapshot.drawCallTopPluginLabel?.trim() || null,
      objects: options.debugSnapshot.objectTopPluginLabel?.trim() || null,
      meshes: options.debugSnapshot.meshTopPluginLabel?.trim() || null,
      lodSwaps:
        options.debugSnapshot.lodReplacementTopPluginLabel?.trim() || null,
      fallbackBoxes:
        options.debugSnapshot.fallbackBoxTopPluginLabel?.trim() || null,
      rejectedModels:
        options.debugSnapshot.tileModelBudgetViolationTopPluginLabel?.trim() ||
        null,
      staticMatrixUpdates:
        options.debugSnapshot.staticMatrixUpdateTopPluginLabel?.trim() || null,
    },
    currentTile: {
      plugin: options.debugSnapshot.currentTilePlugin?.trim() || null,
      requestedDetailLevel:
        options.debugSnapshot.currentTileRequestedDetailLevel?.trim() || null,
      renderedDetailLevel:
        options.debugSnapshot.currentTileRenderedDetailLevel?.trim() || null,
      cachedDetailLevel:
        options.debugSnapshot.currentTileCachedDetailLevel?.trim() || null,
      fallbackReason:
        options.debugSnapshot.currentTileFallbackReason?.trim() || null,
      hasVisibleModel:
        options.debugSnapshot.currentTileHasVisibleModel ?? false,
    },
    resourceWarnings: [...options.debugSnapshot.resourceWarnings],
  };
}

function collectRuntimePerformanceIssueReasons(
  debugSnapshot: DebugSnapshot,
  performanceSnapshot: RuntimePerformanceSnapshot
): string[] {
  const reasons = [...performanceSnapshot.violations];

  if (debugSnapshot.performanceTier !== 'healthy') {
    reasons.push(
      `Performance tier is ${debugSnapshot.performanceTier} at ${debugSnapshot.worstRecentFrameMs.toFixed(1)} ms worst recent frame time.`
    );
  }

  const limiters = splitRuntimePerformanceLimiters(
    debugSnapshot.renderQualityLimiters
  );
  if (limiters.length > 0) {
    reasons.push(`Graphics quality is constrained by ${limiters.join(', ')}.`);
  }

  if ((debugSnapshot.tileModelBudgetViolationsPerSecond ?? 0) > 0) {
    reasons.push(
      debugSnapshot.tileModelBudgetViolationSummary?.trim() ||
        `Render budget rejected ${debugSnapshot.tileModelBudgetViolationsPerSecond?.toFixed(1) ?? '0.0'} plugin model(s) per second.`
    );
  }

  if ((debugSnapshot.fallbackBoxesPerSecond ?? 0) > 0) {
    reasons.push(
      debugSnapshot.fallbackBoxSummary?.trim() ||
        `Fallback boxes are appearing ${debugSnapshot.fallbackBoxesPerSecond?.toFixed(1) ?? '0.0'} time(s) per second.`
    );
  }

  if (debugSnapshot.lastLodFailureReason?.trim()) {
    reasons.push(`Latest LOD failure: ${debugSnapshot.lastLodFailureReason}.`);
  }
  if (debugSnapshot.lastFallbackReason?.trim()) {
    reasons.push(
      `Latest fallback reason: ${debugSnapshot.lastFallbackReason}.`
    );
  }

  reasons.push(...debugSnapshot.resourceWarnings);
  return [...new Set(reasons.map((reason) => reason.trim()).filter(Boolean))];
}

function splitRuntimePerformanceLimiters(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function createRuntimePerformanceIssueHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export async function postRuntimePerformanceIssueReport(
  issue: RuntimePerformanceIssueReport,
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
      options.endpoint ?? RUNTIME_PERFORMANCE_ISSUE_API_PATH,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(issue),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

export function createRuntimePerformanceIssueReporter(
  options: {
    minimumIntervalMs?: number;
    nowMs?: () => number;
    postIssue?: (
      issue: RuntimePerformanceIssueReport
    ) => Promise<boolean> | boolean;
  } = {}
): (issue: RuntimePerformanceIssueReport | null) => Promise<boolean> {
  const minimumIntervalMs =
    options.minimumIntervalMs ??
    DEFAULT_RUNTIME_PERFORMANCE_ISSUE_REPORT_INTERVAL_MS;
  const nowMs =
    options.nowMs ??
    (() =>
      typeof performance !== 'undefined' ? performance.now() : Date.now());
  const postIssue =
    options.postIssue ??
    ((issue: RuntimePerformanceIssueReport) =>
      postRuntimePerformanceIssueReport(issue));
  const lastReportedAtByHash = new Map<string, number>();

  return async (issue: RuntimePerformanceIssueReport | null) => {
    if (!issue) {
      return false;
    }

    const previousReportedAt = lastReportedAtByHash.get(issue.issueHash);
    const currentNowMs = nowMs();
    if (
      typeof previousReportedAt === 'number' &&
      currentNowMs - previousReportedAt < minimumIntervalMs
    ) {
      return false;
    }

    const posted = await postIssue(issue);
    if (posted) {
      lastReportedAtByHash.set(issue.issueHash, currentNowMs);
    }
    return posted;
  };
}
