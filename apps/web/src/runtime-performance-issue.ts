import type { DebugSnapshot } from './debug-panel.ts';
import {
  DEFAULT_VISIBILITY_RADIUS,
  getRenderBudgetCaps,
  MIN_VISIBILITY_RADIUS,
  REDUCED_VISIBILITY_RADIUS,
} from './render-budget.ts';
import {
  buildRuntimePerformanceSnapshot,
  buildRuntimePerformanceSnapshotMetricsFromDebugSnapshot,
  type RuntimePerformanceSnapshot,
  type RuntimePerformanceSnapshotSource,
} from './runtime-performance-tracking.ts';

export const RUNTIME_PERFORMANCE_ISSUE_API_PATH =
  '/api/runtime-performance-issues';

const DEFAULT_RUNTIME_PERFORMANCE_ISSUE_REPORT_INTERVAL_MS = 5_000;
const ACTIONABLE_VISIBILITY_RADIUS_EPSILON = 0.5;

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
    reducedQualityDurationSec: number;
    renderQualityLimiters: string[];
    renderQualityLimiterDetails: string[];
    visibilityRadiusDetail: string | null;
    latestQualityChangeLimiter: string | null;
    latestQualityChangeLimiterDetail: string | null;
    latestQualityChangeSummary: string | null;
    targetFps: 60 | 30;
    visibilityRadius: number;
    pendingTileCount: number;
  };
  pluginHotspots: {
    instancedMeshes: string | null;
    renderedInstances: string | null;
    instancingWarnings: string | null;
    materials: string | null;
    drawCalls: string | null;
    objects: string | null;
    meshes: string | null;
    lodSwaps: string | null;
    schedulerStarvations: string | null;
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
  const renderQualityLimiterDetails = describeRuntimePerformanceLimiterDetails(
    options.debugSnapshot
  );
  if (reasons.length === 0) {
    return null;
  }

  const summary = selectRuntimePerformanceIssueSummary(
    reasons,
    renderQualityLimiterDetails
  );

  return {
    schemaVersion: 1,
    createdAt: (options.createdAt ?? new Date()).toISOString(),
    source: options.source,
    route: options.route,
    worldSeed: options.worldSeed ?? null,
    context: options.context ?? null,
    issueHash: createRuntimePerformanceIssueHash(summary),
    summary,
    reasons,
    performanceSnapshot,
    renderState: {
      performanceTier: options.debugSnapshot.performanceTier,
      renderQualityLevel: options.debugSnapshot.renderQualityLevel,
      reducedQualityDurationSec:
        options.debugSnapshot.reducedQualityDurationSec ?? 0,
      renderQualityLimiters: splitRuntimePerformanceLimiters(
        options.debugSnapshot.renderQualityLimiters
      ),
      renderQualityLimiterDetails,
      visibilityRadiusDetail: describeVisibilityRadiusReduction(
        options.debugSnapshot
      ),
      latestQualityChangeLimiter:
        options.debugSnapshot.latestQualityChangeLimiter?.trim() || null,
      latestQualityChangeLimiterDetail: describeLatestQualityChangeLimiter(
        options.debugSnapshot
      ),
      latestQualityChangeSummary:
        options.debugSnapshot.latestQualityChangeSummary?.trim() || null,
      targetFps: options.debugSnapshot.targetFps,
      visibilityRadius: options.debugSnapshot.visibilityRadius,
      pendingTileCount: options.debugSnapshot.pendingTileCount,
    },
    pluginHotspots: {
      instancedMeshes:
        options.debugSnapshot.instancedMeshTopPluginLabel?.trim() || null,
      renderedInstances:
        options.debugSnapshot.renderedInstanceTopPluginLabel?.trim() || null,
      instancingWarnings:
        options.debugSnapshot.instancingWarningTopPluginLabel?.trim() || null,
      materials:
        options.debugSnapshot.sceneUniqueMaterialTopPluginLabel?.trim() || null,
      drawCalls: options.debugSnapshot.drawCallTopPluginLabel?.trim() || null,
      objects: options.debugSnapshot.objectTopPluginLabel?.trim() || null,
      meshes: options.debugSnapshot.meshTopPluginLabel?.trim() || null,
      lodSwaps:
        options.debugSnapshot.lodReplacementTopPluginLabel?.trim() || null,
      schedulerStarvations:
        options.debugSnapshot.schedulerStarvationTopPluginLabel?.trim() || null,
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
  const limiterDetails =
    describeRuntimePerformanceLimiterDetails(debugSnapshot);
  const hasReportableReducedQualityState = hasReportableRenderQualityReduction(
    debugSnapshot,
    limiterDetails
  );

  if (debugSnapshot.performanceTier !== 'healthy') {
    reasons.push(
      `Performance tier is ${debugSnapshot.performanceTier} at ${debugSnapshot.worstRecentFrameMs.toFixed(1)} ms worst recent frame time.`
    );
  }

  const reducedQualityDurationDetail = hasReportableReducedQualityState
    ? describeReducedQualityDuration(debugSnapshot)
    : null;
  if (reducedQualityDurationDetail) {
    reasons.push(reducedQualityDurationDetail);
  }

  const limiters = splitRuntimePerformanceLimiters(
    debugSnapshot.renderQualityLimiters
  );
  if (limiters.length > 0 && hasReportableReducedQualityState) {
    reasons.push(
      hasActionableLimiterDetails(limiterDetails)
        ? `Graphics quality is constrained by ${limiterDetails.join('; ')}.`
        : `Graphics quality is constrained by ${limiters.join(', ')}.`
    );
  }
  const visibilityRadiusDetail = hasReportableReducedQualityState
    ? describeVisibilityRadiusReduction(debugSnapshot)
    : null;
  if (visibilityRadiusDetail) {
    reasons.push(visibilityRadiusDetail);
  }

  const latestQualityChangeLimiterDetail =
    reasons.length > 0
      ? describeLatestQualityChangeLimiter(debugSnapshot)
      : null;
  if (latestQualityChangeLimiterDetail) {
    reasons.push(
      `Latest quality change was triggered by ${latestQualityChangeLimiterDetail}.`
    );
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

  if ((debugSnapshot.schedulerStarvationEventsPerSecond ?? 0) > 0) {
    reasons.push(
      debugSnapshot.schedulerStarvationSummary?.trim() ||
        `Pending world-build scheduler starvation is occurring ${debugSnapshot.schedulerStarvationEventsPerSecond?.toFixed(1) ?? '0.0'} time(s) per second.`
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
  if (reasons.length > 0) {
    reasons.push(...describeRuntimePerformanceHotspots(debugSnapshot));
  }
  return [...new Set(reasons.map((reason) => reason.trim()).filter(Boolean))];
}

function describeRuntimePerformanceHotspots(
  debugSnapshot: DebugSnapshot
): string[] {
  return [
    formatRuntimePerformanceHotspot(
      'Top draw-call plugins',
      debugSnapshot.drawCallSummary
    ),
    formatRuntimePerformanceHotspot(
      'Top object plugins',
      debugSnapshot.objectSummary
    ),
    formatRuntimePerformanceHotspot(
      'Top mesh plugins',
      debugSnapshot.meshSummary
    ),
    formatRuntimePerformanceHotspot(
      'Top instanced-mesh plugins',
      debugSnapshot.instancedMeshSummary
    ),
    formatRuntimePerformanceHotspot(
      'Top rendered-instance plugins',
      debugSnapshot.renderedInstanceSummary
    ),
    formatRuntimePerformanceHotspot(
      'Top instancing-warning plugins',
      debugSnapshot.instancingWarningSummary
    ),
    formatRuntimePerformanceHotspot(
      'Top per-tile material plugins',
      debugSnapshot.materialSummary
    ),
    formatRuntimePerformanceHotspot(
      'Top scene-unique-material plugins',
      debugSnapshot.sceneUniqueMaterialSummary
    ),
    formatRuntimePerformanceHotspot(
      'Top cloned-material plugins',
      debugSnapshot.clonedMaterialSummary
    ),
    formatRuntimePerformanceHotspot(
      'Top LOD-swap plugins',
      debugSnapshot.lodReplacementSummary
    ),
    formatRuntimePerformanceHotspot(
      'Top fallback-model plugins',
      debugSnapshot.fallbackBoxSummary
    ),
    formatRuntimePerformanceHotspot(
      'Top scheduler-starvation plugins',
      debugSnapshot.schedulerStarvationSummary
    ),
    formatRuntimePerformanceHotspot(
      'Top static-matrix-update plugins',
      debugSnapshot.staticMatrixUpdateSummary
    ),
  ].filter((reason): reason is string => reason !== null);
}

function formatRuntimePerformanceHotspot(
  label: string,
  summary: string | undefined
): string | null {
  const trimmed = summary?.trim();
  if (!trimmed) {
    return null;
  }
  const normalized = trimmed.replace(/[.!?]+$/u, '');
  return `${label}: ${normalized}.`;
}

function splitRuntimePerformanceLimiters(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function describeRuntimePerformanceLimiterDetails(
  debugSnapshot: DebugSnapshot
): string[] {
  const caps = getRenderBudgetCaps({
    targetFps: debugSnapshot.targetFps,
  });
  return splitRuntimePerformanceLimiters(debugSnapshot.renderQualityLimiters)
    .map((limiter) =>
      describeRuntimePerformanceLimiter(limiter, debugSnapshot, caps)
    )
    .filter((detail): detail is string => detail !== null);
}

function describeLatestQualityChangeLimiter(
  debugSnapshot: DebugSnapshot
): string | null {
  const limiter = debugSnapshot.latestQualityChangeLimiter?.trim();
  if (!limiter) {
    return null;
  }
  const caps = getRenderBudgetCaps({
    targetFps: debugSnapshot.targetFps,
  });
  return describeRuntimePerformanceLimiter(limiter, debugSnapshot, caps);
}

function describeRuntimePerformanceLimiter(
  limiter: string,
  debugSnapshot: DebugSnapshot,
  caps: ReturnType<typeof getRenderBudgetCaps>
): string | null {
  switch (limiter) {
    case 'Target FPS reduced to 30':
      return 'Target FPS reduced to 30 from 60';
    case 'Weather visibility reduced draw distance':
      if (
        !hasActionableVisibilityRadiusReduction(debugSnapshot.visibilityRadius)
      ) {
        return null;
      }
      return `Weather visibility capped draw distance at ${debugSnapshot.visibilityRadius} (full ${DEFAULT_VISIBILITY_RADIUS}, weather cap ${Math.floor(debugSnapshot.weatherVisibilityRadiusCap ?? debugSnapshot.visibilityRadius)})`;
    case 'Optional effects minimized after sustained frame stalls':
      return `Optional effects minimized after sustained frame stalls (${debugSnapshot.worstRecentFrameMs.toFixed(1)} ms worst recent frame time)`;
    case 'Scene draw calls exceeded the hard cap':
      return `${limiterValueLabel('Scene draw calls', debugSnapshot.drawCalls, caps.drawCalls.hard, 'hard cap')}`;
    case 'Scene draw calls exceeded the soft cap':
      return `${limiterValueLabel('Scene draw calls', debugSnapshot.drawCalls, caps.drawCalls.soft, 'soft cap')}`;
    case 'Chunk draw calls exceeded the hard cap':
      return limiterValueLabel(
        'Chunk draw calls',
        debugSnapshot.maxChunkDrawCalls,
        caps.chunkDrawCalls.hard,
        'hard cap'
      );
    case 'Chunk draw calls exceeded the soft cap':
      return limiterValueLabel(
        'Chunk draw calls',
        debugSnapshot.maxChunkDrawCalls,
        caps.chunkDrawCalls.soft,
        'soft cap'
      );
    case 'Chunk objects exceeded the hard cap':
      return limiterValueLabel(
        'Chunk objects',
        debugSnapshot.maxChunkObjectCount,
        caps.chunkObjects.hard,
        'hard cap'
      );
    case 'Chunk objects exceeded the soft cap':
      return limiterValueLabel(
        'Chunk objects',
        debugSnapshot.maxChunkObjectCount,
        caps.chunkObjects.soft,
        'soft cap'
      );
    case 'Chunk meshes exceeded the hard cap':
      return limiterValueLabel(
        'Chunk meshes',
        debugSnapshot.maxChunkMeshes,
        caps.chunkMeshes.hard,
        'hard cap'
      );
    case 'Chunk meshes exceeded the soft cap':
      return limiterValueLabel(
        'Chunk meshes',
        debugSnapshot.maxChunkMeshes,
        caps.chunkMeshes.soft,
        'soft cap'
      );
    case 'Chunk triangles exceeded the hard cap':
      return limiterValueLabel(
        'Chunk triangles',
        debugSnapshot.maxChunkTriangleCount,
        caps.chunkTriangles.hard,
        'hard cap'
      );
    case 'Chunk triangles exceeded the soft cap':
      return limiterValueLabel(
        'Chunk triangles',
        debugSnapshot.maxChunkTriangleCount,
        caps.chunkTriangles.soft,
        'soft cap'
      );
    case 'Active lights exceeded the hard cap':
      return limiterValueLabel(
        'Active lights',
        debugSnapshot.lightCount,
        caps.lights.hard,
        'hard cap'
      );
    case 'Active lights exceeded the soft cap':
      return limiterValueLabel(
        'Active lights',
        debugSnapshot.lightCount,
        caps.lights.soft,
        'soft cap'
      );
    case 'Shadow lights exceeded the hard cap':
      return limiterValueLabel(
        'Shadow lights',
        debugSnapshot.shadowLightCount,
        caps.shadowLights.hard,
        'hard cap'
      );
    case 'Shadow lights exceeded the soft cap':
      return limiterValueLabel(
        'Shadow lights',
        debugSnapshot.shadowLightCount,
        caps.shadowLights.soft,
        'soft cap'
      );
    case 'Active textures exceeded the hard cap':
      return limiterValueLabel(
        'Active textures',
        debugSnapshot.textureCount,
        caps.textures.hard,
        'hard cap'
      );
    case 'Active textures exceeded the soft cap':
      return limiterValueLabel(
        'Active textures',
        debugSnapshot.textureCount,
        caps.textures.soft,
        'soft cap'
      );
    case 'Estimated GPU memory exceeded the hard cap':
      return limiterByteLabel(
        'Estimated GPU memory',
        debugSnapshot.estimatedGpuMemoryBytes,
        caps.estimatedGpuMemoryBytes.hard,
        'hard cap'
      );
    case 'Estimated GPU memory exceeded the soft cap':
      return limiterByteLabel(
        'Estimated GPU memory',
        debugSnapshot.estimatedGpuMemoryBytes,
        caps.estimatedGpuMemoryBytes.soft,
        'soft cap'
      );
    case 'Scene materials exceeded the hard cap':
      return limiterValueLabel(
        'Scene materials',
        debugSnapshot.materialCount,
        caps.materials.hard,
        'hard cap'
      );
    case 'Scene materials exceeded the soft cap':
      return limiterValueLabel(
        'Scene materials',
        debugSnapshot.materialCount,
        caps.materials.soft,
        'soft cap'
      );
    case 'Visible objects exceeded the hard cap':
      return limiterValueLabel(
        'Visible objects',
        debugSnapshot.visibleObjectCount,
        caps.visibleObjects.hard,
        'hard cap'
      );
    case 'Visible objects exceeded the soft cap':
      return limiterValueLabel(
        'Visible objects',
        debugSnapshot.visibleObjectCount,
        caps.visibleObjects.soft,
        'soft cap'
      );
    case 'Visible triangles exceeded the hard cap':
      return limiterValueLabel(
        'Visible triangles',
        debugSnapshot.visibleTriangleCount,
        caps.visibleTriangles.hard,
        'hard cap'
      );
    case 'Visible triangles exceeded the soft cap':
      return limiterValueLabel(
        'Visible triangles',
        debugSnapshot.visibleTriangleCount,
        caps.visibleTriangles.soft,
        'soft cap'
      );
    case 'Visible vertices exceeded the hard cap':
      return limiterValueLabel(
        'Visible vertices',
        debugSnapshot.visibleVertexCount,
        caps.visibleVertices.hard,
        'hard cap'
      );
    case 'Visible vertices exceeded the soft cap':
      return limiterValueLabel(
        'Visible vertices',
        debugSnapshot.visibleVertexCount,
        caps.visibleVertices.soft,
        'soft cap'
      );
    case 'Visible meshes exceeded the hard cap':
      return limiterValueLabel(
        'Visible meshes',
        debugSnapshot.visibleMeshCount,
        caps.visibleMeshes.hard,
        'hard cap'
      );
    case 'Visible meshes exceeded the soft cap':
      return limiterValueLabel(
        'Visible meshes',
        debugSnapshot.visibleMeshCount,
        caps.visibleMeshes.soft,
        'soft cap'
      );
    case 'Critical frame pressure':
      return limiterMsLabel(
        'Smoothed frame time',
        debugSnapshot.frameMs,
        caps.frameMs.hard,
        'critical cap'
      );
    case 'High frame pressure':
      return limiterMsLabel(
        'Smoothed frame time',
        debugSnapshot.frameMs,
        caps.frameMs.soft,
        'soft cap'
      );
    default: {
      if (limiter.startsWith('Visibility radius reduced to ')) {
        if (
          !hasActionableVisibilityRadiusReduction(
            debugSnapshot.visibilityRadius
          )
        ) {
          return null;
        }
        return `Visibility radius reduced to ${debugSnapshot.visibilityRadius} (full ${DEFAULT_VISIBILITY_RADIUS}, reduced ${REDUCED_VISIBILITY_RADIUS}, minimum ${MIN_VISIBILITY_RADIUS})`;
      }
      return limiter;
    }
  }
}

function describeVisibilityRadiusReduction(
  debugSnapshot: DebugSnapshot
): string | null {
  if (debugSnapshot.renderQualityLevel.trim().toLowerCase() === 'full') {
    return null;
  }
  if (debugSnapshot.visibilityRadius >= DEFAULT_VISIBILITY_RADIUS) {
    return null;
  }
  if (!hasActionableVisibilityRadiusReduction(debugSnapshot.visibilityRadius)) {
    return null;
  }

  const weatherCap = Math.floor(
    debugSnapshot.weatherVisibilityRadiusCap ?? debugSnapshot.visibilityRadius
  );
  const segments = [
    `Visibility radius is currently reduced to ${debugSnapshot.visibilityRadius} from full ${DEFAULT_VISIBILITY_RADIUS}.`,
  ];
  if (weatherCap < DEFAULT_VISIBILITY_RADIUS) {
    segments.push(`Weather currently caps draw distance at ${weatherCap}.`);
  }
  if (debugSnapshot.visibilityRadius <= MIN_VISIBILITY_RADIUS) {
    segments.push(
      weatherCap < MIN_VISIBILITY_RADIUS
        ? `Weather is pushing draw distance below the minimum-quality radius ${MIN_VISIBILITY_RADIUS}.`
        : `The renderer is operating at the minimum visibility radius ${MIN_VISIBILITY_RADIUS}.`
    );
  } else if (debugSnapshot.visibilityRadius <= REDUCED_VISIBILITY_RADIUS) {
    segments.push(
      `The renderer remains below the reduced-quality radius ${REDUCED_VISIBILITY_RADIUS}.`
    );
  }
  return segments.join(' ');
}

function describeReducedQualityDuration(
  debugSnapshot: DebugSnapshot
): string | null {
  if (debugSnapshot.renderQualityLevel.trim().toLowerCase() === 'full') {
    return null;
  }

  const durationSec = debugSnapshot.reducedQualityDurationSec ?? 0;
  if (durationSec <= 0) {
    return null;
  }

  return `Reduced graphics quality has persisted for ${durationSec.toFixed(1)} seconds.`;
}

function limiterValueLabel(
  label: string,
  current: number | undefined,
  limit: number,
  limitLabel: string
): string {
  return `${label} ${Math.max(0, Math.floor(current ?? 0))} exceeded ${limitLabel} ${limit}`;
}

function limiterMsLabel(
  label: string,
  current: number | undefined,
  limit: number,
  limitLabel: string
): string {
  return `${label} ${(current ?? 0).toFixed(1)} ms exceeded ${limitLabel} ${limit.toFixed(1)} ms`;
}

function limiterByteLabel(
  label: string,
  current: number | undefined,
  limit: number,
  limitLabel: string
): string {
  return `${label} ${formatMegabytes(current ?? 0)} MB exceeded ${limitLabel} ${formatMegabytes(limit)} MB`;
}

function formatMegabytes(value: number): string {
  return (value / (1024 * 1024)).toFixed(1);
}

function selectRuntimePerformanceIssueSummary(
  reasons: string[],
  renderQualityLimiterDetails: string[]
): string {
  const hardCapDetail = renderQualityLimiterDetails.find(
    (detail) =>
      isActionableLimiterDetail(detail) && /hard cap|critical cap/.test(detail)
  );
  if (hardCapDetail) {
    return `${hardCapDetail}.`;
  }
  const firstLimiterDetail = renderQualityLimiterDetails.find(
    isActionableLimiterDetail
  );
  if (firstLimiterDetail) {
    return `${firstLimiterDetail}.`;
  }
  return reasons[0]!;
}

function hasActionableLimiterDetails(details: string[]): boolean {
  return details.some(isActionableLimiterDetail);
}

function isActionableLimiterDetail(detail: string): boolean {
  return /(exceeded|reduced|capped|minimized)/.test(detail);
}

function hasReportableRenderQualityReduction(
  debugSnapshot: DebugSnapshot,
  limiterDetails: string[]
): boolean {
  return (
    hasActionableVisibilityRadiusReduction(debugSnapshot.visibilityRadius) ||
    limiterDetails.some(
      (detail) =>
        !detail.startsWith('Visibility radius reduced to ') &&
        !detail.startsWith('Weather visibility capped draw distance at ') &&
        isActionableLimiterDetail(detail)
    )
  );
}

function hasActionableVisibilityRadiusReduction(
  visibilityRadius: number
): boolean {
  return (
    visibilityRadius <= MIN_VISIBILITY_RADIUS ||
    visibilityRadius <=
      REDUCED_VISIBILITY_RADIUS - ACTIONABLE_VISIBILITY_RADIUS_EPSILON
  );
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
